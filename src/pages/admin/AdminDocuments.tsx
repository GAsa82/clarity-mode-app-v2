import { useState } from "react";
import {
  FileText,
  Search,
  Trash2,
  Download,
  Eye,
  Filter,
} from "lucide-react";

interface Document {
  id: string;
  name: string;
  type: string;
  size: number;
  uploadedAt: string;
  chunksCount: number;
}

const demoDocuments: Document[] = [
  { id: "1", name: "morning-reflections-jan-2025.txt", type: "txt", size: 4520, uploadedAt: "2025-01-15", chunksCount: 8 },
  { id: "2", name: "emotional-patterns-framework.pdf", type: "pdf", size: 128000, uploadedAt: "2025-01-20", chunksCount: 24 },
  { id: "3", name: "mindfulness-research-2024.pdf", type: "pdf", size: 256000, uploadedAt: "2025-02-01", chunksCount: 45 },
  { id: "4", name: "personal-growth-notes.docx", type: "docx", size: 18500, uploadedAt: "2025-02-05", chunksCount: 12 },
  { id: "5", name: "weekly-journal-week3.txt", type: "txt", size: 3200, uploadedAt: "2025-02-10", chunksCount: 5 },
  { id: "6", name: "anxiety-management-techniques.pdf", type: "pdf", size: 89000, uploadedAt: "2025-02-12", chunksCount: 18 },
];

export default function AdminDocuments() {
  const [documents] = useState<Document[]>(demoDocuments);
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");

  const filtered = documents.filter((d) => {
    const matchesSearch = d.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = typeFilter === "all" || d.type === typeFilter;
    return matchesSearch && matchesType;
  });

  const totalSize = documents.reduce((acc, d) => acc + d.size, 0);
  const totalChunks = documents.reduce((acc, d) => acc + d.chunksCount, 0);

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Documents</h1>
        <p className="text-muted-foreground text-sm mt-1">
          View and manage all uploaded documents in the system
        </p>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-4">
        <div className="p-4 rounded-xl bg-card border border-border">
          <p className="text-xs text-muted-foreground">Total Documents</p>
          <p className="text-2xl font-bold mt-1">{documents.length}</p>
        </div>
        <div className="p-4 rounded-xl bg-card border border-border">
          <p className="text-xs text-muted-foreground">Total Size</p>
          <p className="text-2xl font-bold mt-1">{formatSize(totalSize)}</p>
        </div>
        <div className="p-4 rounded-xl bg-card border border-border">
          <p className="text-xs text-muted-foreground">Total Chunks</p>
          <p className="text-2xl font-bold mt-1">{totalChunks}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search documents..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-secondary/50 border border-border focus:border-primary outline-none text-sm transition-colors"
          />
        </div>
        <div className="flex gap-2">
          {["all", "txt", "pdf", "docx"].map((type) => (
            <button
              key={type}
              onClick={() => setTypeFilter(type)}
              className={`px-3 py-2 rounded-xl text-xs font-medium transition-all ${
                typeFilter === type
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary/50 text-muted-foreground hover:text-foreground"
              }`}
            >
              {type === "all" ? "All" : type.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      {/* Documents Table */}
      <div className="rounded-xl border border-border overflow-hidden">
        <div className="grid grid-cols-12 gap-4 px-4 py-3 bg-secondary/30 text-xs font-medium text-muted-foreground">
          <div className="col-span-4">Name</div>
          <div className="col-span-1">Type</div>
          <div className="col-span-2">Size</div>
          <div className="col-span-2">Chunks</div>
          <div className="col-span-2">Uploaded</div>
          <div className="col-span-1"></div>
        </div>
        {filtered.map((doc) => (
          <div
            key={doc.id}
            className="grid grid-cols-12 gap-4 px-4 py-3 border-t border-border items-center hover:bg-secondary/20 transition-colors"
          >
            <div className="col-span-4 flex items-center gap-2 min-w-0">
              <FileText className="w-4 h-4 text-muted-foreground shrink-0" />
              <span className="text-sm truncate">{doc.name}</span>
            </div>
            <div className="col-span-1">
              <span className="px-2 py-0.5 rounded bg-secondary text-[10px] font-medium uppercase">
                {doc.type}
              </span>
            </div>
            <div className="col-span-2 text-xs text-muted-foreground">{formatSize(doc.size)}</div>
            <div className="col-span-2 text-xs text-muted-foreground">{doc.chunksCount} chunks</div>
            <div className="col-span-2 text-xs text-muted-foreground">{doc.uploadedAt}</div>
            <div className="col-span-1 flex items-center justify-end gap-1">
              <button className="p-1.5 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors">
                <Eye className="w-3.5 h-3.5" />
              </button>
              <button className="p-1.5 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors">
                <Download className="w-3.5 h-3.5" />
              </button>
              <button className="p-1.5 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors">
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}