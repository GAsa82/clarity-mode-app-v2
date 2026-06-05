import { useState, useRef, useCallback, useEffect } from "react";
import {
  Upload,
  FileText,
  X,
  Search,
  Trash2,
  CheckCircle,
  AlertCircle,
  Loader2,
  AlertTriangle,
  Brain,
  RefreshCw,
} from "lucide-react";
import { uploadDiary, uploadFile, getDocuments, type UploadResult, type IndexedDocument } from "@/lib/clarity-ai-api";

interface UploadedFile {
  id: string;
  name: string;
  size: number;
  type: string;
  result?: UploadResult;
  error?: string;
  uploading?: boolean;
}

export default function AdminUpload() {
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [pipeline, setPipeline] = useState<"quick" | "full">("full");
  const [indexedDocs, setIndexedDocs] = useState<IndexedDocument[]>([]);
  const [loadingDocs, setLoadingDocs] = useState(true);
  const inputRef = useRef<HTMLInputElement>(null);

  const acceptedMime = "text/plain,application/pdf,.docx,image/jpeg,image/png,image/gif,image/webp";

  const loadIndexedDocs = useCallback(() => {
    setLoadingDocs(true);
    getDocuments()
      .then((res) => setIndexedDocs(res.documents))
      .catch(() => setIndexedDocs([]))
      .finally(() => setLoadingDocs(false));
  }, []);

  useEffect(() => {
    loadIndexedDocs();
  }, [loadIndexedDocs]);

  const addFiles = useCallback((fileList: FileList | File[]) => {
    const newFiles: UploadedFile[] = Array.from(fileList).map((f) => ({
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      name: f.name,
      size: f.size,
      type: f.type,
      uploading: true,
    }));
    setFiles((prev) => [...newFiles, ...prev]);

    Array.from(fileList).forEach((file, idx) => {
      const uploadFn = pipeline === "quick" ? uploadDiary : uploadFile;
      uploadFn(file)
        .then((result) => {
          setFiles((prev) =>
            prev.map((f) =>
              f.id === newFiles[idx].id
                ? { ...f, uploading: false, result: result as UploadResult }
                : f
            )
          );
          // Refresh indexed docs list after a Full Pipeline upload
          if (pipeline === "full") {
            setTimeout(loadIndexedDocs, 1500);
          }
        })
        .catch((err) => {
          setFiles((prev) =>
            prev.map((f) =>
              f.id === newFiles[idx].id
                ? { ...f, uploading: false, error: err.message || "Upload failed" }
                : f
            )
          );
        });
    });
  }, [pipeline, loadIndexedDocs]);

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files?.length) {
      addFiles(e.dataTransfer.files);
    }
  };

  const removeFile = (id: string) => {
    setFiles((prev) => prev.filter((f) => f.id !== id));
  };

  const filteredFiles = files.filter((f) =>
    f.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredIndexed = indexedDocs.filter((d) =>
    d.filename.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Upload Diary Entries</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Upload diary entries, notes, and documents for AI analysis
        </p>
      </div>

      {/* Pipeline Toggle */}
      <div className="flex items-center gap-3">
        <span className="text-sm text-muted-foreground">Upload mode:</span>
        <div className="flex gap-2 p-1 rounded-lg bg-secondary/50">
          <button
            onClick={() => setPipeline("quick")}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
              pipeline === "quick"
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Quick Upload
          </button>
          <button
            onClick={() => setPipeline("full")}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
              pipeline === "full"
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Full Pipeline (OCR + AI)
          </button>
        </div>
      </div>

      {/* Warning for Quick Upload */}
      {pipeline === "quick" && (
        <div className="flex items-start gap-3 p-4 rounded-xl bg-yellow-500/10 border border-yellow-500/30">
          <AlertTriangle className="w-5 h-5 text-yellow-400 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-yellow-400">Quick Upload — AI cannot read this file</p>
            <p className="text-xs text-yellow-400/80 mt-1">
              Quick Upload only saves the file to disk. It does NOT extract text, does NOT index it, and the AI Coach will have zero knowledge of its contents.
              <br />
              <span className="font-semibold">Use Full Pipeline (OCR + AI) to make files searchable by AI Coach.</span>
            </p>
          </div>
        </div>
      )}

      {/* Info for Full Pipeline */}
      {pipeline === "full" && (
        <div className="flex items-start gap-3 p-4 rounded-xl bg-primary/5 border border-primary/20">
          <Brain className="w-5 h-5 text-primary shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-primary">Full Pipeline — AI will learn from this file</p>
            <p className="text-xs text-muted-foreground mt-1">
              Text is extracted (OCR for images/PDFs), split into chunks, embedded, and stored in the AI knowledge base. AI Coach can then answer questions about it.
            </p>
          </div>
        </div>
      )}

      {/* Drop Zone */}
      <div
        className={`border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-all duration-200 ${
          dragOver
            ? "border-primary bg-primary/5"
            : "border-border hover:border-border/80"
        }`}
        onDrop={onDrop}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onClick={() => inputRef.current?.click()}
      >
        <input
          ref={inputRef}
          type="file"
          multiple
          accept={acceptedMime}
          onChange={(e) => e.target.files?.length && addFiles(e.target.files)}
          className="hidden"
        />
        <Upload className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
        <p className="font-medium">Drop files here or click to browse</p>
        <p className="text-sm text-muted-foreground mt-1">
          TXT, PDF, DOCX, JPG, PNG supported • Multiple files allowed
        </p>
      </div>

      {/* Search */}
      {(files.length > 0 || indexedDocs.length > 0) && (
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search files..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-secondary/50 border border-border focus:border-primary outline-none text-sm transition-colors"
          />
        </div>
      )}

      {/* This-session uploads */}
      {filteredFiles.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">
            This session — {filteredFiles.length} file{filteredFiles.length !== 1 ? "s" : ""}
          </p>
          {filteredFiles.map((file) => (
            <div
              key={file.id}
              className="flex items-center gap-3 p-3 rounded-xl bg-card border border-border"
            >
              <FileText className="w-5 h-5 text-muted-foreground shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{file.name}</p>
                <p className="text-xs text-muted-foreground">
                  {formatSize(file.size)}
                  {file.result && ` • ${file.result.message}`}
                  {file.error && (
                    <span className="text-red-400"> • {file.error}</span>
                  )}
                </p>
              </div>
              <div className="shrink-0">
                {file.uploading ? (
                  <Loader2 className="w-4 h-4 text-primary animate-spin" />
                ) : file.result?.success ? (
                  <CheckCircle className="w-4 h-4 text-green-400" />
                ) : file.error ? (
                  <AlertCircle className="w-4 h-4 text-red-400" />
                ) : (
                  <CheckCircle className="w-4 h-4 text-yellow-400" />
                )}
              </div>
              <button
                onClick={() => removeFile(file.id)}
                className="p-1.5 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors shrink-0"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* AI-Indexed Documents (persisted in ChromaDB) */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide flex items-center gap-1.5">
            <Brain className="w-3.5 h-3.5" />
            AI Knowledge Base — {loadingDocs ? "loading…" : `${indexedDocs.length} document${indexedDocs.length !== 1 ? "s" : ""}`}
          </p>
          <button
            onClick={loadIndexedDocs}
            className="p-1.5 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
            title="Refresh list"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loadingDocs ? "animate-spin" : ""}`} />
          </button>
        </div>

        {loadingDocs ? (
          <div className="flex items-center gap-2 text-xs text-muted-foreground p-3">
            <Loader2 className="w-4 h-4 animate-spin" />
            Loading indexed documents…
          </div>
        ) : filteredIndexed.length === 0 ? (
          <div className="p-4 rounded-xl border border-dashed border-border text-center text-xs text-muted-foreground">
            {indexedDocs.length === 0
              ? "No documents indexed yet. Upload using Full Pipeline to make files searchable by AI Coach."
              : `No documents match "${searchQuery}"`}
          </div>
        ) : (
          filteredIndexed.map((doc) => (
            <div
              key={doc.file_id}
              className="flex items-center gap-3 p-3 rounded-xl bg-card border border-border"
            >
              <Brain className="w-5 h-5 text-primary shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{doc.filename}</p>
                <p className="text-xs text-muted-foreground">
                  {doc.chunks_count} chunk{doc.chunks_count !== 1 ? "s" : ""} indexed • AI can search this
                </p>
              </div>
              <CheckCircle className="w-4 h-4 text-green-400 shrink-0" />
            </div>
          ))
        )}
      </div>
    </div>
  );
}
