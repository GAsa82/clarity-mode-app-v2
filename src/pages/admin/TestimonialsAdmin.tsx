import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Plus, Search, Pencil, Trash2, X, MessageSquare, Star, Copy, Eye, EyeOff } from "lucide-react";

type Testimonial = {
  id: string;
  name: string;
  role: string | null;
  quote: string;
  rating: number | null;
  avatar_url: string | null;
  source: string | null;
  published: boolean;
  sort: number | null;
  created_at: string;
};

const EMPTY = (): Omit<Testimonial, "id" | "created_at"> => ({
  name: "",
  role: "",
  quote: "",
  rating: 5,
  avatar_url: "",
  source: "",
  published: false,
  sort: 0,
});

export default function TestimonialsAdmin() {
  const [items, setItems] = useState<Testimonial[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "published" | "draft">("all");
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY());
  const [saving, setSaving] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("testimonials")
      .select("*")
      .order("sort", { ascending: true })
      .order("created_at", { ascending: false });
    setItems(data ?? []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const filtered = items.filter((item) => {
    const q = search.toLowerCase();
    const matchSearch = !q || item.name.toLowerCase().includes(q) || item.quote.toLowerCase().includes(q);
    const matchFilter =
      filter === "all" || (filter === "published" && item.published) || (filter === "draft" && !item.published);
    return matchSearch && matchFilter;
  });

  const openNew = () => {
    setEditId(null);
    setForm({ ...EMPTY(), sort: items.length });
    setShowForm(true);
    setError(null);
  };

  const openEdit = (item: Testimonial) => {
    setEditId(item.id);
    setForm({
      name: item.name,
      role: item.role ?? "",
      quote: item.quote,
      rating: item.rating ?? 5,
      avatar_url: item.avatar_url ?? "",
      source: item.source ?? "",
      published: item.published,
      sort: item.sort ?? 0,
    });
    setShowForm(true);
    setError(null);
  };

  const duplicate = async (item: Testimonial) => {
    setError(null);
    const { error } = await supabase.from("testimonials").insert({
      name: `${item.name} (copy)`,
      role: item.role,
      quote: item.quote,
      rating: item.rating,
      avatar_url: item.avatar_url,
      source: item.source,
      published: false,
      sort: (item.sort ?? 0) + 1,
    });
    if (error) { setError(error.message); return; }
    load();
  };

  const save = async () => {
    if (!form.name.trim() || !form.quote.trim()) return;
    setSaving(true);
    setError(null);
    const payload = {
      name: form.name.trim(),
      role: form.role || null,
      quote: form.quote.trim(),
      rating: form.rating,
      avatar_url: form.avatar_url || null,
      source: form.source || null,
      published: form.published,
      sort: Number(form.sort) || 0,
    };
    const { error } = editId
      ? await supabase.from("testimonials").update(payload).eq("id", editId)
      : await supabase.from("testimonials").insert(payload);
    setSaving(false);
    if (error) { setError(error.message); return; }
    setShowForm(false);
    load();
  };

  const togglePublish = async (item: Testimonial) => {
    setError(null);
    const { error } = await supabase.from("testimonials").update({ published: !item.published }).eq("id", item.id);
    if (error) { setError(error.message); return; }
    load();
  };

  const remove = async (id: string) => {
    const { error } = await supabase.from("testimonials").delete().eq("id", id);
    setDeleteConfirm(null);
    if (error) { setError(error.message); return; }
    load();
  };

  const F = (key: string, val: unknown) => setForm((f) => ({ ...f, [key]: val }));

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="font-display text-2xl font-light mb-1">Testimonials</h1>
          <p className="text-muted-foreground text-sm">
            {items.length} total · only <span className="text-primary">real, published</span> testimonials appear on the site
          </p>
        </div>
        <Button onClick={openNew} variant="hero" size="sm" className="gap-1.5 self-start sm:self-auto">
          <Plus className="w-4 h-4" /> New Testimonial
        </Button>
      </div>

      {error && (
        <div className="mb-4 px-4 py-3 rounded-xl bg-destructive/10 border border-destructive/30 text-destructive text-sm">
          {error}
        </div>
      )}

      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search testimonials…"
            className="w-full pl-9 pr-3 py-2 rounded-xl bg-card border border-border text-sm focus:outline-none focus:border-primary/50 transition-colors"
          />
        </div>
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value as typeof filter)}
          className="px-3 py-2 rounded-xl bg-card border border-border text-sm focus:outline-none focus:border-primary/50"
        >
          <option value="all">All</option>
          <option value="published">Published</option>
          <option value="draft">Draft</option>
        </select>
      </div>

      {loading ? (
        <div className="py-12 text-center text-muted-foreground">Loading…</div>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border py-16 text-center">
          <MessageSquare className="w-8 h-8 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-muted-foreground text-sm">
            {search ? "No testimonials match your search." : "No testimonials yet. Add the first real one."}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filtered.map((item) => (
            <div key={item.id} className="rounded-2xl border border-border bg-card p-5 flex flex-col gap-3">
              <div className="flex items-start gap-3">
                {item.avatar_url ? (
                  <img src={item.avatar_url} alt={item.name} className="w-11 h-11 rounded-full object-cover bg-secondary shrink-0" />
                ) : (
                  <div className="w-11 h-11 rounded-full bg-primary/10 shrink-0 flex items-center justify-center text-primary font-medium">
                    {item.name[0]?.toUpperCase() ?? "?"}
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-sm truncate">{item.name}</p>
                  {item.role && <p className="text-xs text-muted-foreground truncate">{item.role}</p>}
                  {item.rating != null && (
                    <div className="flex gap-0.5 mt-1">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star key={i} className={`w-3 h-3 ${i < (item.rating ?? 0) ? "text-yellow-400 fill-yellow-400" : "text-muted-foreground/30"}`} />
                      ))}
                    </div>
                  )}
                </div>
                <span className={`shrink-0 inline-flex px-2 py-0.5 rounded-full text-[10px] font-medium ${item.published ? "bg-emerald-500/15 text-emerald-400" : "bg-secondary text-muted-foreground"}`}>
                  {item.published ? "Published" : "Draft"}
                </span>
              </div>

              <p className="text-sm text-muted-foreground leading-relaxed line-clamp-4">“{item.quote}”</p>

              <div className="flex items-center justify-between pt-1 mt-auto border-t border-border/50">
                <span className="text-[10px] text-muted-foreground">Order: {item.sort ?? 0}{item.source ? ` · ${item.source}` : ""}</span>
                <div className="flex items-center gap-1">
                  <button onClick={() => togglePublish(item)} title={item.published ? "Unpublish" : "Publish"} className="p-1.5 rounded-lg hover:bg-secondary transition-colors text-muted-foreground hover:text-foreground">
                    {item.published ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                  <button onClick={() => duplicate(item)} title="Duplicate" className="p-1.5 rounded-lg hover:bg-secondary transition-colors text-muted-foreground hover:text-foreground">
                    <Copy className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={() => openEdit(item)} title="Edit" className="p-1.5 rounded-lg hover:bg-secondary transition-colors text-muted-foreground hover:text-foreground">
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={() => setDeleteConfirm(item.id)} title="Delete" className="p-1.5 rounded-lg hover:bg-destructive/10 transition-colors text-muted-foreground hover:text-destructive">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Delete confirm */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-card border border-border rounded-2xl p-6 w-full max-w-sm">
            <h3 className="font-display text-lg mb-2">Delete testimonial?</h3>
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
          <div className="bg-card border border-border rounded-2xl w-full max-w-xl my-8">
            <div className="flex items-center justify-between px-6 py-4 border-b border-border">
              <h2 className="font-display text-lg">{editId ? "Edit Testimonial" : "New Testimonial"}</h2>
              <button onClick={() => setShowForm(false)} className="p-1.5 rounded-lg hover:bg-secondary transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="px-6 py-5 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs uppercase tracking-widest text-muted-foreground mb-1.5">Name *</label>
                  <input value={form.name} onChange={(e) => F("name", e.target.value)} placeholder="Person's name" className="w-full px-3 py-2 rounded-xl bg-background border border-border text-sm focus:outline-none focus:border-primary/50" />
                </div>
                <div>
                  <label className="block text-xs uppercase tracking-widest text-muted-foreground mb-1.5">Role / Title</label>
                  <input value={form.role ?? ""} onChange={(e) => F("role", e.target.value)} placeholder="e.g. Founder, Student" className="w-full px-3 py-2 rounded-xl bg-background border border-border text-sm focus:outline-none focus:border-primary/50" />
                </div>
              </div>

              <div>
                <label className="block text-xs uppercase tracking-widest text-muted-foreground mb-1.5">Testimonial *</label>
                <textarea value={form.quote} onChange={(e) => F("quote", e.target.value)} rows={4} placeholder="What they said…" className="w-full px-3 py-2 rounded-xl bg-background border border-border text-sm focus:outline-none focus:border-primary/50 resize-none" />
              </div>

              <div>
                <label className="block text-xs uppercase tracking-widest text-muted-foreground mb-1.5">Photo URL</label>
                <input value={form.avatar_url ?? ""} onChange={(e) => F("avatar_url", e.target.value)} placeholder="https://… (square image)" className="w-full px-3 py-2 rounded-xl bg-background border border-border text-sm focus:outline-none focus:border-primary/50" />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs uppercase tracking-widest text-muted-foreground mb-1.5">Rating</label>
                  <div className="flex gap-1 items-center h-[38px]">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <button key={i} type="button" onClick={() => F("rating", i + 1)}>
                        <Star className={`w-5 h-5 ${i < (form.rating ?? 0) ? "text-yellow-400 fill-yellow-400" : "text-muted-foreground/30"}`} />
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-xs uppercase tracking-widest text-muted-foreground mb-1.5">Display Order</label>
                  <input type="number" value={form.sort ?? 0} onChange={(e) => F("sort", Number(e.target.value))} min="0" className="w-full px-3 py-2 rounded-xl bg-background border border-border text-sm focus:outline-none focus:border-primary/50" />
                </div>
                <div>
                  <label className="block text-xs uppercase tracking-widest text-muted-foreground mb-1.5">Source</label>
                  <input value={form.source ?? ""} onChange={(e) => F("source", e.target.value)} placeholder="e.g. Email, Verified" className="w-full px-3 py-2 rounded-xl bg-background border border-border text-sm focus:outline-none focus:border-primary/50" />
                </div>
              </div>

              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={form.published} onChange={(e) => F("published", e.target.checked)} className="w-4 h-4 rounded accent-primary" />
                <span className="text-sm">Published <span className="text-muted-foreground">(visible on the website)</span></span>
              </label>
            </div>

            <div className="flex gap-3 px-6 py-4 border-t border-border">
              <Button variant="outline" size="sm" className="flex-1" onClick={() => setShowForm(false)}>Cancel</Button>
              <Button variant="hero" size="sm" className="flex-1" onClick={save} disabled={saving || !form.name.trim() || !form.quote.trim()}>
                {saving ? "Saving…" : editId ? "Update" : "Create"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
