import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Plus, Search, Pencil, Trash2, X, Tag, Copy } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

type Coupon = {
  id: string;
  code: string;
  type: string;
  value: number;
  max_uses: number | null;
  used_count: number;
  expires_at: string | null;
  active: boolean;
  created_at: string;
};

const EMPTY: Omit<Coupon, "id" | "used_count" | "created_at"> = {
  code: "",
  type: "percent",
  value: 0,
  max_uses: null,
  expires_at: "",
  active: true,
};

export default function CouponsAdmin() {
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState({ ...EMPTY });
  const [saving, setSaving] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const { toast } = useToast();

  const load = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("coupons")
      .select("*")
      .order("created_at", { ascending: false });
    setCoupons((data ?? []) as Coupon[]);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const filtered = coupons.filter((c) => {
    const q = search.toLowerCase();
    return !q || c.code.toLowerCase().includes(q);
  });

  const openNew = () => {
    setEditId(null);
    setForm({ ...EMPTY });
    setShowForm(true);
  };

  const openEdit = (c: Coupon) => {
    setEditId(c.id);
    setForm({
      code: c.code,
      type: c.type,
      value: c.value,
      max_uses: c.max_uses,
      expires_at: c.expires_at ? c.expires_at.split("T")[0] : "",
      active: c.active,
    });
    setShowForm(true);
  };

  const save = async () => {
    if (!form.code.trim()) return;
    setSaving(true);
    const payload = {
      ...form,
      code: form.code.toUpperCase().trim(),
      value: Number(form.value),
      max_uses: form.max_uses ? Number(form.max_uses) : null,
      expires_at: form.expires_at || null,
    };
    if (editId) {
      await supabase.from("coupons").update(payload).eq("id", editId);
    } else {
      await supabase.from("coupons").insert(payload);
    }
    setSaving(false);
    setShowForm(false);
    load();
  };

  const remove = async (id: string) => {
    await supabase.from("coupons").delete().eq("id", id);
    setDeleteConfirm(null);
    load();
  };

  const toggleActive = async (c: Coupon) => {
    await supabase.from("coupons").update({ active: !c.active }).eq("id", c.id);
    load();
  };

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    toast({ title: "Copied!", description: `${code} copied to clipboard.` });
  };

  const F = (key: string, val: unknown) => setForm((f) => ({ ...f, [key]: val }));

  const fmt = (d: string | null) =>
    d ? new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "Never";

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="font-display text-2xl font-light mb-1">Coupons</h1>
          <p className="text-muted-foreground text-sm">{coupons.filter((c) => c.active).length} active · {coupons.length} total</p>
        </div>
        <Button onClick={openNew} variant="hero" size="sm" className="gap-1.5 self-start sm:self-auto">
          <Plus className="w-4 h-4" /> New Coupon
        </Button>
      </div>

      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search coupon code…" className="w-full pl-9 pr-3 py-2 rounded-xl bg-card border border-border text-sm focus:outline-none focus:border-primary/50" />
      </div>

      <div className="rounded-2xl border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-card">
                <th className="text-left px-4 py-3 text-xs uppercase tracking-widest text-muted-foreground font-medium">Code</th>
                <th className="text-left px-4 py-3 text-xs uppercase tracking-widest text-muted-foreground font-medium">Discount</th>
                <th className="text-left px-4 py-3 text-xs uppercase tracking-widest text-muted-foreground font-medium hidden sm:table-cell">Uses</th>
                <th className="text-left px-4 py-3 text-xs uppercase tracking-widest text-muted-foreground font-medium hidden md:table-cell">Expires</th>
                <th className="text-left px-4 py-3 text-xs uppercase tracking-widest text-muted-foreground font-medium">Active</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} className="px-4 py-12 text-center text-muted-foreground">Loading…</td></tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center">
                    <Tag className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
                    <p className="text-muted-foreground text-sm">{search ? "No coupons match." : "No coupons yet."}</p>
                  </td>
                </tr>
              ) : filtered.map((c) => (
                <tr key={c.id} className="border-b border-border/50 hover:bg-card transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-sm font-medium">{c.code}</span>
                      <button onClick={() => copyCode(c.code)} className="p-1 rounded text-muted-foreground hover:text-foreground transition-colors">
                        <Copy className="w-3 h-3" />
                      </button>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm">
                    {c.type === "percent" ? `${c.value}%` : `₹${c.value}`}
                  </td>
                  <td className="px-4 py-3 hidden sm:table-cell text-xs text-muted-foreground">
                    {c.used_count}{c.max_uses ? ` / ${c.max_uses}` : ""}
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell text-xs text-muted-foreground">{fmt(c.expires_at)}</td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => toggleActive(c)}
                      className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${c.active ? "bg-primary" : "bg-secondary"}`}
                    >
                      <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${c.active ? "translate-x-4" : "translate-x-1"}`} />
                    </button>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1 justify-end">
                      <button onClick={() => openEdit(c)} className="p-1.5 rounded-lg hover:bg-secondary transition-colors text-muted-foreground hover:text-foreground">
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => setDeleteConfirm(c.id)} className="p-1.5 rounded-lg hover:bg-destructive/10 transition-colors text-muted-foreground hover:text-destructive">
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

      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-card border border-border rounded-2xl p-6 w-full max-w-sm">
            <h3 className="font-display text-lg mb-2">Delete coupon?</h3>
            <p className="text-muted-foreground text-sm mb-6">This action cannot be undone.</p>
            <div className="flex gap-3">
              <Button variant="outline" size="sm" className="flex-1" onClick={() => setDeleteConfirm(null)}>Cancel</Button>
              <Button variant="destructive" size="sm" className="flex-1" onClick={() => remove(deleteConfirm)}>Delete</Button>
            </div>
          </div>
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-card border border-border rounded-2xl w-full max-w-md my-8">
            <div className="flex items-center justify-between px-6 py-4 border-b border-border">
              <h2 className="font-display text-lg">{editId ? "Edit Coupon" : "New Coupon"}</h2>
              <button onClick={() => setShowForm(false)} className="p-1.5 rounded-lg hover:bg-secondary transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="px-6 py-5 space-y-4">
              <div>
                <label className="block text-xs uppercase tracking-widest text-muted-foreground mb-1.5">Code *</label>
                <input value={form.code} onChange={(e) => F("code", e.target.value.toUpperCase())} placeholder="SAVE20" className="w-full px-3 py-2 rounded-xl bg-background border border-border text-sm font-mono focus:outline-none focus:border-primary/50 uppercase" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs uppercase tracking-widest text-muted-foreground mb-1.5">Type</label>
                  <select value={form.type} onChange={(e) => F("type", e.target.value)} className="w-full px-3 py-2 rounded-xl bg-background border border-border text-sm focus:outline-none focus:border-primary/50">
                    <option value="percent">Percent off (%)</option>
                    <option value="fixed">Fixed amount (₹)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs uppercase tracking-widest text-muted-foreground mb-1.5">
                    Value {form.type === "percent" ? "(%)" : "(₹)"}
                  </label>
                  <input type="number" value={form.value || ""} onChange={(e) => F("value", Number(e.target.value))} placeholder={form.type === "percent" ? "20" : "100"} min="0" className="w-full px-3 py-2 rounded-xl bg-background border border-border text-sm focus:outline-none focus:border-primary/50" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs uppercase tracking-widest text-muted-foreground mb-1.5">Max Uses</label>
                  <input type="number" value={form.max_uses ?? ""} onChange={(e) => F("max_uses", e.target.value ? Number(e.target.value) : null)} placeholder="Unlimited" min="0" className="w-full px-3 py-2 rounded-xl bg-background border border-border text-sm focus:outline-none focus:border-primary/50" />
                </div>
                <div>
                  <label className="block text-xs uppercase tracking-widest text-muted-foreground mb-1.5">Expiry Date</label>
                  <input type="date" value={form.expires_at ?? ""} onChange={(e) => F("expires_at", e.target.value)} className="w-full px-3 py-2 rounded-xl bg-background border border-border text-sm focus:outline-none focus:border-primary/50" />
                </div>
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={form.active} onChange={(e) => F("active", e.target.checked)} className="rounded" />
                <span className="text-sm">Active</span>
              </label>
            </div>
            <div className="flex gap-3 px-6 py-4 border-t border-border">
              <Button variant="outline" size="sm" className="flex-1" onClick={() => setShowForm(false)}>Cancel</Button>
              <Button variant="hero" size="sm" className="flex-1" onClick={save} disabled={saving || !form.code.trim()}>
                {saving ? "Saving…" : editId ? "Update" : "Create"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
