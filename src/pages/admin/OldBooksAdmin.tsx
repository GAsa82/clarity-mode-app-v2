import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { useWebsite } from "@/contexts/WebsiteContext";
import { MediaUploadField } from "@/components/admin/MediaUploadField";
import { Plus, Search, Pencil, Trash2, X, Store, Star } from "lucide-react";

type Book = {
  id: string;
  title: string;
  author: string | null;
  category: string | null;
  condition: string;
  mrp: number | null;
  price: number;
  language: string | null;
  publisher: string | null;
  edition: string | null;
  pages: number | null;
  year: number | null;
  isbn: string | null;
  seller_name: string | null;
  seller_notes: string | null;
  cover_url: string | null;
  images: string[];
  available: number;
  sold_count: number;
  featured: boolean;
  rare_find: boolean;
};

const CONDITION_LABELS: Record<string, string> = {
  like_new: "Like New",
  very_good: "Very Good",
  good: "Good",
  fair: "Fair",
  heavily_used: "Heavily Used",
};

const CONDITION_COLORS: Record<string, string> = {
  like_new: "text-emerald-400 bg-emerald-500/10",
  very_good: "text-blue-400 bg-blue-500/10",
  good: "text-amber-400 bg-amber-500/10",
  fair: "text-orange-400 bg-orange-500/10",
  heavily_used: "text-rose-400 bg-rose-500/10",
};

const EMPTY: Omit<Book, "id" | "sold_count"> = {
  title: "",
  author: "",
  category: "",
  condition: "good",
  mrp: null,
  price: 0,
  language: "English",
  publisher: "",
  edition: "",
  pages: null,
  year: null,
  isbn: "",
  seller_name: "",
  seller_notes: "",
  cover_url: "",
  images: [],
  available: 1,
  featured: false,
  rare_find: false,
};

