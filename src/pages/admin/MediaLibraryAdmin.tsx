import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { Search, Image, Headphones, Video, FileText, ExternalLink, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";

type MediaItem = {
  id: string;
  type: string;
  title: string;
  cover_url: string | null;
  file_url: string | null;
  audio_url: string | null;
  video_url: string | null;
  status: string;
  view_count: number;
  download_count: number;
  created_at: string;
};

const TYPE_ICON: Record<string, React.ElementType> = {
  audio: Headphones,
  video: Video,
  pdf: FileText,
  download: FileText,
  workbook: FileText,
  guide: FileText,
  framework: FileText,
  protocol: FileText,
  template: FileText,
};

export default function MediaLibraryAdmin() {
  const [searchParams] = useSearchParams();
  const [items, setItems] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState(searchParams.get("type") ?? "all");
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    let query = supabase
      .from("content_items")
      .select("id, type, title, cover_url, file_url, audio_url, video_url, status, view_count, download_count, created_at")
      .order("created_at", { ascending: false });
    if (filterType !== "all") query = query.eq("type", filterType);
    const { data } = await query;
    setItems((data ?? []) as MediaItem[]);
    setLoading(false);
  };

  useEffect(() => { load(); }, [filterType]);

  const filtered = items.filter((item) => {
    const q = search.toLowerCase();
    return !q || item.title.toLowerCase().includes(q);
  });

  const remove = async (id: string) => {
    await supabase.from("content_items").delete().eq("id", id);
    setDeleteConfirm(null);
    load();
  };

  const fileUrl = (item: MediaItem) =>
    item.audio_url ?? item.video_url ?? item.file_url ?? null;

  const fmt = (d: string) =>
    new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });

  const types = ["all", "audio", "video", "pdf", "download", "workbook", "guide", "framework", "protocol", "template"];

  return (
    <div>
      <div className="mb-6">
        <h1 className="font-display text-2xl font-light mb-1">Media Library</h1>
        <p className="text-muted-foreground text-sm">{items.length} items</p>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search items…" className="w-full pl-9 pr-3 py-2 rounded-xl bg-card border border-border text-sm focus:outline-none focus:border-primary/50" />
        </div>
        <select value={filterType} onChange={(e) => setFilterType(e.target.value)} className="px-3 py-2 rounded-xl bg-card border border-border text-sm focus:outline-none focus:border-primary/50">
          {types.map((t) => <option key={t} value={t}>{t === "all" ? "All types" : t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
        </select>
      </div>

      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {[...Array(10)].map((_, i) => <div key={i} className="aspect-square rounded-2xl bg-card border border-border animate-pulse" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <Image className="w-10 h-10 text-muted-foreground/30 mb-3" />
          <p className="text-muted-foreground text-sm">{search ? "No items match your search." : "No media items yet."}</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {filtered.map((item) => {
            const Icon = TYPE_ICON[item.type] ?? FileText;
            const url = fileUrl(item);
            return (
              <div key={item.id} className="group relative rounded-2xl bg-card border border-border overflow-hidden">
                {/* Thumbnail or icon */}
                <div className="aspect-square bg-secondary flex items-center justify-center relative">
                  {item.cover_url ? (
                    <img src={item.cover_url} alt={item.title} className="w-full h-full object-cover" />
                  ) : (
                    <Icon className="w-8 h-8 text-muted-foreground/40" strokeWidth={1.5} />
                  )}
                  {/* Overlay on hover */}
                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                    {url && (
                      <a href={url} target="_blank" rel="noopener noreferrer" className="p-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors">
                        <ExternalLink className="w-4 h-4 text-white" />
                      </a>
                    )}
                    <button onClick={() => setDeleteConfirm(item.id)} className="p-2 rounded-lg bg-white/10 hover:bg-destructive/80 transition-colors">
                      <Trash2 className="w-4 h-4 text-white" />
                    </button>
                  </div>
                  {/* Type badge */}
                  <span className="absolute top-2 left-2 text-[9px] uppercase tracking-wider bg-black/50 text-white px-1.5 py-0.5 rounded">
                    {item.type}
                  </span>
                  {/* Status badge */}
                  {item.status !== "published" && (
                    <span className="absolute top-2 right-2 text-[9px] uppercase tracking-wider bg-amber-500/80 text-white px-1.5 py-0.5 rounded">
                      {item.status}
                    </span>
                  )}
                </div>
                <div className="p-3">
                  <p className="text-xs font-medium truncate">{item.title}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">{fmt(item.created_at)}</p>
                  <div className="flex gap-3 mt-1">
                    <span className="text-[10px] text-muted-foreground">{item.view_count} views</span>
                    <span className="text-[10px] text-muted-foreground">{item.download_count} dl</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-card border border-border rounded-2xl p-6 w-full max-w-sm">
            <h3 className="font-display text-lg mb-2">Delete item?</h3>
            <p className="text-muted-foreground text-sm mb-6">This action cannot be undone.</p>
            <div className="flex gap-3">
              <Button variant="outline" size="sm" className="flex-1" onClick={() => setDeleteConfirm(null)}>Cancel</Button>
              <Button variant="destructive" size="sm" className="flex-1" onClick={() => remove(deleteConfirm)}>Delete</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
