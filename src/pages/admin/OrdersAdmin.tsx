import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { Search, ShoppingBag } from "lucide-react";

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
