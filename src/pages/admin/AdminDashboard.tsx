import { Link } from "react-router-dom";
import { useWebsite } from "@/contexts/WebsiteContext";
import { useCommandCenterMetrics, type Health } from "@/hooks/useCommandCenterMetrics";
import { useFederation } from "@/hooks/useFederation";
import { openCommandPalette } from "@/components/admin/CommandPalette";
import {
  Users, ShoppingBag, BookMarked, Video, MessageSquare, TrendingUp,
  ArrowRight, Layers, Globe, IndianRupee, UserPlus, Sparkles,
  AlertTriangle, Activity, RefreshCw, Search as SearchIcon, Command,
  Boxes, PlugZap,
} from "lucide-react";

const HEALTH_COLOR: Record<Health, string> = {
  ok: "#10b981", degraded: "#f59e0b", down: "#ef4444", unconfigured: "#64748b",
};
const HEALTH_LABEL: Record<Health, string> = {
  ok: "Operational", degraded: "Degraded", down: "Down", unconfigured: "Not set up",
};

const fmtNum = (n: number | null) =>
  n === null ? "—" : n.toLocaleString("en-IN");
const fmtMoney = (n: number | null) =>
  n === null ? "—" : `₹${Math.round(n).toLocaleString("en-IN")}`;

export default function AdminDashboard() {
  const { current, websites } = useWebsite();
  const m = useCommandCenterMetrics(current?.id);
  const fed = useFederation();

  const kpis = [
    { label: "Revenue", value: fmtMoney(m.revenue), icon: IndianRupee, color: "#10b981", to: "/admin/orders", sub: "completed orders" },
    { label: "Total Users", value: fmtNum(m.totalUsers), icon: Users, color: "#6366f1", to: "/admin/users", sub: "all accounts" },
    { label: "New Today", value: fmtNum(m.newUsersToday), icon: UserPlus, color: "#8b5cf6", to: "/admin/users", sub: "signups today" },
    { label: "New · 7 days", value: fmtNum(m.newUsers7d), icon: TrendingUp, color: "#0ea5e9", to: "/admin/users", sub: "signups this week" },
    { label: "Published Today", value: fmtNum(m.publishedToday), icon: Sparkles, color: "#f59e0b", to: "/admin/content-studio", sub: "content live today" },
    { label: "Completed Orders", value: fmtNum(m.completedOrders), icon: ShoppingBag, color: "#ec4899", to: "/admin/orders", sub: "paid" },
  ];

  const content = [
    { label: "Published Content", value: fmtNum(m.publishedContent), icon: Layers, color: "#0891b2", to: "/admin/content-studio" },
    { label: "Research Papers", value: fmtNum(m.papers), icon: BookMarked, color: "#059669", to: "/admin/research-papers" },
    { label: "Clarity Sessions", value: fmtNum(m.sessions), icon: Video, color: "#7c3aed", to: "/admin/clarity-sessions" },
    { label: "Testimonials", value: fmtNum(m.testimonials), icon: MessageSquare, color: "#e11d48", to: "/admin/testimonials" },
  ];

  const alerts = [
    { label: "Pending Orders", value: m.pendingOrders, icon: ShoppingBag, to: "/admin/orders", warnAbove: 0 },
    { label: "Failed Payments", value: m.failedOrders, icon: AlertTriangle, to: "/admin/orders", warnAbove: 0 },
    { label: "Audit Events · 24h", value: m.auditEvents24h, icon: Activity, to: "/admin/audit-logs", warnAbove: Infinity },
  ];

  return (
    <div>
      {/* Header */}
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-2">
            {current && (
              <span
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium"
                style={{ background: `${current.brand_color}18`, color: current.brand_color, border: `1px solid ${current.brand_color}30` }}
              >
                <Globe className="w-3 h-3" />
                {current.name}
              </span>
            )}
            <span className="inline-flex items-center gap-1.5 text-[11px] text-white/30">
              <span className="relative flex h-1.5 w-1.5">
                <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-60 animate-ping" />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-400" />
              </span>
              Live
            </span>
          </div>
          <h1 className="font-display text-2xl font-light text-white mb-1">Command Center</h1>
          <p className="text-white/40 text-sm">
            {current ? `Operating ${current.name}` : "Select a website to begin"}
            {m.lastUpdated && ` · updated ${m.lastUpdated.toLocaleTimeString()}`}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={openCommandPalette}
            className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs text-white/50 hover:text-white/90 border border-white/8 hover:border-white/15 hover:bg-white/5 transition-all"
          >
            <SearchIcon className="w-3.5 h-3.5" />
            Search & jump
            <kbd className="flex items-center gap-0.5 text-[10px] px-1.5 py-0.5 rounded bg-white/8">
              <Command className="w-2.5 h-2.5" />K
            </kbd>
          </button>
          <button
            onClick={m.refresh}
            className="p-2 rounded-xl text-white/40 hover:text-white/90 border border-white/8 hover:bg-white/5 transition-all"
            title="Refresh now"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${m.loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {/* Health strip */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 mb-6">
        {m.health.length === 0
          ? Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="rounded-xl h-[68px] animate-pulse"
                style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }} />
            ))
          : m.health.map((h) => (
              <div key={h.key} className="rounded-xl px-4 py-3 flex items-center gap-3"
                style={{ background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.06)" }}>
                <span className="relative flex h-2.5 w-2.5 shrink-0">
                  {h.status === "ok" && (
                    <span className="absolute inline-flex h-full w-full rounded-full opacity-50 animate-ping"
                      style={{ background: HEALTH_COLOR[h.status] }} />
                  )}
                  <span className="relative inline-flex h-2.5 w-2.5 rounded-full"
                    style={{ background: HEALTH_COLOR[h.status] }} />
                </span>
                <div className="min-w-0">
                  <p className="text-xs text-white/70 truncate">{h.label}</p>
                  <p className="text-[10px] truncate" style={{ color: HEALTH_COLOR[h.status] }}>
                    {HEALTH_LABEL[h.status]} · <span className="text-white/30">{h.detail}</span>
                  </p>
                </div>
              </div>
            ))}
      </div>

      {/* KPI grid */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        {kpis.map((card) => {
          const Icon = card.icon;
          return (
            <Link key={card.label} to={card.to}
              className="group relative rounded-2xl p-5 transition-all duration-300 hover:-translate-y-0.5"
              style={{ background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.06)" }}>
              <div className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity"
                style={{ background: `${card.color}08`, border: `1px solid ${card.color}25` }} />
              <div className="relative">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center mb-3" style={{ background: `${card.color}15` }}>
                  <Icon className="w-4 h-4" style={{ color: card.color }} />
                </div>
                <p className="text-2xl font-semibold text-white mb-1">
                  {m.loading && m.lastUpdated === null
                    ? <span className="inline-block w-16 h-6 rounded bg-white/10 animate-pulse" />
                    : card.value}
                </p>
                <p className="text-xs text-white/35">{card.label}</p>
                <p className="text-[10px] text-white/20 mt-0.5">{card.sub}</p>
              </div>
              <ArrowRight className="absolute bottom-4 right-4 w-3.5 h-3.5 text-white/15 group-hover:text-white/40 transition-colors" />
            </Link>
          );
        })}
      </div>

      {/* Alerts */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        {alerts.map((a) => {
          const Icon = a.icon;
          const warn = a.value !== null && a.value > a.warnAbove;
          const color = warn ? "#f59e0b" : "#64748b";
          return (
            <Link key={a.label} to={a.to}
              className="rounded-2xl p-4 flex items-center gap-3 transition-all hover:-translate-y-0.5"
              style={{ background: warn ? `${color}0d` : "rgba(255,255,255,0.025)", border: `1px solid ${warn ? `${color}30` : "rgba(255,255,255,0.06)"}` }}>
              <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: `${color}18` }}>
                <Icon className="w-4 h-4" style={{ color }} />
              </div>
              <div className="min-w-0">
                <p className="text-lg font-semibold text-white leading-none">{fmtNum(a.value)}</p>
                <p className="text-xs text-white/40 mt-1">{a.label}</p>
              </div>
            </Link>
          );
        })}
      </div>

      {/* Content overview */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {content.map((card) => {
          const Icon = card.icon;
          return (
            <Link key={card.label} to={card.to}
              className="group rounded-2xl p-4 transition-all hover:-translate-y-0.5"
              style={{ background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.06)" }}>
              <div className="flex items-center gap-2 mb-2">
                <Icon className="w-3.5 h-3.5" style={{ color: card.color }} />
                <p className="text-xs text-white/35">{card.label}</p>
              </div>
              <p className="text-xl font-semibold text-white">{card.value}</p>
            </Link>
          );
        })}
      </div>

      {/* Connected businesses (cross-project federation) */}
      {fed.available && (fed.loading || fed.projects.length > 0) && (
        <div className="rounded-2xl p-6 mb-6" style={{ background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.06)" }}>
          <div className="flex items-center gap-2 mb-4">
            <Boxes className="w-3.5 h-3.5 text-white/40" />
            <h2 className="text-sm font-medium text-white/40 uppercase tracking-widest">Connected Businesses</h2>
            <span className="text-[10px] text-white/25">· across Supabase projects</span>
          </div>

          {fed.loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {Array.from({ length: 2 }).map((_, i) => (
                <div key={i} className="h-[92px] rounded-xl animate-pulse" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }} />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {fed.projects.map((p) => (
                <div key={p.key} className="rounded-xl p-4"
                  style={{ background: "rgba(255,255,255,0.02)", border: `1px solid ${p.configured ? "rgba(16,185,129,0.2)" : "rgba(255,255,255,0.08)"}` }}>
                  <div className="flex items-center gap-2 mb-3">
                    <span className="w-2 h-2 rounded-full" style={{ background: p.configured ? "#10b981" : "#64748b" }} />
                    <p className="text-sm font-medium text-white/85">{p.name}</p>
                    <span className="ml-auto text-[10px]" style={{ color: p.configured ? "#10b981" : "#64748b" }}>
                      {p.configured ? "Connected" : "Not connected"}
                    </span>
                  </div>
                  {p.configured ? (
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        { l: "Revenue", v: fmtMoney(p.revenue ?? null) },
                        { l: "Users", v: fmtNum(p.users ?? null) },
                        { l: "Content", v: fmtNum(p.content ?? null) },
                      ].map((x) => (
                        <div key={x.l}>
                          <p className="text-base font-semibold text-white leading-none">{x.v}</p>
                          <p className="text-[10px] text-white/30 mt-1">{x.l}</p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="flex items-start gap-2 text-xs text-white/40">
                      <PlugZap className="w-3.5 h-3.5 mt-0.5 shrink-0 text-white/30" />
                      <span>
                        Add <code className="text-white/60">BP_SUPABASE_URL</code> +{" "}
                        <code className="text-white/60">BP_SUPABASE_SERVICE_ROLE_KEY</code> in Vercel → Production to light this up.
                      </span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* All websites */}
      <div className="rounded-2xl p-6" style={{ background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.06)" }}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-medium text-white/40 uppercase tracking-widest">All Websites</h2>
          <Link to="/admin/create-website" className="text-xs text-primary hover:text-primary/80 transition-colors">+ Add website</Link>
        </div>
        <div className="space-y-2">
          {websites.map((site) => (
            <div key={site.id} className="flex items-center gap-3 p-3 rounded-xl"
              style={{ background: current?.id === site.id ? `${site.brand_color}10` : "transparent" }}>
              <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: site.brand_color }} />
              <div className="flex-1 min-w-0">
                <p className="text-sm text-white/80 truncate">{site.name}</p>
                {site.domain && <p className="text-xs text-white/25 truncate">{site.domain}</p>}
              </div>
              {current?.id === site.id && (
                <span className="text-[10px] px-2 py-0.5 rounded-full" style={{ background: `${site.brand_color}20`, color: site.brand_color }}>Active</span>
              )}
              <TrendingUp className="w-3.5 h-3.5 text-white/15" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
