import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { Search, ShoppingBag, FlaskConical, Save } from "lucide-react";
import { getSetting, setSetting } from "@/lib/site-settings";

type PaymentTestMode = { enabled: boolean; amountPaise: number };

/**
 * Global ₹1 test mode — while ON, every paid flow on the site (store
 * products, old books, memberships, Member of the Day) charges this amount
 * instead of its list price. Enforced server-side.
 */
function PaymentTestModeCard() {
  const [cfg, setCfg] = useState<PaymentTestMode>({ enabled: false, amountPaise: 100 });
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    getSetting<PaymentTestMode>("payment_test_mode")
      .then((v) => { if (v) setCfg({ enabled: !!v.enabled, amountPaise: v.amountPaise || 100 }); })
      .finally(() => setLoaded(true));
  }, []);

  const save = async () => {
    setSaving(true);
    const { error } = await setSetting("payment_test_mode", cfg, "Global payment test mode — overrides ALL prices");
    setSaving(false);
    if (!error) { setSaved(true); setTimeout(() => setSaved(false), 2500); }
  };

  if (!loaded) return null;

  return (
    <div className={`mb-6 rounded-2xl border p-4 ${cfg.enabled ? "border-amber-400/40 bg-amber-400/5" : "border-border bg-card"}`}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <FlaskConical className={`w-4 h-4 ${cfg.enabled ? "text-amber-400" : "text-muted-foreground"}`} />
          <span className="text-sm font-medium">Payment Test Mode</span>
          {cfg.enabled && (
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-400/15 text-amber-400 border border-amber-400/20">
              ACTIVE — every price overridden to ₹{(cfg.amountPaise / 100).toFixed(0)}
            </span>
          )}
        </div>
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 text-xs cursor-pointer">
            <input
              type="checkbox"
              checked={cfg.enabled}
              onChange={(e) => setCfg((c) => ({ ...c, enabled: e.target.checked }))}
              className="accent-amber-400 w-4 h-4"
            />
            {cfg.enabled ? "ON" : "OFF"}
          </label>
          <div className="flex items-center gap-1">
            <span className="text-xs text-muted-foreground">₹</span>
            <input
              type="number"
              min={1}
              max={100}
              value={Math.round(cfg.amountPaise / 100)}
              onChange={(e) => {
                const rupees = Math.max(1, Math.min(100, Number(e.target.value) || 1));
                setCfg((c) => ({ ...c, amountPaise: rupees * 100 }));
              }}
              className="w-16 px-2 py-1.5 rounded-lg bg-background border border-border text-sm focus:outline-none focus:border-primary/50"
            />
          </div>
          <button
            onClick={save}
            disabled={saving}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:opacity-90 disabled:opacity-50 transition"
          >
            <Save className="w-3.5 h-3.5" /> {saved ? "Saved ✓" : saving ? "Saving…" : "Save"}
          </button>
        </div>
      </div>
      <p className="text-[11px] text-muted-foreground mt-2">
        Overrides every checkout on the site — store products, old books, Premium memberships, and the Member of the
        Day fee — to the test amount. Enforced server-side; the browser can't opt out. <span className="font-medium text-amber-400">Turn OFF before real sales.</span>
      </p>
    </div>
  );
}

type Order = {
  id: string;
  user_id: string;
  item_type: string;
  item_title: string | null;
  amount: number;
  currency: string;
  razorpay_order_id: string | null;
  razorpay_payment_id: string | null;
  status: string;
  created_at: string;
};

export default function OrdersAdmin() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from("orders")
        .select("*")
        .order("created_at", { ascending: false });
      setOrders((data ?? []) as Order[]);
      setLoading(false);
    };
    load();
  }, []);

  const filtered = orders.filter((o) => {
    const q = search.toLowerCase();
    const matchSearch =
      !q ||
      (o.item_title ?? "").toLowerCase().includes(q) ||
      (o.razorpay_payment_id ?? "").includes(q) ||
      o.item_type.includes(q);
    const matchStatus = filterStatus === "all" || o.status === filterStatus;
    return matchSearch && matchStatus;
  });

  const total = orders.filter((o) => o.status === "completed").reduce((sum, o) => sum + o.amount, 0);

  const statusColor: Record<string, string> = {
    completed: "bg-emerald-500/15 text-emerald-400",
    pending: "bg-amber-500/15 text-amber-400",
    failed: "bg-rose-500/15 text-rose-400",
    refunded: "bg-blue-500/15 text-blue-400",
  };

  const fmt = (d: string) =>
    new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });

  return (
    <div>
      <div className="mb-6">
        <h1 className="font-display text-2xl font-light mb-1">Orders</h1>
        <p className="text-muted-foreground text-sm">
          {orders.filter((o) => o.status === "completed").length} completed · ₹{(total / 100).toLocaleString("en-IN")} revenue
        </p>
      </div>

      <PaymentTestModeCard />

      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by item or payment ID…" className="w-full pl-9 pr-3 py-2 rounded-xl bg-card border border-border text-sm focus:outline-none focus:border-primary/50" />
        </div>
        <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="px-3 py-2 rounded-xl bg-card border border-border text-sm focus:outline-none focus:border-primary/50">
          <option value="all">All statuses</option>
          <option value="completed">Completed</option>
          <option value="pending">Pending</option>
          <option value="failed">Failed</option>
          <option value="refunded">Refunded</option>
        </select>
      </div>

      <div className="rounded-2xl border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-card">
                <th className="text-left px-4 py-3 text-xs uppercase tracking-widest text-muted-foreground font-medium">Item</th>
                <th className="text-left px-4 py-3 text-xs uppercase tracking-widest text-muted-foreground font-medium hidden md:table-cell">Type</th>
                <th className="text-left px-4 py-3 text-xs uppercase tracking-widest text-muted-foreground font-medium">Amount</th>
                <th className="text-left px-4 py-3 text-xs uppercase tracking-widest text-muted-foreground font-medium">Status</th>
                <th className="text-left px-4 py-3 text-xs uppercase tracking-widest text-muted-foreground font-medium hidden lg:table-cell">Payment ID</th>
                <th className="text-left px-4 py-3 text-xs uppercase tracking-widest text-muted-foreground font-medium hidden lg:table-cell">Date</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} className="px-4 py-12 text-center text-muted-foreground">Loading…</td></tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center">
                    <ShoppingBag className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
                    <p className="text-muted-foreground text-sm">{search ? "No orders match your search." : "No orders yet."}</p>
                  </td>
                </tr>
              ) : filtered.map((o) => (
                <tr key={o.id} className="border-b border-border/50 hover:bg-card transition-colors">
                  <td className="px-4 py-3">
                    <p className="text-sm font-medium truncate max-w-[160px]">{o.item_title ?? "—"}</p>
                    <p className="text-[10px] text-muted-foreground">{o.id.slice(0, 8)}…</p>
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell text-xs text-muted-foreground capitalize">{o.item_type.replace("_", " ")}</td>
                  <td className="px-4 py-3 text-sm font-medium">₹{(o.amount / 100).toFixed(0)}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-medium capitalize ${statusColor[o.status] ?? "bg-secondary text-muted-foreground"}`}>
                      {o.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 hidden lg:table-cell text-xs text-muted-foreground font-mono">
                    {o.razorpay_payment_id ?? "—"}
                  </td>
                  <td className="px-4 py-3 hidden lg:table-cell text-xs text-muted-foreground">{fmt(o.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