export default function OldBooksAdmin() {
  const { current } = useWebsite();
  const [searchParams] = useSearchParams();
  const [books, setBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterCondition, setFilterCondition] = useState("all");
  const [showForm, setShowForm] = useState(searchParams.get("new") === "1");
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<Omit<Book, "id" | "sold_count">>({ ...EMPTY });
  const [saving, setSaving] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const load = async () => {
    if (!current) return;
    setLoading(true);
    const { data } = await supabase
      .from("old_books")
      .select("*")
      .eq("website_id", current.id)
      .order("featured", { ascending: false });
    setBooks(data ?? []);
    setLoading(false);
  };

  useEffect(() => { load(); }, [current?.id]);

  const filtered = books.filter((b) => {
    const q = search.toLowerCase();
    const matchSearch =
      !q ||
      b.title.toLowerCase().includes(q) ||
      (b.author ?? "").toLowerCase().includes(q) ||
      (b.isbn ?? "").includes(q);
    const matchCond = filterCondition === "all" || b.condition === filterCondition;
    return matchSearch && matchCond;
  });

  const openNew = () => {
    setEditId(null);
    setForm({ ...EMPTY });
    setShowForm(true);
  };

  const openEdit = (b: Book) => {
    setEditId(b.id);
    setForm({
      title: b.title,
      author: b.author ?? "",
      category: b.category ?? "",
      condition: b.condition,
      mrp: b.mrp,
      price: b.price,
      language: b.language ?? "English",
      publisher: b.publisher ?? "",
      edition: b.edition ?? "",
      pages: b.pages,
      year: b.year,
      isbn: b.isbn ?? "",
      seller_name: b.seller_name ?? "",
      seller_notes: b.seller_notes ?? "",
      cover_url: b.cover_url ?? "",
      images: b.images ?? [],
      available: b.available,
      featured: b.featured,
      rare_find: b.rare_find,
    });
    setShowForm(true);
  };

  const save = async () => {
    if (!form.title.trim()) return;
    setSaving(true);
    const payload = {
      ...form,
      website_id: current?.id ?? null,
      author: form.author || null,
      category: form.category || null,
      language: form.language || null,
      publisher: form.publisher || null,
      edition: form.edition || null,
      isbn: form.isbn || null,
      seller_name: form.seller_name || null,
      seller_notes: form.seller_notes || null,
      cover_url: form.cover_url || null,
      price: Number(form.price) || 0,
      mrp: form.mrp ? Number(form.mrp) : null,
      pages: form.pages ? Number(form.pages) : null,
      year: form.year ? Number(form.year) : null,
      available: Number(form.available) || 0,
    };
    if (editId) {
      await supabase.from("old_books").update(payload).eq("id", editId);
    } else {
      await supabase.from("old_books").insert(payload);
    }
    setSaving(false);
    setShowForm(false);
    load();
  };

  const remove = async (id: string) => {
    await supabase.from("old_books").delete().eq("id", id);
    setDeleteConfirm(null);
    load();
  };

  const toggleFeatured = async (b: Book) => {
    await supabase.from("old_books").update({ featured: !b.featured }).eq("id", b.id);
    load();
  };

  const F = (key: keyof typeof form, val: unknown) =>
    setForm((f) => ({ ...f, [key]: val }));

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="font-display text-2xl font-light mb-1">Old Books Marketplace</h1>
          <p className="text-muted-foreground text-sm">
            {books.length} books listed · {books.filter((b) => b.available > 0).length} in stock
          </p>
        </div>
        <Button onClick={openNew} variant="hero" size="sm" className="gap-1.5 self-start sm:self-auto">
          <Plus className="w-4 h-4" /> List a Book
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by title, author or ISBN…"
            className="w-full pl-9 pr-3 py-2 rounded-xl bg-card border border-border text-sm focus:outline-none focus:border-primary/50 transition-colors"
          />
        </div>
        <select
          value={filterCondition}
          onChange={(e) => setFilterCondition(e.target.value)}
          className="px-3 py-2 rounded-xl bg-card border border-border text-sm focus:outline-none focus:border-primary/50"
        >
          <option value="all">All conditions</option>
          {Object.entries(CONDITION_LABELS).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </select>
      </div>

      {/* Table */}
      <div className="rounded-2xl border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-card">
                <th className="text-left px-4 py-3 text-xs uppercase tracking-widest text-muted-foreground font-medium">Book</th>
                <th className="text-left px-4 py-3 text-xs uppercase tracking-widest text-muted-foreground font-medium hidden md:table-cell">Condition</th>
                <th className="text-left px-4 py-3 text-xs uppercase tracking-widest text-muted-foreground font-medium">Price</th>
                <th className="text-left px-4 py-3 text-xs uppercase tracking-widest text-muted-foreground font-medium hidden sm:table-cell">Stock</th>
                <th className="text-left px-4 py-3 text-xs uppercase tracking-widest text-muted-foreground font-medium hidden lg:table-cell">Sold</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} className="px-4 py-12 text-center text-muted-foreground">Loading…</td></tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center">
                    <Store className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
                    <p className="text-muted-foreground text-sm">
                      {search ? "No books match your search." : "No books listed yet."}
                    </p>
                  </td>
                </tr>
              ) : filtered.map((b) => (
                <tr key={b.id} className="border-b border-border/50 hover:bg-card transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      {b.cover_url ? (
                        <img src={b.cover_url} alt={b.title} className="w-8 h-10 object-cover rounded shrink-0 bg-secondary" />
                      ) : (
                        <div className="w-8 h-10 rounded bg-secondary shrink-0 flex items-center justify-center">
                          <Store className="w-3.5 h-3.5 text-muted-foreground/50" />
                        </div>
                      )}
                      <div className="min-w-0">
                        <p className="font-medium text-sm truncate max-w-[160px] flex items-center gap-1">
                          {b.title}
                          {b.featured && <Star className="w-3 h-3 text-amber-400 fill-amber-400 shrink-0" />}
                          {b.rare_find && <span className="text-[9px] text-rose-400 bg-rose-500/10 rounded px-1">Rare</span>}
                        </p>
                        {b.author && <p className="text-xs text-muted-foreground truncate">{b.author}</p>}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell">
                    <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-medium ${CONDITION_COLORS[b.condition] ?? "bg-secondary text-muted-foreground"}`}>
                      {CONDITION_LABELS[b.condition] ?? b.condition}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div>
                      <p className="text-sm font-medium">₹{b.price}</p>
                      {b.mrp && b.mrp > b.price && (
                        <p className="text-[10px] text-muted-foreground line-through">₹{b.mrp}</p>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 hidden sm:table-cell">
                    <span className={`text-xs ${b.available > 0 ? "text-emerald-400" : "text-rose-400"}`}>
                      {b.available > 0 ? `${b.available} in stock` : "Out of stock"}
                    </span>
                  </td>
                  <td className="px-4 py-3 hidden lg:table-cell text-xs text-muted-foreground">{b.sold_count}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1 justify-end">
                      <button
                        onClick={() => toggleFeatured(b)}
                        title={b.featured ? "Unfeature" : "Feature"}
                        className={`p-1.5 rounded-lg hover:bg-secondary transition-colors ${b.featured ? "text-amber-400" : "text-muted-foreground"}`}
                      >
                        <Star className={`w-3.5 h-3.5 ${b.featured ? "fill-amber-400" : ""}`} />
                      </button>
                      <button onClick={() => openEdit(b)} className="p-1.5 rounded-lg hover:bg-secondary transition-colors text-muted-foreground hover:text-foreground">
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => setDeleteConfirm(b.id)} className="p-1.5 rounded-lg hover:bg-destructive/10 transition-colors text-muted-foreground hover:text-destructive">
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
            <h3 className="font-display text-lg mb-2">Remove book listing?</h3>
            <p className="text-muted-foreground text-sm mb-6">This action cannot be undone.</p>
            <div className="flex gap-3">
              <Button variant="outline" size="sm" className="flex-1" onClick={() => setDeleteConfirm(null)}>Cancel</Button>
              <Button variant="destructive" size="sm" className="flex-1" onClick={() => remove(deleteConfirm)}>Remove</Button>
            </div>
          </div>
        </div>
      )}

      {/* Form modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-card border border-border rounded-2xl w-full max-w-2xl my-8">
            <div className="flex items-center justify-between px-6 py-4 border-b border-border">
              <h2 className="font-display text-lg">{editId ? "Edit Book" : "List a Book"}</h2>
              <button onClick={() => setShowForm(false)} className="p-1.5 rounded-lg hover:bg-secondary transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="px-6 py-5 space-y-4">
              <div>
                <label className="block text-xs uppercase tracking-widest text-muted-foreground mb-1.5">Title *</label>
                <input value={form.title} onChange={(e) => F("title", e.target.value)} placeholder="Book title" className="w-full px-3 py-2 rounded-xl bg-background border border-border text-sm focus:outline-none focus:border-primary/50" />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs uppercase tracking-widest text-muted-foreground mb-1.5">Author</label>
                  <input value={form.author ?? ""} onChange={(e) => F("author", e.target.value)} placeholder="Author name" className="w-full px-3 py-2 rounded-xl bg-background border border-border text-sm focus:outline-none focus:border-primary/50" />
                </div>
                <div>
                  <label className="block text-xs uppercase tracking-widest text-muted-foreground mb-1.5">Category</label>
                  <input value={form.category ?? ""} onChange={(e) => F("category", e.target.value)} placeholder="e.g. Psychology, Philosophy" className="w-full px-3 py-2 rounded-xl bg-background border border-border text-sm focus:outline-none focus:border-primary/50" />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs uppercase tracking-widest text-muted-foreground mb-1.5">Condition *</label>
                  <select value={form.condition} onChange={(e) => F("condition", e.target.value)} className="w-full px-3 py-2 rounded-xl bg-background border border-border text-sm focus:outline-none focus:border-primary/50">
                    {Object.entries(CONDITION_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs uppercase tracking-widest text-muted-foreground mb-1.5">Price (₹) *</label>
                  <input type="number" value={form.price || ""} onChange={(e) => F("price", Number(e.target.value))} placeholder="499" min="0" className="w-full px-3 py-2 rounded-xl bg-background border border-border text-sm focus:outline-none focus:border-primary/50" />
                </div>
                <div>
                  <label className="block text-xs uppercase tracking-widest text-muted-foreground mb-1.5">MRP (₹)</label>
                  <input type="number" value={form.mrp ?? ""} onChange={(e) => F("mrp", e.target.value ? Number(e.target.value) : null)} placeholder="799" min="0" className="w-full px-3 py-2 rounded-xl bg-background border border-border text-sm focus:outline-none focus:border-primary/50" />
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div>
                  <label className="block text-xs uppercase tracking-widest text-muted-foreground mb-1.5">Year</label>
                  <input type="number" value={form.year ?? ""} onChange={(e) => F("year", e.target.value ? Number(e.target.value) : null)} placeholder="2010" className="w-full px-3 py-2 rounded-xl bg-background border border-border text-sm focus:outline-none focus:border-primary/50" />
                </div>
                <div>
                  <label className="block text-xs uppercase tracking-widest text-muted-foreground mb-1.5">Pages</label>
                  <input type="number" value={form.pages ?? ""} onChange={(e) => F("pages", e.target.value ? Number(e.target.value) : null)} placeholder="320" className="w-full px-3 py-2 rounded-xl bg-background border border-border text-sm focus:outline-none focus:border-primary/50" />
                </div>
                <div>
                  <label className="block text-xs uppercase tracking-widest text-muted-foreground mb-1.5">Language</label>
                  <input value={form.language ?? ""} onChange={(e) => F("language", e.target.value)} placeholder="English" className="w-full px-3 py-2 rounded-xl bg-background border border-border text-sm focus:outline-none focus:border-primary/50" />
                </div>
                <div>
                  <label className="block text-xs uppercase tracking-widest text-muted-foreground mb-1.5">Stock</label>
                  <input type="number" value={form.available} onChange={(e) => F("available", Number(e.target.value))} min="0" className="w-full px-3 py-2 rounded-xl bg-background border border-border text-sm focus:outline-none focus:border-primary/50" />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs uppercase tracking-widest text-muted-foreground mb-1.5">Publisher</label>
                  <input value={form.publisher ?? ""} onChange={(e) => F("publisher", e.target.value)} placeholder="Penguin" className="w-full px-3 py-2 rounded-xl bg-background border border-border text-sm focus:outline-none focus:border-primary/50" />
                </div>
                <div>
                  <label className="block text-xs uppercase tracking-widest text-muted-foreground mb-1.5">Edition</label>
                  <input value={form.edition ?? ""} onChange={(e) => F("edition", e.target.value)} placeholder="3rd" className="w-full px-3 py-2 rounded-xl bg-background border border-border text-sm focus:outline-none focus:border-primary/50" />
                </div>
                <div>
                  <label className="block text-xs uppercase tracking-widest text-muted-foreground mb-1.5">ISBN</label>
                  <input value={form.isbn ?? ""} onChange={(e) => F("isbn", e.target.value)} placeholder="978-0…" className="w-full px-3 py-2 rounded-xl bg-background border border-border text-sm focus:outline-none focus:border-primary/50" />
                </div>
              </div>

              <MediaUploadField
                label="Cover Image"
                value={form.cover_url ?? ""}
                onChange={(url) => F("cover_url", url)}
                folder="covers"
                accept="image/*"
                maxSizeMB={10}
              />

              <div>
                <label className="block text-xs uppercase tracking-widest text-muted-foreground mb-1.5">Seller Notes</label>
                <textarea value={form.seller_notes ?? ""} onChange={(e) => F("seller_notes", e.target.value)} rows={2} placeholder="Condition details, highlights, inscription notes…" className="w-full px-3 py-2 rounded-xl bg-background border border-border text-sm focus:outline-none focus:border-primary/50 resize-none" />
              </div>

              <div className="flex gap-6">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={form.featured} onChange={(e) => F("featured", e.target.checked)} className="rounded" />
                  <span className="text-sm">Featured</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={form.rare_find} onChange={(e) => F("rare_find", e.target.checked)} className="rounded" />
                  <span className="text-sm">Rare Find</span>
                </label>
              </div>
            </div>
            <div className="flex gap-3 px-6 py-4 border-t border-border">
              <Button variant="outline" size="sm" className="flex-1" onClick={() => setShowForm(false)}>Cancel</Button>
              <Button variant="hero" size="sm" className="flex-1" onClick={save} disabled={saving || !form.title.trim()}>
                {saving ? "Saving…" : editId ? "Update Book" : "List Book"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
