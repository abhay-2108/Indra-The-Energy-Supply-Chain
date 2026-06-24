"use client";

import { useState, useEffect } from "react";
import { getBriefings, uploadBriefing, deleteBriefing, searchBriefings } from "@/lib/api";
import { 
  FileText, 
  UploadCloud, 
  Trash2, 
  Search, 
  Loader2, 
  CheckCircle, 
  AlertCircle,
  Database,
  Calendar,
  Layers,
  Sparkles
} from "lucide-react";

export default function BriefingsPage() {
  const [documents, setDocuments] = useState<any[]>([]);
  const [loadingDocs, setLoadingDocs] = useState(true);
  const [uploadState, setUploadState] = useState<"idle" | "uploading" | "ingesting" | "success" | "error">("idle");
  const [uploadError, setUploadError] = useState("");
  const [ingestedChunks, setIngestedChunks] = useState(0);
  const [uploadedFilename, setUploadedFilename] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  // Load existing briefings and trigger initial search if documents exist
  useEffect(() => {
    async function loadDataAndSearch() {
      setLoadingDocs(true);
      try {
        const data = await getBriefings();
        setDocuments(data);
        if (data && data.length > 0) {
          setSearching(true);
          setHasSearched(true);
          const hits = await searchBriefings("Hormuz");
          setSearchResults(Array.isArray(hits) ? hits : []);
        }
      } catch (e) {
        console.error("Failed to load briefings or initial search", e);
      } finally {
        setLoadingDocs(false);
        setSearching(false);
      }
    }
    loadDataAndSearch();
  }, []);

  async function loadBriefingsData() {
    setLoadingDocs(true);
    try {
      const data = await getBriefings();
      setDocuments(data);
    } catch (e) {
      console.error("Failed to load briefings", e);
    } finally {
      setLoadingDocs(false);
    }
  }

  // Handle file upload
  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validation
    const extension = file.name.split(".").pop()?.toLowerCase();
    if (!["pdf", "txt", "md"].includes(extension || "")) {
      setUploadError("Only .pdf, .txt, or .md files are supported.");
      setUploadState("error");
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setUploadError("File size exceeds the 10MB limit.");
      setUploadState("error");
      return;
    }

    setUploadState("uploading");
    setUploadError("");
    setUploadedFilename(file.name);

    try {
      // Simulate/Trigger backend ingestion
      setUploadState("ingesting");
      const res = await uploadBriefing(file);
      
      if (res.status === "success") {
        setIngestedChunks(res.chunks_count);
        setUploadState("success");
        loadBriefingsData();
      } else {
        throw new Error("Backend failed to ingest the file.");
      }
    } catch (err: any) {
      setUploadError(err.message || "An unexpected error occurred during ingestion.");
      setUploadState("error");
    }
  }

  // Handle document deletion
  async function handleDelete(docId: string) {
    if (!confirm("Are you sure you want to delete this document? All associated vector chunks will be permanently removed.")) {
      return;
    }
    
    try {
      await deleteBriefing(docId);
      // Reload list
      setDocuments(prev => prev.filter(doc => doc.id !== docId));
    } catch (e) {
      console.error("Failed to delete document", e);
    }
  }

  // Handle Semantic Vector Search
  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    setSearching(true);
    setHasSearched(true);
    try {
      const hits = await searchBriefings(searchQuery);
      setSearchResults(Array.isArray(hits) ? hits : []);
    } catch (e) {
      console.error("Semantic search failed", e);
    } finally {
      setSearching(false);
    }
  }

  // Helper to format byte sizes
  function formatBytes(bytes: number) {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  }

  return (
    <div className="space-y-6">
      {/* Title */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-100 font-sans">Geopolitical Intelligence & Briefings Library</h1>
        <p className="text-slate-400 text-sm mt-1">Upload intelligence PDFs and briefs to feed the agentic RAG Vector Store</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Left Column: Upload & Ingestion Center (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          <div className="glass-panel rounded-3xl p-6 space-y-5">
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
              <UploadCloud size={16} className="text-emerald-400" />
              <span>Ingestion Panel</span>
            </h2>

            {/* Drag & Drop Input Zone */}
            <div className="relative border-2 border-dashed border-slate-800 hover:border-emerald-500/40 rounded-2xl p-6 transition-all duration-300 group cursor-pointer bg-slate-900/30 flex flex-col items-center justify-center text-center">
              <input
                type="file"
                accept=".pdf,.txt,.md"
                onChange={handleFileUpload}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                disabled={uploadState === "uploading" || uploadState === "ingesting"}
              />
              <div className="bg-slate-950/50 p-4 rounded-full border border-slate-800 text-slate-400 group-hover:scale-105 group-hover:border-emerald-500/20 group-hover:text-emerald-400 transition-all duration-300 mb-3">
                {uploadState === "uploading" || uploadState === "ingesting" ? (
                  <Loader2 className="animate-spin text-emerald-400" size={24} />
                ) : (
                  <UploadCloud size={24} />
                )}
              </div>
              <p className="text-xs font-bold text-slate-200">
                Click to browse or drag file here
              </p>
              <p className="text-[10px] text-slate-500 mt-1">
                Supports PDF, TXT, MD up to 10MB
              </p>
            </div>

            {/* Upload Ingestion Status States */}
            {uploadState !== "idle" && (
              <div className="p-4 rounded-2xl bg-slate-950/40 border border-slate-850 transition-all">
                {uploadState === "uploading" && (
                  <div className="flex items-center gap-3 text-xs text-slate-400">
                    <Loader2 size={16} className="animate-spin text-emerald-400 shrink-0" />
                    <div>
                      <p className="font-bold text-slate-350">Uploading {uploadedFilename}</p>
                      <p className="text-[10px] text-slate-500 mt-0.5">Streaming file content to secure servers...</p>
                    </div>
                  </div>
                )}
                {uploadState === "ingesting" && (
                  <div className="flex items-center gap-3 text-xs text-slate-400">
                    <Loader2 size={16} className="animate-spin text-indigo-400 shrink-0" />
                    <div>
                      <p className="font-bold text-slate-350">Ingesting text & building index</p>
                      <p className="text-[10px] text-slate-500 mt-0.5">Extracting semantic layout and mapping embeddings...</p>
                    </div>
                  </div>
                )}
                {uploadState === "success" && (
                  <div className="flex items-start gap-3 text-xs text-emerald-400">
                    <CheckCircle size={16} className="shrink-0 mt-0.5 text-emerald-400" />
                    <div>
                      <p className="font-bold">Ingested Successfully</p>
                      <p className="text-slate-400 mt-0.5 font-mono text-[10px]">
                        Parsed <span className="font-bold text-emerald-400">{uploadedFilename}</span> into{" "}
                        <span className="font-bold text-emerald-400">{ingestedChunks}</span> semantic vector chunks.
                      </p>
                      <button 
                        onClick={() => setUploadState("idle")} 
                        className="mt-2 text-[10px] text-emerald-500 hover:text-emerald-400 underline font-bold cursor-pointer"
                      >
                        Upload Another Document
                      </button>
                    </div>
                  </div>
                )}
                {uploadState === "error" && (
                  <div className="flex items-start gap-3 text-xs text-red-400">
                    <AlertCircle size={16} className="shrink-0 mt-0.5 text-red-400 animate-pulse" />
                    <div>
                      <p className="font-bold">Ingestion Failed</p>
                      <p className="text-slate-400 mt-0.5 text-[10px]">{uploadError}</p>
                      <button 
                        onClick={() => setUploadState("idle")} 
                        className="mt-2 text-[10px] text-red-500 hover:text-red-400 underline font-bold cursor-pointer"
                      >
                        Try Again
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Document Directory Card */}
          <div className="glass-panel rounded-3xl p-6 space-y-4">
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-400 flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Database size={16} className="text-indigo-400" />
                <span>Briefings Index</span>
              </span>
              <span className="text-[10px] font-mono text-slate-500 bg-slate-900 px-2 py-0.5 rounded-full border border-slate-800 font-bold">
                {documents.length} Docs
              </span>
            </h2>

            {loadingDocs ? (
              <div className="py-12 flex justify-center">
                <Loader2 className="animate-spin text-slate-500" size={20} />
              </div>
            ) : documents.length > 0 ? (
              <div className="divide-y divide-slate-850 max-h-[290px] overflow-y-auto pr-1">
                {documents.map((doc) => (
                  <div key={doc.id} className="py-3 flex items-center justify-between gap-4 group">
                    <div className="min-w-0 flex items-start gap-3">
                      <FileText size={18} className="text-emerald-500 mt-0.5 shrink-0" />
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-slate-200 truncate" title={doc.filename}>
                          {doc.filename}
                        </p>
                        <div className="flex items-center gap-3 text-[9px] text-slate-500 mt-0.5 font-medium">
                          <span className="flex items-center gap-1 font-mono">
                            <Layers size={10} />
                            {doc.chunks_count || doc.chunks || 0} Chunks
                          </span>
                          <span className="flex items-center gap-1 font-mono">
                            <Calendar size={10} />
                            {doc.uploaded_at?.split(" ")[0] || "Unknown"}
                          </span>
                          <span className="font-mono">
                            {formatBytes(doc.file_size || 0)}
                          </span>
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => handleDelete(doc.id)}
                      className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-500/5 border border-transparent hover:border-red-500/10 transition-all cursor-pointer shrink-0"
                      title="Delete document"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-12 text-center text-slate-500 border border-white/5 rounded-2xl bg-slate-950/20">
                <FileText size={20} className="mx-auto mb-2 text-slate-700" />
                <p className="text-xs font-semibold">No briefings uploaded yet.</p>
                <p className="text-[10px] text-slate-500 mt-1">Ingest folders or PDFs to start vector RAG.</p>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Semantic Vector Search Playground (7 cols) */}
        <div className="lg:col-span-7 glass-panel rounded-3xl p-6 space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
              <Sparkles size={16} className="text-purple-400" />
              <span>Vector Search Playground</span>
            </h2>
            <span className="text-[9px] font-bold text-slate-500 bg-slate-900 border border-slate-800 px-2 py-0.5 rounded-full uppercase tracking-wider font-mono">
              Cosine Similarity
            </span>
          </div>

          {/* Search Query Input */}
          <form onSubmit={handleSearch} className="flex gap-2">
            <div className="relative flex-1">
              <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                type="text"
                placeholder="Query vector store for policies, chokepoint escorts, refinery rules..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 rounded-2xl py-3 pl-11 pr-4 text-xs text-slate-300 focus:outline-none focus:border-purple-500/50 transition-colors"
              />
            </div>
            <button
              type="submit"
              disabled={searching || !searchQuery.trim()}
              className="bg-purple-650 hover:bg-purple-600 text-white rounded-2xl px-6 text-xs font-bold transition-all hover:shadow-[0_0_15px_rgba(147,51,234,0.2)] disabled:opacity-50 disabled:hover:shadow-none flex items-center gap-1.5 cursor-pointer shrink-0"
            >
              {searching ? (
                <Loader2 className="animate-spin" size={13} />
              ) : (
                <Sparkles size={13} />
              )}
              <span>Query RAG</span>
            </button>
          </form>

          {/* Search Match Listings */}
          <div className="space-y-4">
            {searching ? (
              <div className="py-24 text-center space-y-3">
                <Loader2 className="animate-spin text-purple-400 mx-auto" size={24} />
                <p className="text-xs text-slate-450 font-medium">Embedding query and computing cosine distances...</p>
              </div>
            ) : searchResults.length > 0 ? (
              <div className="space-y-4 max-h-[500px] overflow-y-auto pr-1">
                {searchResults.map((hit, idx) => {
                  const similarityPct = Math.round(hit.similarity * 100);
                  
                  // Score color
                  let scoreColor = "text-purple-400";
                  let barColor = "bg-purple-500";
                  if (hit.similarity > 0.8) {
                    scoreColor = "text-emerald-400";
                    barColor = "bg-emerald-500";
                  } else if (hit.similarity < 0.6) {
                    scoreColor = "text-amber-500";
                    barColor = "bg-amber-500";
                  }

                  return (
                    <div key={idx} className="p-4 rounded-2xl bg-slate-950/40 border border-slate-850 hover:border-slate-800 transition-colors space-y-3">
                      {/* Match Header */}
                      <div className="flex items-center justify-between gap-4 border-b border-white/5 pb-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <FileText size={14} className="text-slate-450 shrink-0" />
                          <span className="text-[10px] font-bold text-slate-400 truncate" title={hit.filename}>
                            {hit.filename}
                          </span>
                          <span className="text-[8px] font-mono text-slate-500 bg-slate-900 border border-slate-850 px-1.5 py-0.5 rounded font-bold shrink-0">
                            Chunk #{hit.chunk_index}
                          </span>
                        </div>

                        {/* Similarity score meter */}
                        <div className="flex items-center gap-2.5 shrink-0">
                          <span className={`text-[10px] font-mono font-black ${scoreColor}`}>
                            {similarityPct}% match
                          </span>
                          <div className="w-16 h-1.5 bg-slate-850 rounded-full overflow-hidden border border-slate-900">
                            <div 
                              className={`h-full ${barColor} rounded-full`}
                              style={{ width: `${similarityPct}%` }}
                            />
                          </div>
                        </div>
                      </div>

                      {/* Text chunk */}
                      <p className="text-[11px] text-slate-300 leading-relaxed font-sans italic bg-slate-900/10 p-2.5 rounded-xl border border-white/3">
                        "{hit.text}"
                      </p>
                    </div>
                  );
                })}
              </div>
            ) : hasSearched ? (
              <div className="py-24 text-center text-slate-555 border border-white/5 rounded-3xl bg-slate-950/20">
                <AlertCircle size={24} className="mx-auto mb-2 text-amber-500 animate-pulse" />
                <p className="text-xs font-semibold">No Semantic Matches Found</p>
                <p className="text-[10px] text-slate-450 mt-1 max-w-xs mx-auto">
                  We couldn't find any relevant text chunks in the vector library for "{searchQuery}". Try using key terms like "Hormuz", "drawdown", "Saudi", or "refinery".
                </p>
              </div>
            ) : (
              <div className="py-24 text-center text-slate-555 border border-white/5 rounded-3xl bg-slate-950/20">
                <Search size={24} className="mx-auto mb-2 text-slate-700" />
                <p className="text-xs font-semibold">Semantic Match Container</p>
                <p className="text-[10px] text-slate-500 mt-1 max-w-xs mx-auto">
                  Submit a query above to calculate dot products against text embeddings in the vector library.
                </p>
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
