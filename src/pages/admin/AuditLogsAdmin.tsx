import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { Search, ClipboardList } from "lucide-react";

type AuditLog = {
  id: string;
  user_id: string | null;
  action: string;
  resource: string | null;
  resource_id: string | null;
  ip_address: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
};

export default function AuditLogsAdmin() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from("audit_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(200);
      setLogs((data ?? []) as AuditLog[]);
      setLoading(false);
    };
    load();
  }, []);

  const filtered = logs.filter((l) => {
    const q = search.toLowerCase();
    return (
      !q ||
      l.action.toLowerCase().includes(q) ||
      (l.resource ?? "").toLowerCase().includes(q) ||
      (l.user_id ?? "").includes(q)
    );
  });

  const fmt = (d: string) =>
    new Date(d).toLocaleString("en-IN", {
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });

  const actionColor = (action: string) => {
    if (action.includes("delete") || action.includes("remove")) return "text-rose-400";
    if (action.includes("create") || action.includes("insert")) return "text-emerald-400";
    if (action.includes("update") || action.includes("edit")) return "text-blue-400";
    return "text-muted-foreground";
  };

  return (
    <div>
      <div className="mb-6">
        <h1 className="font-display text-2xl font-light mb-1">Audit Logs</h1>
        <p className="text-muted-foreground text-sm">Last 200 actions</p>
      </div>

      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by action or resource…"
          className="w-full pl-9 pr-3 py-2 rounded-xl bg-card border border-border text-sm focus:outline-none focus:border-primary/50"
        />
      </div>

      <div className="rounded-2xl border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-card">
                <th className="text-left px-4 py-3 text-xs uppercase tracking-widest text-muted-foreground font-medium">Action</th>
                <th className="text-left px-4 py-3 text-xs uppercase tracking-widest text-muted-foreground font-medium hidden md:table-cell">Resource</th>
                <th className="text-left px-4 py-3 text-xs uppercase tracking-widest text-muted-foreground font-medium hidden lg:table-cell">IP</th>
                <th className="text-left px-4 py-3 text-xs uppercase tracking-widest text-muted-foreground font-medium">Time</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={4} className="px-4 py-12 text-center text-muted-foreground">Loading…</td></tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-12 text-center">
                    <ClipboardList className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
                    <p className="text-muted-foreground text-sm">{search ? "No logs match." : "No audit logs yet."}</p>
                  </td>
                </tr>
              ) : filtered.map((l) => (
                <tr key={l.id} className="border-b border-border/50 hover:bg-card transition-colors">
                  <td className="px-4 py-2.5">
                    <span className={`text-sm font-mono ${actionColor(l.action)}`}>{l.action}</span>
                  </td>
                  <td className="px-4 py-2.5 hidden md:table-cell text-xs text-muted-foreground">
                    {l.resource ?? "—"}{l.resource_id ? ` · ${l.resource_id.slice(0, 8)}…` : ""}
                  </td>
                  <td className="px-4 py-2.5 hidden lg:table-cell text-xs font-mono text-muted-foreground">
                    {l.ip_address ?? "—"}
                  </td>
                  <td className="px-4 py-2.5 text-xs text-muted-foreground">{fmt(l.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
