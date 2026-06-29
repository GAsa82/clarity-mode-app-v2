import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { Search, CreditCard } from "lucide-react";

type Sub = {
  id: string;
  user_id: string;
  plan: string;
  status: string;
  provider: string;
  current_period_start: string | null;
  current_period_end: string | null;
  created_at: string;
  profiles: { email: string; name: string | null } | null;
};

export default function SubscriptionsAdmin() {
  const [subs, setSubs] = useState<Sub[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from("subscriptions")
        .select("*, profiles(email, name)")
        .order("created_at", { ascending: false });
      setSubs((data ?? []) as Sub[]);
      setLoading(false);
    };
    load();
  }, []);

  const filtered = subs.filter((s) => {
    const q = search.toLowerCase();
    const email = s.profiles?.email ?? "";
    const matchSearch = !q || email.toLowerCase().includes(q) || s.plan.includes(q);
    const matchStatus = filterStatus === "all" || s.status === filterStatus;
    return matchSearch && matchStatus;
  });

  const statusColor: Record<string, string> = {
    active: "bg-emerald-500/15 text-emerald-400",
    cancelled: "bg-secondary text-muted-foreground",
    expired: "bg-rose-500/15 text-rose-400",
    trialing: "bg-blue-500/15 text-blue-400",
  };

  const fmt = (d: string | null) =>
    d ? new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "—";

  return (
    <div>
      <div className="mb-6">
        <h1 className="font-display text-2xl font-light mb-1">Subscriptions</h1>
        <p className="text-muted-foreground text-sm">
          {subs.filter((s) => s.status === "active").length} active · {subs.length} total
        </p>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by email or plan…" className="w-full pl-9 pr-3 py-2 rounded-xl bg-card border border-border text-sm focus:outline-none focus:border-primary/50" />
        </div>
        <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="px-3 py-2 rounded-xl bg-card border border-border text-sm focus:outline-none focus:border-primary/50">
          <option value="all">All statuses</option>
          <option value="active">Active</option>
          <option value="cancelled">Cancelled</option>
          <option value="expired">Expired</option>
          <option value="trialing">Trialing</option>
        </select>
      </div>

      <div className="rounded-2xl border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-card">
                <th className="text-left px-4 py-3 text-xs uppercase tracking-widest text-muted-foreground font-medium">User</th>
                <th className="text-left px-4 py-3 text-xs uppercase tracking-widest text-muted-foreground font-medium">Plan</th>
                <th className="text-left px-4 py-3 text-xs uppercase tracking-widest text-muted-foreground font-medium">Status</th>
                <th className="text-left px-4 py-3 text-xs uppercase tracking-widest text-muted-foreground font-medium hidden md:table-cell">Provider</th>
                <th className="text-left px-4 py-3 text-xs uppercase tracking-widest text-muted-foreground font-medium hidden lg:table-cell">Renews</th>
                <th className="text-left px-4 py-3 text-xs uppercase tracking-widest text-muted-foreground font-medium hidden lg:table-cell">Started</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} className="px-4 py-12 text-center text-muted-foreground">Loading…</td></tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center">
                    <CreditCard className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
                    <p className="text-muted-foreground text-sm">{search ? "No subscriptions match." : "No subscriptions yet."}</p>
                  </td>
                </tr>
              ) : filtered.map((s) => (
                <tr key={s.id} className="border-b border-border/50 hover:bg-card transition-colors">
                  <td className="px-4 py-3">
                    <p className="text-sm font-medium truncate max-w-[180px]">{s.profiles?.name ?? "—"}</p>
                    <p className="text-xs text-muted-foreground truncate">{s.profiles?.email ?? s.user_id.slice(0, 8) + "…"}</p>
                  </td>
                  <td className="px-4 py-3 text-sm capitalize">{s.plan}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-medium capitalize ${statusColor[s.status] ?? "bg-secondary text-muted-foreground"}`}>
                      {s.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell text-xs text-muted-foreground capitalize">{s.provider}</td>
                  <td className="px-4 py-3 hidden lg:table-cell text-xs text-muted-foreground">{fmt(s.current_period_end)}</td>
                  <td className="px-4 py-3 hidden lg:table-cell text-xs text-muted-foreground">{fmt(s.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
