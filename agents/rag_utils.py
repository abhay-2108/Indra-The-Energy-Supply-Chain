import os
import io
import json
import uuid
import datetime
import hashlib
import requests
import numpy as np
import pdfplumber
import lancedb
from dotenv import load_dotenv
load_dotenv()

# Retrieve project root database path
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DB_PATH = os.path.join(BASE_DIR, "data", "supply_chain.db")

# Setup LanceDB directory and connection
LANCE_DB_DIR = os.path.join(BASE_DIR, "data", "lancedb")
os.makedirs(LANCE_DB_DIR, exist_ok=True)
lance_conn = lancedb.connect(LANCE_DB_DIR)

def init_rag_tables():
    """Initializes the PostgreSQL/SQLite tables for storing document metadata."""
    from agents.config import execute_db, IS_POSTGRES
    if IS_POSTGRES:
        execute_db('''
            CREATE TABLE IF NOT EXISTS intel_documents (
                id TEXT PRIMARY KEY,
                filename TEXT NOT NULL,
                uploaded_at TEXT DEFAULT CURRENT_TIMESTAMP,
                file_size INTEGER NOT NULL,
                raw_text TEXT
            );
        ''')
    else:
        execute_db('''
            CREATE TABLE IF NOT EXISTS intel_documents (
                id TEXT PRIMARY KEY,
                filename TEXT NOT NULL,
                uploaded_at TEXT DEFAULT (datetime('now', 'localtime')),
                file_size INTEGER NOT NULL,
                raw_text TEXT
            );
        ''')

def extract_text_from_pdf(file_bytes):
    """Extracts clean text from a PDF file using pdfplumber."""
    text_content = []
    try:
        with pdfplumber.open(io.BytesIO(file_bytes)) as pdf:
            for page in pdf.pages:
                text = page.extract_text()
                if text:
                    text_content.append(text)
    except Exception as e:
        print(f"[PDF Extractor Error] {e}")
    return "\n".join(text_content)

def chunk_text(text, chunk_size=1000, overlap=200):
    """Splits a body of text into overlapping segments."""
    chunks = []
    if not text:
        return chunks
    
    # Clean whitespace
    text = " ".join(text.split())
    
    start = 0
    while start < len(text):
        end = start + chunk_size
        chunks.append(text[start:end])
        if end >= len(text):
            break
        start += chunk_size - overlap
    return chunks

def get_embedding(text):
    """
    Computes text embeddings.
    1. Primary: Gemini API embeddings (models/text-embedding-004)
    2. Secondary: NVIDIA NIM embeddings (nvidia/embeddings-nv-embed-qa-4)
    3. Tertiary: Ollama api/embeddings
    4. Quaternary: Localized pseudo-embedding via Hash Kernel
    """
    from agents.config import is_gemini_key_valid
    gemini_api_key = os.getenv("GEMINI_API_KEY")
    if gemini_api_key and is_gemini_key_valid(gemini_api_key):
        try:
            url = f"https://generativelanguage.googleapis.com/v1beta/models/text-embedding-004:embedContent?key={gemini_api_key}"
            headers = {"Content-Type": "application/json"}
            payload = {
                "model": "models/text-embedding-004",
                "content": {
                    "parts": [{"text": text}]
                }
            }
            res = requests.post(url, json=payload, headers=headers, timeout=8)
            if res.status_code == 200:
                return res.json()["embedding"]["values"]
            else:
                print(f"[RAG Utils] Gemini Embeddings returned {res.status_code}: {res.text}")
        except Exception as e:
            print(f"[RAG Utils] Gemini Embeddings Exception: {e}")

    nvidia_api_key = os.getenv("NVIDIA_API_KEY")
    if nvidia_api_key:
        try:
            url = "https://integrate.api.nvidia.com/v1/embeddings"
            headers = {
                "Content-Type": "application/json",
                "Authorization": f"Bearer {nvidia_api_key}"
            }
            payload = {
                "input": [text],
                "model": "nvidia/embeddings-nv-embed-qa-4",
                "encoding_format": "float"
            }
            res = requests.post(url, json=payload, headers=headers, timeout=8)
            if res.status_code == 200:
                return res.json()["data"][0]["embedding"]
            else:
                print(f"[RAG Utils] NVIDIA Embeddings returned {res.status_code}: {res.text}")
        except Exception as e:
            print(f"[RAG Utils] NVIDIA Embeddings Exception: {e}")

    # Fallback to Ollama
    ollama_url = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")
    try:
        url = f"{ollama_url}/api/embeddings"
        payload = {
            "model": "qwen2.5:7b",
            "prompt": text
        }
        res = requests.post(url, json=payload, timeout=8)
        if res.status_code == 200:
            return res.json()["embedding"]
    except Exception as e:
        print(f"[RAG Utils] Ollama Embeddings Exception: {e}")

    # Localized Pseudo-Embedding (stable fallback)
    vec = np.zeros(768)
    words = text.lower().split()
    if not words:
        return vec.tolist()
    for word in words:
        # Reproducible MD5 hash index
        h = int(hashlib.md5(word.encode('utf-8')).hexdigest(), 16)
        idx = h % 768
        vec[idx] += 1.0
    # Normalize L2
    norm = np.linalg.norm(vec)
    if norm > 0:
        vec = vec / norm
    return vec.tolist()

