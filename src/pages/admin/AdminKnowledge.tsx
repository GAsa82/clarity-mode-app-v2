import { useState, useRef, useCallback } from "react";
import {
  Database,
  Upload,
  FileText,
  BookOpen,
  GraduationCap,
  Lightbulb,
  Search,
  Trash2,
  CheckCircle,
  Loader2,
  Clock,
  Tag,
} from "lucide-react";
import { uploadFile } from "@/lib/clarity-ai-api";

type KnowledgeCategory = "diary" | "notes" | "books" | "research" | "frameworks" | "lessons";

interface KnowledgeFile {
  id: string;
  name: string;
  category: KnowledgeCategory;
  uploadedAt: string;
  status: "processing" | "indexed" | "failed";
  embeddingsReady: boolean;
  size: number;
}

const categoryConfig: Record<KnowledgeCategory, { label: string; icon: React.ElementType; color: string }> = {
  diary: { label: "Diary Entries", icon: BookOpen, color: "text-blue-400 bg-blue-500/10" },
  notes: { label: "Mental Clarity Notes", icon: Lightbulb, color: "text-yellow-400 bg-yellow-500/10" },
  books: { label: "Books", icon: BookOpen, color: "text-emerald-400 bg-emerald-500/10" },
  research: { label: "Research Papers", icon: GraduationCap, color: "text-purple-400 bg-purple-500/10" },
  frameworks: { label: "Frameworks", icon: Database, color: "text-orange-400 bg-orange-500/10" },
  lessons: { label: "Personal Lessons", icon: Lightbulb, color: "text-cyan-400 bg-cyan-500/10" },
};

export default function AdminKnowledge() {
  const [files, setFiles] = useState<KnowledgeFile[]>([
    // Demo data
    {
      id: "1",
      name: "morning-reflections-jan.txt",
      category: "diary",
      uploadedAt: "2025-01-15",
      status: "indexed",
      embeddingsReady: true,
      size: 4520,
    },
    {
      id: "2",
      name: "emotional-patterns-framework.pdf",
      category: "frameworks",
      uploadedAt: "2025-01-20",
      status: "indexed",
      embeddingsReady: true,
      size: 128000,
    },
    {
      id: "3",
      name: "mindfulness-research-2024.pdf",
      category: "research",
      uploadedAt: "2025-02-01",
      status: "processing",
      embeddingsReady: false,
      size: 256000,
    },
  ]);
  const [selectedCategory, setSelectedCategory] = useState<KnowledgeCategory>("diary");
  const [dragOver, setDragOver] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const addFiles = useCallback((fileList: FileList) => {
    const newFiles: KnowledgeFile[] = Array.from(fileList).map((f) => ({
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      name: f.name,
      category: selectedCategory,
      uploadedAt: new Date().toISOString().split("T")[0],
      status: "processing" as const,
      embeddingsReady: false,
      size: f.size,
    }));
    setFiles((prev) => [...newFiles, ...prev]);

    Array.from(fileList).forEach((file, idx) => {
      uploadFile(file)
        .then(() => {
          setFiles((prev) =>
            prev.map((f) =>
              f.id === newFiles[idx].id
                ? { ...f, status: "indexed", embeddingsReady: true }
                : f
            )
          );
        })
        .catch(() => {
          setFiles((prev) =>
            prev.map((f) =>
              f.id === newFiles[idx].id ? { ...f, status: "failed" } : f
            )
          );
        });
    });
  }, [selectedCategory]);

  const removeFile = (id: string) => {
    setFiles((prev) => prev.filter((f) => f.id !== id));
  };

  const filteredFiles = files.filter((f) =>
    f.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Knowledge Base</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Manage your AI knowledge sources — diary entries, notes, books, research, and frameworks
        </p>
      </div>

      {/* Category Selector */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
        {(Object.entries(categoryConfig) as [KnowledgeCategory, typeof categoryConfig[KnowledgeCategory]][]).map(
          ([key, config]) => {
            const Icon = config.icon;
            const count = files.filter((f) => f.category === key).length;
            return (
              <button
                key={key}
                onClick={() => setSelectedCategory(key)}
                className={`p-3 rounded-xl border text-left transition-all ${
                  selectedCategory === key
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-border/80"
                }`}
              >
                <div className={`p-1.5 rounded-lg w-fit mb-2 ${config.color}`}>
                  <Icon className="w-3.5 h-3.5" />
                </div>
                <p className="text-xs font-medium">{config.label}</p>
                <p className="text-[10px] text-muted-foreground">{count} files</p>
              </button>
            );
          }
        )}
      </div>

      {/* Upload Zone */}
      <div
        className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all ${
          dragOver ? "border-primary bg-primary/5" : "border-border hover:border-border/80"
        }`}
        onDrop={(e) => { e.preventDefault(); setDragOver(false); e.dataTransfer.files.length && addFiles(e.dataTransfer.files); }}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onClick={() => inputRef.current?.click()}
      >
        <input
          ref={inputRef}
          type="file"
          multiple
          onChange={(e) => e.target.files?.length && addFiles(e.target.files)}
          className="hidden"
        />
        <Upload className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
        <p className="font-medium text-sm">Drop files for "{categoryConfig[selectedCategory].label}"</p>
        <p className="text-xs text-muted-foreground mt-1">TXT, PDF, DOCX supported</p>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search knowledge base..."
          className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-secondary/50 border border-border focus:border-primary outline-none text-sm transition-colors"
        />
      </div>

      {/* File Table */}
      <div className="rounded-xl border border-border overflow-hidden">
        <div className="grid grid-cols-12 gap-4 px-4 py-3 bg-secondary/30 text-xs font-medium text-muted-foreground">
          <div className="col-span-5">File Name</div>
          <div className="col-span-2">Category</div>
          <div className="col-span-2">Date</div>
          <div className="col-span-1">Status</div>
          <div className="col-span-1">Embeddings</div>
          <div className="col-span-1"></div>
        </div>
        {filteredFiles.map((file) => {
          const cat = categoryConfig[file.category];
          return (
            <div
              key={file.id}
              className="grid grid-cols-12 gap-4 px-4 py-3 border-t border-border items-center hover:bg-secondary/20 transition-colors"
            >
              <div className="col-span-5 flex items-center gap-2 min-w-0">
                <FileText className="w-4 h-4 text-muted-foreground shrink-0" />
                <span className="text-sm truncate">{file.name}</span>
              </div>
              <div className="col-span-2">
                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium ${cat.color}`}>
                  <Tag className="w-2.5 h-2.5" />
                  {cat.label}
                </span>
              </div>
              <div className="col-span-2 text-xs text-muted-foreground">{file.uploadedAt}</div>
              <div className="col-span-1">
                {file.status === "indexed" && (
                  <span className="inline-flex items-center gap-1 text-[10px] text-green-400">
                    <CheckCircle className="w-3 h-3" /> Indexed
                  </span>
                )}
                {file.status === "processing" && (
                  <span className="inline-flex items-center gap-1 text-[10px] text-yellow-400">
                    <Loader2 className="w-3 h-3 animate-spin" /> Processing
                  </span>
                )}
                {file.status === "failed" && (
                  <span className="text-[10px] text-red-400">Failed</span>
                )}
              </div>
              <div className="col-span-1">
                {file.embeddingsReady ? (
                  <span className="text-[10px] text-green-400">✓ Ready</span>
                ) : (
                  <span className="text-[10px] text-muted-foreground">Pending</span>
                )}
              </div>
              <div className="col-span-1 text-right">
                <button
                  onClick={() => removeFile(file.id)}
                  className="p-1 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}