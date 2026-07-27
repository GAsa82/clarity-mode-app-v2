import { useState, useEffect, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { useWebsite } from "@/contexts/WebsiteContext";
import { MediaUploadField } from "@/components/admin/MediaUploadField";
import { deleteMediaUrls } from "@/lib/media-upload";
import {
  Plus, Search, Pencil, Trash2, Upload, X, BookMarked,
  Eye, EyeOff, Globe, Lock, ChevronDown,
} from "lucide-react";

type Paper = {
  id: string;
  title: string;
  author: string | null;
  category: string;
  abstract: string | null;
  pages: number | null;
  price: number;
  cover_url: string | null;
  pdf_url: string | null;
  preview_url: string | null;
  tags: string[];
  visibility: string;
  status: string;
  view_count: number;
  download_count: number;
  created_at: string;
};

const CATEGORIES = [
  { value: "decision_making", label: "Decision-Making" },
  { value: "focus", label: "Focus & Deep Work" },
  { value: "mental_clarity", label: "Mental Clarity Protocols" },
  { value: "productivity", label: "Productivity Systems" },
  { value: "emotional_regulation", label: "Emotional Regulation" },
  { value: "personal_growth", label: "Personal Growth" },
  { value: "general", label: "General" },
];

const EMPTY: Omit<Paper, "id" | "view_count" | "download_count" | "created_at"> = {
  title: "",
  author: "",
  category: "general",
  abstract: "",
  pages: null,
  price: 0,
  cover_url: "",
  pdf_url: "",
  preview_url: "",
  tags: [],
  visibility: "premium",
  status: "draft",
};

export default function ResearchPapersAdmin() {
  const { current } = useWebsite();
  const [searchParams] = useSearchParams();
  const [papers, setPapers] = useState<Paper[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterCat, setFilterCat] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [showForm, setShowForm] = useState(searchParams.get("new") === "1");
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState({ ...EMPTY });
  const [saving, setSaving] = useState(false);
  const [tagInput, setTagInput] = useState("");
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  const load = async () => {
    if (!current) return;
    setLoading(true);
    const { data } = await supabase
      .from("research_papers")
      .select("*")
      .eq("website_id", current.id)
      .order("created_at", { ascending: false });
    setPapers(data ?? []);
    setLoading(false);
  };

  useEffect(() => { load(); }, [current?.id]);

  const filtered = papers.filter((p) => {
    const q = search.toLowerCase();
    const matchSearch = !q || p.title.toLowerCase().includes(q) || (p.author ?? "").toLowerCase().includes(q);
    const matchCat = filterCat === "all" || p.category === filterCat;
    const matchStatus = filterStatus === "all" || p.status === filterStatus;
    return matchSearch && matchCat && matchStatus;
  });

  const openNew = () => {
    setEditId(null);
    setForm({ ...EMPTY });
    setTagInput("");
    setShowForm(true);
  };

  const openEdit = (p: Paper) => {
    setEditId(p.id);
    setForm({
      title: p.title,
      author: p.author ?? "",
      category: p.category,
      abstract: p.abstract ?? "",
      pages: p.pages,
      price: p.price,
      cover_url: p.cover_url ?? "",
      pdf_url: p.pdf_url ?? "",
      preview_url: p.preview_url ?? "",
      tags: p.tags,
      visibility: p.visibility,
      status: p.status,
    });
    setTagInput("");
    setShowForm(true);
  };

  const save = async () => {
    if (!form.title.trim()) return;
    setSaving(true);
    const payload = {
      ...form,
      website_id: current?.id ?? null,
      author: form.author || null,
      abstract: form.abstract || null,
      cover_url: form.cover_url || null,
      pdf_url: form.pdf_url || null,
      preview_url: form.preview_url || null,
      price: Number(form.price) || 0,
      pages: form.pages ? Number(form.pages) : null,
    };
    if (editId) {
      await supabase.from("research_papers").update(payload).eq("id", editId);
    } else {
      await supabase.from("research_papers").insert(payload);
    }
    setSaving(false);
    setShowForm(false);
    load();
  };

  const remove = async (id: string) => {
    const paper = papers.find((p) => p.id === id);
    await supabase.from("research_papers").delete().eq("id", id);
    setDeleteConfirm(null);
    load();
    if (paper) deleteMediaUrls([paper.cover_url, paper.pdf_url, paper.preview_url]).catch(() => {});
  };

  const addTag = () => {
    const t = tagInput.trim().toLowerCase();
    if (t && !form.tags.includes(t)) {
      setForm((f) => ({ ...f, tags: [...f.tags, t] }));
    }
    setTagInput("");
  };

  const removeTag = (tag: string) =>
    setForm((f) => ({ ...f, tags: f.tags.filter((t) => t !== tag) }));

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
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="font-display text-2xl font-light mb-1">Research Papers</h1>
          <p className="text-muted-foreground text-sm">{papers.length} papers total</p>
        </div>
        <Button onClick={openNew} variant="hero" size="sm" className="gap-1.5 self-start sm:self-auto">
          <Plus className="w-4 h-4" /> New Paper
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            ref={searchRef}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by title or author…"
            className="w-full pl-9 pr-3 py-2 rounded-xl bg-card border border-border text-sm focus:outline-none focus:border-primary/50 transition-colors"
          />
        </div>
        <select
          value={filterCat}
          onChange={(e) => setFilterCat(e.target.value)}
          className="px-3 py-2 rounded-xl bg-card border border-border text-sm focus:outline-none focus:border-primary/50"
        >
          <option value="all">All categories</option>
          {CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
        </select>
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
                <th className="text-left px-4 py-3 text-xs uppercase tracking-widest text-muted-foreground font-medium">Title</th>
                <th className="text-left px-4 py-3 text-xs uppercase tracking-widest text-muted-foreground font-medium hidden md:table-cell">Category</th>
                <th className="text-left px-4 py-3 text-xs uppercase tracking-widest text-muted-foreground font-medium hidden sm:table-cell">Price</th>
                <th className="text-left px-4 py-3 text-xs uppercase tracking-widest text-muted-foreground font-medium">Status</th>
                <th className="text-left px-4 py-3 text-xs uppercase tracking-widest text-muted-foreground font-medium hidden lg:table-cell">Views</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} className="px-4 py-12 text-center text-muted-foreground">Loading…</td></tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center">
                    <BookMarked className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
                    <p className="text-muted-foreground text-sm">{search ? "No papers match your search." : "No research papers yet. Add the first one."}</p>
                  </td>
                </tr>
              ) : filtered.map((p) => (
                <tr key={p.id} className="border-b border-border/50 hover:bg-card transition-colors">
                  <td className="px-4 py-3">
                    <div>
                      <p className="font-medium text-sm truncate max-w-[200px]">{p.title}</p>
                      {p.author && <p className="text-xs text-muted-foreground">{p.author}</p>}
                    </div>
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell">
                    <span className="text-xs text-muted-foreground">
                      {CATEGORIES.find((c) => c.value === p.category)?.label ?? p.category}
                    </span>
                  </td>
                  <td className="px-4 py-3 hidden sm:table-cell">
                    <span className="text-xs">{p.price === 0 ? "Free" : `₹${(p.price / 100).toFixed(0)}`}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-medium capitalize ${statusBadge(p.status)}`}>
                      {p.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 hidden lg:table-cell text-xs text-muted-foreground">{p.view_count}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1 justify-end">
                      <button onClick={() => openEdit(p)} className="p-1.5 rounded-lg hover:bg-secondary transition-colors text-muted-foreground hover:text-foreground">
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => setDeleteConfirm(p.id)} className="p-1.5 rounded-lg hover:bg-destructive/10 transition-colors text-muted-foreground hover:text-destructive">
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
            <h3 className="font-display text-lg mb-2">Delete paper?</h3>
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
              <h2 className="font-display text-lg">{editId ? "Edit Paper" : "New Research Paper"}</h2>
              <button onClick={() => setShowForm(false)} className="p-1.5 rounded-lg hover:bg-secondary transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="px-6 py-5 space-y-4">
              {/* Title */}
              <div>
                <label className="block text-xs uppercase tracking-widest text-muted-foreground mb-1.5">Title *</label>
                <input
                  value={form.title}
                  onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                  placeholder="Enter paper title"
                  className="w-full px-3 py-2 rounded-xl bg-background border border-border text-sm focus:outline-none focus:border-primary/50 transition-colors"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs uppercase tracking-widest text-muted-foreground mb-1.5">Author</label>
                  <input
                    value={form.author ?? ""}
                    onChange={(e) => setForm((f) => ({ ...f, author: e.target.value }))}
                    placeholder="Author name"
                    className="w-full px-3 py-2 rounded-xl bg-background border border-border text-sm focus:outline-none focus:border-primary/50 transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-xs uppercase tracking-widest text-muted-foreground mb-1.5">Category</label>
                  <select
                    value={form.category}
                    onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
                    className="w-full px-3 py-2 rounded-xl bg-background border border-border text-sm focus:outline-none focus:border-primary/50"
                  >
                    {CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
                  </select>
                </div>
              </div>

              {/* Abstract */}
              <div>
                <label className="block text-xs uppercase tracking-widest text-muted-foreground mb-1.5">Abstract</label>
                <textarea
                  value={form.abstract ?? ""}
                  onChange={(e) => setForm((f) => ({ ...f, abstract: e.target.value }))}
                  placeholder="Brief description or abstract"
                  rows={3}
                  className="w-full px-3 py-2 rounded-xl bg-background border border-border text-sm focus:outline-none focus:border-primary/50 transition-colors resize-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs uppercase tracking-widest text-muted-foreground mb-1.5">Pages</label>
                  <input
                    type="number"
                    value={form.pages ?? ""}
                    onChange={(e) => setForm((f) => ({ ...f, pages: e.target.value ? Number(e.target.value) : null }))}
                    placeholder="0"
                    min="1"
                    className="w-full px-3 py-2 rounded-xl bg-background border border-border text-sm focus:outline-none focus:border-primary/50 transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-xs uppercase tracking-widest text-muted-foreground mb-1.5">Price (₹)</label>
                  <input
                    type="number"
                    value={form.price === 0 ? "" : form.price / 100}
                    onChange={(e) => setForm((f) => ({ ...f, price: e.target.value ? Math.round(Number(e.target.value) * 100) : 0 }))}
                    placeholder="0 = free"
                    min="0"
                    className="w-full px-3 py-2 rounded-xl bg-background border border-border text-sm focus:outline-none focus:border-primary/50 transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-xs uppercase tracking-widest text-muted-foreground mb-1.5">Visibility</label>
                  <select
                    value={form.visibility}
                    onChange={(e) => setForm((f) => ({ ...f, visibility: e.target.value }))}
                    className="w-full px-3 py-2 rounded-xl bg-background border border-border text-sm focus:outline-none focus:border-primary/50"
                  >
                    <option value="public">Public</option>
                    <option value="premium">Premium</option>
                    <option value="private">Private</option>
                  </select>
                </div>
              </div>

              {/* Media */}
              <MediaUploadField
                label="Cover Image"
                value={form.cover_url ?? ""}
                onChange={(url) => setForm((f) => ({ ...f, cover_url: url }))}
                folder="covers"
                accept="image/*"
                maxSizeMB={10}
              />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <MediaUploadField
                  label="Full PDF"
                  value={form.pdf_url ?? ""}
                  onChange={(url) => setForm((f) => ({ ...f, pdf_url: url }))}
                  folder="papers"
                  accept="application/pdf"
                />
                <MediaUploadField
                  label="Preview PDF"
                  value={form.preview_url ?? ""}
                  onChange={(url) => setForm((f) => ({ ...f, preview_url: url }))}
                  folder="previews"
                  accept="application/pdf"
                />
              </div>

              {/* Tags */}
              <div>
                <label className="block text-xs uppercase tracking-widest text-muted-foreground mb-1.5">Tags</label>
                <div className="flex gap-2 mb-2 flex-wrap">
                  {form.tags.map((t) => (
                    <span key={t} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary/10 text-primary text-xs">
                      {t}
                      <button onClick={() => removeTag(t)} className="hover:text-destructive transition-colors">
                        <X className="w-2.5 h-2.5" />
                      </button>
                    </span>
                  ))}
                </div>
                <div className="flex gap-2">
                  <input
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addTag(); } }}
                    placeholder="Add tag and press Enter"
                    className="flex-1 px-3 py-2 rounded-xl bg-background border border-border text-sm focus:outline-none focus:border-primary/50 transition-colors"
                  />
                  <Button variant="outline" size="sm" onClick={addTag}>Add</Button>
                </div>
              </div>

              {/* Status */}
              <div>
                <label className="block text-xs uppercase tracking-widest text-muted-foreground mb-1.5">Status</label>
                <div className="flex gap-2">
                  {["draft", "published", "archived"].map((s) => (
                    <button
                      key={s}
                      onClick={() => setForm((f) => ({ ...f, status: s }))}
                      className={`flex-1 py-2 rounded-xl text-xs font-medium capitalize transition-all border ${
                        form.status === s
                          ? "bg-primary/10 border-primary/30 text-primary"
                          : "bg-background border-border text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div className="flex gap-3 px-6 py-4 border-t border-border">
              <Button variant="outline" size="sm" className="flex-1" onClick={() => setShowForm(false)}>Cancel</Button>
              <Button variant="hero" size="sm" className="flex-1" onClick={save} disabled={saving || !form.title.trim()}>
                {saving ? "Saving…" : editId ? "Update Paper" : "Create Paper"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
