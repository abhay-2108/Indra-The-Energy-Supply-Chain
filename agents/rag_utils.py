import os
import io
import json
import uuid
import datetime
import hashlib
import requests
import sqlite3
import numpy as np
import pdfplumber

# Retrieve project root database path
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DB_PATH = os.path.join(BASE_DIR, "data", "supply_chain.db")

def init_rag_tables():
    """Initializes the SQLite tables for storing document metadata and chunks."""
    with sqlite3.connect(DB_PATH) as conn:
        cursor = conn.cursor()
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS intel_documents (
                id TEXT PRIMARY KEY,
                filename TEXT NOT NULL,
                uploaded_at TEXT DEFAULT (datetime('now', 'localtime')),
                file_size INTEGER NOT NULL,
                raw_text TEXT
            );
        ''')
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS intel_chunks (
                id TEXT PRIMARY KEY,
                doc_id TEXT NOT NULL,
                chunk_index INTEGER NOT NULL,
                chunk_text TEXT NOT NULL,
                embedding TEXT,
                FOREIGN KEY (doc_id) REFERENCES intel_documents(id) ON DELETE CASCADE
            );
        ''')
        conn.commit()

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
    2. Secondary: Ollama api/embeddings
    3. Tertiary: Localized pseudo-embedding via Hash Kernel
    """
    gemini_api_key = os.getenv("GEMINI_API_KEY")
    if gemini_api_key:
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
    """Calculates cosine similarity between two float vectors."""
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
    Returns doc_id and count of chunks generated.
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
    
    # Save document record
    with sqlite3.connect(DB_PATH) as conn:
        cursor = conn.cursor()
        cursor.execute(
            "INSERT INTO intel_documents (id, filename, file_size, raw_text) VALUES (?, ?, ?, ?)",
            (doc_id, filename, file_size, raw_text)
        )
        
        # Ingest chunks
        for idx, chunk in enumerate(chunks):
            chunk_id = str(uuid.uuid4())
            embedding = get_embedding(chunk)
            embedding_json = json.dumps(embedding)
            
            cursor.execute(
                "INSERT INTO intel_chunks (id, doc_id, chunk_index, chunk_text, embedding) VALUES (?, ?, ?, ?, ?)",
                (chunk_id, doc_id, idx, chunk, embedding_json)
            )
        conn.commit()
        
    return doc_id, len(chunks)

def delete_document(doc_id):
    """Deletes a document and its associated chunks."""
    init_rag_tables()
    with sqlite3.connect(DB_PATH) as conn:
        cursor = conn.cursor()
        cursor.execute("DELETE FROM intel_documents WHERE id = ?", (doc_id,))
        cursor.execute("DELETE FROM intel_chunks WHERE doc_id = ?", (doc_id,))
        conn.commit()

def search_briefings_library(query, limit=5):
    """
    Queries the briefings vector store using semantic cosine similarity.
    Returns a list of matching chunks with similarity scores.
    """
    init_rag_tables()
    
    query_emb = get_embedding(query)
    
    with sqlite3.connect(DB_PATH) as conn:
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        cursor.execute("""
            SELECT c.chunk_text, c.chunk_index, d.filename, c.embedding
            FROM intel_chunks c
            JOIN intel_documents d ON c.doc_id = d.id
        """)
        rows = cursor.fetchall()
        
    results = []
    for row in rows:
        emb_str = row["embedding"]
        if not emb_str:
            continue
        try:
            emb = json.loads(emb_str)
            similarity = compute_cosine_similarity(query_emb, emb)
            results.append({
                "filename": row["filename"],
                "chunk_index": row["chunk_index"],
                "text": row["chunk_text"],
                "similarity": similarity
            })
        except Exception as e:
            print(f"[RAG Search Error] Deserialization failed: {e}")
            continue
            
    # Sort descending by similarity
    results.sort(key=lambda x: x["similarity"], reverse=True)
    return results[:limit]
