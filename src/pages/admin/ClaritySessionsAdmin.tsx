import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { useWebsite } from "@/contexts/WebsiteContext";
import { Plus, Search, Pencil, Trash2, X, Video, Sparkles } from "lucide-react";

const CATEGORIES = [
  "Trending",
  "Mental Clarity",
  "Confidence",
  "Dopamine Detox",
  "Emotional Intelligence",
  "Discipline",
  "Focus Protocols",
  "Sleep Reset",
];

type Session = {
  id: string;
  title: string;
  description: string | null;
  category: string;
  cover_url: string | null;
  video_url: string | null;
  audio_url: string | null;
  duration_sec: number | null;
  visibility: string;
  status: string;
  tags: string[];
  created_at: string;
};

const EMPTY = (): Omit<Session, "id" | "created_at"> => ({
  title: "",
  description: "",
  category: "Mental Clarity",
  cover_url: "",
  video_url: "",
  audio_url: "",
  duration_sec: null,
  visibility: "premium",
  status: "draft",
  tags: [],
});

export default function ClaritySessionsAdmin() {
  const { current } = useWebsite();
  const [items, setItems] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY());
  const [saving, setSaving] = useState(false);
  const [tagInput, setTagInput] = useState("");
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const load = async () => {
    if (!current) return;
    setLoading(true);
    const { data } = await supabase
      .from("content_items")
      .select("id, title, description, category, cover_url, video_url, audio_url, duration_sec, visibility, status, tags, created_at")
      .eq("type", "session")
      .eq("website_id", current.id)
      .order("created_at", { ascending: false });
    setItems(data ?? []);
    setLoading(false);
  };

  useEffect(() => { load(); }, [current?.id]);

  const filtered = items.filter((item) => {
    const q = search.toLowerCase();
    const matchSearch = !q || item.title.toLowerCase().includes(q) || (item.description ?? "").toLowerCase().includes(q);
    const matchStatus = filterStatus === "all" || item.status === filterStatus;
    return matchSearch && matchStatus;
  });

  const openNew = () => {
    setEditId(null);
    setForm(EMPTY());
    setTagInput("");
    setShowForm(true);
  };

  const openEdit = (item: Session) => {
    setEditId(item.id);
    setForm({
      title: item.title,
      description: item.description ?? "",
      category: item.category,
      cover_url: item.cover_url ?? "",
      video_url: item.video_url ?? "",
      audio_url: item.audio_url ?? "",
      duration_sec: item.duration_sec,
      visibility: item.visibility,
      status: item.status,
      tags: item.tags ?? [],
    });
    setTagInput("");
    setShowForm(true);
  };

  const save = async () => {
    if (!form.title.trim()) return;
    setSaving(true);
    const payload = {
      type: "session",
      website_id: current?.id ?? null,
      title: form.title.trim(),
      description: form.description || null,
      category: form.category,
      cover_url: form.cover_url || null,
      video_url: form.video_url || null,
      audio_url: form.audio_url || null,
      duration_sec: form.duration_sec,
      visibility: form.visibility,
      status: form.status,
      tags: form.tags,
      price: 0,
    };
    if (editId) {
      await supabase.from("content_items").update(payload).eq("id", editId);
    } else {
      await supabase.from("content_items").insert(payload);
    }
    setSaving(false);
    setShowForm(false);
    load();
  };

  const remove = async (id: string) => {
    await supabase.from("content_items").delete().eq("id", id);
    setDeleteConfirm(null);
    load();
  };

  const addTag = () => {
    const t = tagInput.trim().toLowerCase();
    if (t && !form.tags.includes(t)) setForm((f) => ({ ...f, tags: [...f.tags, t] }));
    setTagInput("");
  };

  const removeTag = (tag: string) => setForm((f) => ({ ...f, tags: f.tags.filter((t) => t !== tag) }));
  const F = (key: string, val: unknown) => setForm((f) => ({ ...f, [key]: val }));

  const durationLabel = (sec: number | null) => {
    if (!sec) return "—";
    const m = Math.round(sec / 60);
    return `${m} MIN`;
  };

  const statusBadge = (s: string) => {
    const map: Record<string, string> = {
      published: "bg-emerald-500/15 text-emerald-400",
      draft: "bg-secondary text-muted-foreground",
      archived: "bg-rose-500/15 text-rose-400",
    };
    return map[s] ?? "bg-secondary text-muted-foreground";
  };

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="font-display text-2xl font-light mb-1">Clarity Sessions</h1>
          <p className="text-muted-foreground text-sm">{items.length} sessions total — these appear in the Netflix-style browse section</p>
        </div>
        <Button onClick={openNew} variant="hero" size="sm" className="gap-1.5 self-start sm:self-auto">
          <Plus className="w-4 h-4" /> New Session
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search sessions…"
            className="w-full pl-9 pr-3 py-2 rounded-xl bg-card border border-border text-sm focus:outline-none focus:border-primary/50 transition-colors"
          />
        </div>
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="px-3 py-2 rounded-xl bg-card border border-border text-sm focus:outline-none focus:border-primary/50"
        >
          <option value="all">All statuses</option>
          <option value="published">Published</option>
          <option value="draft">Draft</option>
          <option value="archived">Archived</option>
        </select>
      </div>

      {/* Table */}
      <div className="rounded-2xl border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-card">
                <th className="text-left px-4 py-3 text-xs uppercase tracking-widest text-muted-foreground font-medium">Session</th>
                <th className="text-left px-4 py-3 text-xs uppercase tracking-widest text-muted-foreground font-medium hidden md:table-cell">Category</th>
                <th className="text-left px-4 py-3 text-xs uppercase tracking-widest text-muted-foreground font-medium hidden sm:table-cell">Duration</th>
                <th className="text-left px-4 py-3 text-xs uppercase tracking-widest text-muted-foreground font-medium hidden sm:table-cell">Access</th>
                <th className="text-left px-4 py-3 text-xs uppercase tracking-widest text-muted-foreground font-medium">Status</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} className="px-4 py-12 text-center text-muted-foreground">Loading…</td></tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center">
                    <Video className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
                    <p className="text-muted-foreground text-sm">
                      {search ? "No sessions match your search." : "No sessions yet. Add your first one."}
                    </p>
                  </td>
                </tr>
              ) : filtered.map((item) => (
                <tr key={item.id} className="border-b border-border/50 hover:bg-card transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      {item.cover_url ? (
                        <img src={item.cover_url} alt={item.title} className="w-10 h-7 object-cover rounded bg-secondary shrink-0" />
                      ) : (
                        <div className="w-10 h-7 rounded bg-primary/10 shrink-0 flex items-center justify-center">
                          <Video className="w-3.5 h-3.5 text-primary/50" />
                        </div>
                      )}
                      <div>
                        <p className="font-medium text-sm truncate max-w-[180px]">{item.title}</p>
                        {item.description && (
                          <p className="text-xs text-muted-foreground truncate max-w-[180px]">{item.description}</p>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell text-xs text-muted-foreground">{item.category}</td>
                  <td className="px-4 py-3 hidden sm:table-cell text-xs text-muted-foreground">{durationLabel(item.duration_sec)}</td>
                  <td className="px-4 py-3 hidden sm:table-cell">
                    {item.visibility === "premium" ? (
                      <span className="inline-flex items-center gap-1 text-[10px] text-yellow-400">
                        <Sparkles className="w-3 h-3" /> Premium
                      </span>
                    ) : (
                      <span className="text-[10px] text-muted-foreground">Free</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-medium capitalize ${statusBadge(item.status)}`}>
                      {item.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1 justify-end">
                      <button onClick={() => openEdit(item)} className="p-1.5 rounded-lg hover:bg-secondary transition-colors text-muted-foreground hover:text-foreground">
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => setDeleteConfirm(item.id)} className="p-1.5 rounded-lg hover:bg-destructive/10 transition-colors text-muted-foreground hover:text-destructive">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Delete confirm */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-card border border-border rounded-2xl p-6 w-full max-w-sm">
            <h3 className="font-display text-lg mb-2">Delete session?</h3>
            <p className="text-muted-foreground text-sm mb-6">This action cannot be undone.</p>
            <div className="flex gap-3">
              <Button variant="outline" size="sm" className="flex-1" onClick={() => setDeleteConfirm(null)}>Cancel</Button>
              <Button variant="destructive" size="sm" className="flex-1" onClick={() => remove(deleteConfirm)}>Delete</Button>
            </div>
          </div>
        </div>
      )}

      {/* Form modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-card border border-border rounded-2xl w-full max-w-2xl my-8">
            <div className="flex items-center justify-between px-6 py-4 border-b border-border">
              <h2 className="font-display text-lg">{editId ? "Edit Session" : "New Session"}</h2>
              <button onClick={() => setShowForm(false)} className="p-1.5 rounded-lg hover:bg-secondary transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="px-6 py-5 space-y-4">
              <div>
                <label className="block text-xs uppercase tracking-widest text-muted-foreground mb-1.5">Title *</label>
                <input value={form.title} onChange={(e) => F("title", e.target.value)} placeholder="Session title" className="w-full px-3 py-2 rounded-xl bg-background border border-border text-sm focus:outline-none focus:border-primary/50" />
              </div>

              <div>
                <label className="block text-xs uppercase tracking-widest text-muted-foreground mb-1.5">Subtitle</label>
                <input value={form.description ?? ""} onChange={(e) => F("description", e.target.value)} placeholder="Short tagline shown under the title" className="w-full px-3 py-2 rounded-xl bg-background border border-border text-sm focus:outline-none focus:border-primary/50" />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs uppercase tracking-widest text-muted-foreground mb-1.5">Category</label>
                  <select value={form.category} onChange={(e) => F("category", e.target.value)} className="w-full px-3 py-2 rounded-xl bg-background border border-border text-sm focus:outline-none focus:border-primary/50">
                    {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs uppercase tracking-widest text-muted-foreground mb-1.5">Duration (minutes)</label>
                  <input type="number" value={form.duration_sec ? Math.round(form.duration_sec / 60) : ""} onChange={(e) => F("duration_sec", e.target.value ? Math.round(Number(e.target.value) * 60) : null)} placeholder="e.g. 14" min="1" className="w-full px-3 py-2 rounded-xl bg-background border border-border text-sm focus:outline-none focus:border-primary/50" />
                </div>
              </div>

              <div>
                <label className="block text-xs uppercase tracking-widest text-muted-foreground mb-1.5">Video URL</label>
                <input value={form.video_url ?? ""} onChange={(e) => F("video_url", e.target.value)} placeholder="https://… (mp4, YouTube, Vimeo)" className="w-full px-3 py-2 rounded-xl bg-background border border-border text-sm focus:outline-none focus:border-primary/50" />
              </div>

              <div>
                <label className="block text-xs uppercase tracking-widest text-muted-foreground mb-1.5">Audio URL (if audio session)</label>
                <input value={form.audio_url ?? ""} onChange={(e) => F("audio_url", e.target.value)} placeholder="https://….mp3" className="w-full px-3 py-2 rounded-xl bg-background border border-border text-sm focus:outline-none focus:border-primary/50" />
              </div>

              <div>
                <label className="block text-xs uppercase tracking-widest text-muted-foreground mb-1.5">Cover / Thumbnail URL</label>
                <input value={form.cover_url ?? ""} onChange={(e) => F("cover_url", e.target.value)} placeholder="https://… (16:9 image)" className="w-full px-3 py-2 rounded-xl bg-background border border-border text-sm focus:outline-none focus:border-primary/50" />
              </div>

              {/* Access */}
              <div>
                <label className="block text-xs uppercase tracking-widest text-muted-foreground mb-1.5">Access</label>
                <div className="flex gap-2">
                  {[
                    { value: "premium", label: "Premium" },
                    { value: "public", label: "Free" },
                  ].map((opt) => (
                    <button
                      key={opt.value}
                      onClick={() => F("visibility", opt.value)}
                      className={`flex-1 py-2 rounded-xl text-xs font-medium transition-all border ${form.visibility === opt.value ? "bg-primary/10 border-primary/30 text-primary" : "bg-background border-border text-muted-foreground hover:text-foreground"}`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Tags */}
              <div>
                <label className="block text-xs uppercase tracking-widest text-muted-foreground mb-1.5">Tags</label>
                <div className="flex flex-wrap gap-2 mb-2">
                  {form.tags.map((t) => (
                    <span key={t} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary/10 text-primary text-xs">
                      {t}
                      <button onClick={() => removeTag(t)} className="hover:text-destructive"><X className="w-2.5 h-2.5" /></button>
                    </span>
                  ))}
                </div>
                <div className="flex gap-2">
                  <input value={tagInput} onChange={(e) => setTagInput(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addTag(); } }} placeholder="Add tag…" className="flex-1 px-3 py-2 rounded-xl bg-background border border-border text-sm focus:outline-none focus:border-primary/50" />
                  <Button variant="outline" size="sm" onClick={addTag}>Add</Button>
                </div>
              </div>

              {/* Status */}
              <div>
                <label className="block text-xs uppercase tracking-widest text-muted-foreground mb-1.5">Status</label>
                <div className="flex gap-2">
                  {["draft", "published", "archived"].map((s) => (
                    <button key={s} onClick={() => F("status", s)} className={`flex-1 py-2 rounded-xl text-xs font-medium capitalize transition-all border ${form.status === s ? "bg-primary/10 border-primary/30 text-primary" : "bg-background border-border text-muted-foreground hover:text-foreground"}`}>
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex gap-3 px-6 py-4 border-t border-border">
              <Button variant="outline" size="sm" className="flex-1" onClick={() => setShowForm(false)}>Cancel</Button>
              <Button variant="hero" size="sm" className="flex-1" onClick={save} disabled={saving || !form.title.trim()}>
                {saving ? "Saving…" : editId ? "Update Session" : "Create Session"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