def compute_cosine_similarity(vec1, vec2):
    """Calculates cosine similarity between two float vectors (kept for backward compatibility)."""
    v1 = np.array(vec1)
    v2 = np.array(vec2)
    norm1 = np.linalg.norm(v1)
    norm2 = np.linalg.norm(v2)
    if norm1 == 0 or norm2 == 0:
        return 0.0
    return float(np.dot(v1, v2) / (norm1 * norm2))

def add_document(filename, file_bytes):
    """
    Parses, chunks, embeds, and saves a document.
    Saves metadata to relational DB and chunks + embeddings to LanceDB.
    """
    init_rag_tables()
    
    # Extract text content
    if filename.lower().endswith(".pdf"):
        raw_text = extract_text_from_pdf(file_bytes)
    else:
        raw_text = file_bytes.decode("utf-8", errors="ignore")
    
    if not raw_text.strip():
        raise ValueError("No text content could be extracted from this file.")
        
    doc_id = str(uuid.uuid4())
    file_size = len(file_bytes)
    
    # Chunk text
    chunks = chunk_text(raw_text)
    
    # Save document record relational metadata
    from agents.config import execute_db
    execute_db(
        "INSERT INTO intel_documents (id, filename, file_size, raw_text) VALUES (?, ?, ?, ?)",
        (doc_id, filename, file_size, raw_text)
    )
    
    # Ingest chunks into LanceDB
    lance_data = []
    for idx, chunk in enumerate(chunks):
        embedding = get_embedding(chunk)
        lance_data.append({
            "doc_id": doc_id,
            "chunk_index": idx,
            "text": chunk,
            "vector": embedding
        })
        
    if lance_data:
        if "intel_chunks" in lance_conn.table_names():
            table = lance_conn.open_table("intel_chunks")
            table.add(lance_data)
        else:
            lance_conn.create_table("intel_chunks", data=lance_data)
            
    return doc_id, len(chunks)

def delete_document(doc_id):
    """Deletes a document and its associated chunks."""
    init_rag_tables()
    from agents.config import execute_db
    execute_db("DELETE FROM intel_documents WHERE id = ?", (doc_id,))
    
    # Delete chunks from LanceDB
    if "intel_chunks" in lance_conn.table_names():
        table = lance_conn.open_table("intel_chunks")
        table.delete(f"doc_id = '{doc_id}'")

def search_briefings_library(query, limit=5):
    """
    Queries the briefings vector store using embedded LanceDB cosine similarity.
    Returns a list of matching chunks with similarity scores.
    """
    init_rag_tables()
    
    if "intel_chunks" not in lance_conn.table_names():
        return []
        
    table = lance_conn.open_table("intel_chunks")
    query_emb = get_embedding(query)
    
    # Search in LanceDB (returns cosine distance by default)
    search_res = table.search(query_emb).metric("cosine").limit(limit).to_list()
    
    # Fetch filenames from SQL database for mapping doc_ids to filenames
    from agents.config import query_db
    doc_rows = query_db("SELECT id, filename FROM intel_documents")
    doc_map = {row["id"]: row["filename"] for row in doc_rows}
    
    results = []
    for hit in search_res:
        doc_id = hit.get("doc_id")
        filename = doc_map.get(doc_id, "Unknown Document")
        # distance d ranges from 0.0 (identical) to 2.0 (opposite). Cosine similarity = 1.0 - distance.
        distance = hit.get("_distance", 1.0)
        similarity = max(0.0, min(1.0, 1.0 - distance))
        results.append({
            "filename": filename,
            "chunk_index": hit.get("chunk_index", 0),
            "text": hit.get("text", ""),
            "similarity": similarity
        })
        
    return results

def get_document_chunk_count(doc_id):
    """Returns the count of chunks for a document in LanceDB."""
    if "intel_chunks" not in lance_conn.table_names():
        return 0
    try:
        table = lance_conn.open_table("intel_chunks")
        res = table.search().where(f"doc_id = '{doc_id}'").to_list()
        return len(res)
    except Exception as e:
        print(f"[RAG Utils] Error counting chunks for {doc_id}: {e}")
        return 0

