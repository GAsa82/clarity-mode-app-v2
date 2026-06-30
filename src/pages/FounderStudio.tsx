import { useEffect, useState, useCallback, useRef } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Zap, LogOut, Check, ArrowUpRight, Layers, Image as ImageIcon, Brain,
  FileClock, Wallet, Settings, Eye, Download, Target,
  Upload, BookMarked, Store, Shield, BookOpen, NotebookPen, Globe,
  FileDown, Sparkles,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useWebsite, type Website } from "@/contexts/WebsiteContext";
import { supabase, isSupabaseReady } from "@/lib/supabase";
import {
  runHealthAudit, saveReportSnapshot, getReportHistory,
  type HealthReport, type ReportSnapshot,
} from "@/lib/health-center";
import { WebsiteHealthCenter } from "@/components/founder/WebsiteHealthCenter";
import { AICommandCenter } from "@/components/founder/AICommandCenter";
import logoImg from "@/assets/logo.png";

// ── Website switcher (premium segmented control) ───────────────────────────────
function WebsiteSwitcher() {
  const { websites, current, switchWebsite } = useWebsite();
  return (
    <div
      className="inline-flex items-center gap-1 p-1 rounded-2xl"
      style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)" }}
    >
      {websites.map((site) => {
        const active = current?.id === site.id;
        return (
          <button
            key={site.id}
            onClick={() => switchWebsite(site)}
            className="relative flex items-center gap-2 px-4 py-2 rounded-xl text-sm transition-colors"
            style={{ color: active ? "#fff" : "rgba(255,255,255,0.45)" }}
          >
            {active && (
              <motion.div
                layoutId="siteSwitchActive"
                className="absolute inset-0 rounded-xl"
                style={{ background: `${site.brand_color}22`, border: `1px solid ${site.brand_color}50` }}
                transition={{ type: "spring", stiffness: 400, damping: 32 }}
              />
            )}
            <span className="relative w-2 h-2 rounded-full" style={{ background: site.brand_color }} />
            <span className="relative font-medium whitespace-nowrap">{site.name}</span>
            {active && <Check className="relative w-3.5 h-3.5" style={{ color: site.brand_color }} />}
          </button>
        );
      })}
    </div>
  );
}

// ── KPI tile ───────────────────────────────────────────────────────────────────
function Kpi({
  icon: Icon, label, value, sub, color, loading,
}: { icon: React.ElementType; label: string; value: string; sub: string; color: string; loading: boolean }) {
  return (
    <div
      className="relative rounded-2xl p-5 overflow-hidden group"
      style={{ background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.06)" }}
    >
      <div className="absolute -top-10 -right-10 w-28 h-28 rounded-full blur-2xl opacity-40 group-hover:opacity-70 transition-opacity"
        style={{ background: `radial-gradient(circle, ${color}, transparent 70%)` }} />
      <div className="relative">
        <div className="w-9 h-9 rounded-xl flex items-center justify-center mb-3" style={{ background: `${color}18` }}>
          <Icon className="w-4 h-4" style={{ color }} strokeWidth={1.5} />
        </div>
        <p className="font-display text-2xl font-light text-white">
          {loading ? <span className="inline-block w-16 h-6 rounded bg-white/10 animate-pulse" /> : value}
        </p>
        <p className="text-xs text-white/40 mt-1">{label}</p>
        <p className="text-[10px] text-white/25 mt-0.5">{sub}</p>
      </div>
    </div>
  );
}

// ── Module card ──────────────────────────────────────────────────────────────
type Module = {
  to?: string;
  onClick?: () => void;
  icon: React.ElementType;
  title: string;
  desc: string;
  color: string;
  badge?: string;
};

function ModuleCard({ m }: { m: Module }) {
  const Icon = m.icon;
  const inner = (
    <>
      <div className="absolute inset-0 rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"
        style={{ background: `${m.color}0a`, border: `1px solid ${m.color}33` }} />
      <div className="relative flex items-start justify-between mb-4">
        <div className="w-11 h-11 rounded-2xl flex items-center justify-center" style={{ background: `${m.color}18` }}>
          <Icon className="w-5 h-5" style={{ color: m.color }} strokeWidth={1.5} />
        </div>
        {m.badge ? (
          <span className="text-[9px] uppercase tracking-wider px-2 py-1 rounded-full" style={{ background: `${m.color}18`, color: m.color }}>
            {m.badge}
          </span>
        ) : (
          <ArrowUpRight className="w-4 h-4 text-white/20 group-hover:text-white/60 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all" />
        )}
      </div>
      <h3 className="relative font-display text-base font-light text-white mb-1">{m.title}</h3>
      <p className="relative text-xs text-white/40 leading-relaxed">{m.desc}</p>
    </>
  );

  const className =
    "group relative rounded-3xl p-5 md:p-6 transition-all duration-300 hover:-translate-y-1 block text-left w-full";
  const style = { background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.07)" };

  return m.to ? (
    <Link to={m.to} className={className} style={style}>{inner}</Link>
  ) : (
    <button onClick={m.onClick} className={className} style={style}>{inner}</button>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────
const fmtINR = (paise: number) =>
  `₹${(paise / 100).toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;
const fmtNum = (n: number) => n.toLocaleString("en-IN");

export default function FounderStudio() {
  const { user, signOut } = useAuth();
  const { current } = useWebsite();

  const [report, setReport] = useState<HealthReport | null>(null);
  const [auditing, setAuditing] = useState(false);
  const [history, setHistory] = useState<ReportSnapshot[]>([]);
  const [analytics, setAnalytics] = useState<{ revenue: number; conversions: number; orders: number } | null>(null);
  const [loadingAnalytics, setLoadingAnalytics] = useState(true);

  const switcherRef = useRef<HTMLDivElement>(null);
  const reportsRef = useRef<HTMLDivElement>(null);

  const runAudit = useCallback(async () => {
    if (!current) return;
    setAuditing(true);
    const r = await runHealthAudit(current);
    setReport(r);
    setHistory(saveReportSnapshot(r));
    setAuditing(false);
  }, [current]);

  const loadAnalytics = useCallback(async () => {
    setLoadingAnalytics(true);
    if (!isSupabaseReady()) { setAnalytics({ revenue: 0, conversions: 0, orders: 0 }); setLoadingAnalytics(false); return; }
    try {
      const { data } = await supabase.from("admin_analytics").select("*").single();
      const d = (data ?? {}) as { total_revenue_paise?: number; active_subscriptions?: number; total_orders?: number };
      setAnalytics({
        revenue: d.total_revenue_paise ?? 0,
        conversions: d.active_subscriptions ?? 0,
        orders: d.total_orders ?? 0,
      });
    } catch {
      setAnalytics({ revenue: 0, conversions: 0, orders: 0 });
    }
    setLoadingAnalytics(false);
  }, []);

  // Re-scope everything whenever the active website changes.
  useEffect(() => {
    if (!current) return;
    setHistory(getReportHistory(current.slug));
    runAudit();
    loadAnalytics();
  }, [current?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const generateReport = useCallback(async () => {
    let r = report;
    if (!r || r.websiteId !== current?.id) {
      if (!current) return;
      setAuditing(true);
      r = await runHealthAudit(current);
      setReport(r);
      setAuditing(false);
    }
    setHistory(saveReportSnapshot(r));
    // Download a JSON maintenance report.
    const blob = new Blob([JSON.stringify(r, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${r.websiteSlug}-health-report-${new Date(r.generatedAt).toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    reportsRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [report, current]);

  const scrollToSwitcher = () =>
    switcherRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });

  // Analytics KPIs — revenue/conversions are account-wide; traffic/downloads are per active site.
  const kpis = [
    { icon: Wallet, label: "Revenue", sub: "All-time, paid orders", color: "#10b981",
      value: analytics ? fmtINR(analytics.revenue) : "₹0", loading: loadingAnalytics },
    { icon: Eye, label: "Traffic", sub: `${current?.name ?? "site"} content views`, color: "#6366f1",
      value: fmtNum(report?.metrics.totalViews ?? 0), loading: auditing && !report },
    { icon: Download, label: "Downloads", sub: `${current?.name ?? "site"} asset downloads`, color: "#8b5cf6",
      value: fmtNum(report?.metrics.totalDownloads ?? 0), loading: auditing && !report },
    { icon: Target, label: "Conversions", sub: "Active subscriptions", color: "#f59e0b",
      value: analytics ? fmtNum(analytics.conversions) : "0", loading: loadingAnalytics },
  ];

  const contentSubLinks = [
    { to: "/admin/upload", icon: Upload, label: "Upload Content" },
    { to: "/admin/old-books", icon: Store, label: "Books" },
    { to: "/admin/research-papers", icon: BookMarked, label: "Research Papers" },
    { to: "/admin/documents", icon: NotebookPen, label: "Diary Pages" },
    { to: "/admin/protocols", icon: Shield, label: "Protocols" },
    { to: "/admin/site-content", icon: BookOpen, label: "Blogs" },
  ];

  const modules: Module[] = [
    { to: "/admin/media", icon: ImageIcon, title: "Media Library", desc: "Every audio, video, image, and PDF asset across the brand.", color: "#06b6d4" },
    { to: "/admin/knowledge", icon: Brain, title: "AI Knowledge Base", desc: "Indexed documents and training that power AI features.", color: "#a855f7" },
    { onClick: () => reportsRef.current?.scrollIntoView({ behavior: "smooth" }), icon: FileClock, title: "Maintenance Reports", desc: "Audit history and downloadable health reports.", color: "#f59e0b" },
    { to: "/admin/analytics", icon: Wallet, title: "Revenue Dashboard", desc: "Orders, subscriptions, and full financial breakdown.", color: "#10b981" },
    { to: "/admin/settings", icon: Settings, title: "System Settings", desc: "Domains, integrations, and environment configuration.", color: "#64748b" },
  ];

  const accent = current?.brand_color ?? "#6366f1";

  return (
    <div className="min-h-screen" style={{ background: "#07060f" }}>
      {/* Ambient background */}
      <div className="fixed inset-0 pointer-events-none" style={{
        background: "radial-gradient(ellipse 70% 40% at 50% -10%, rgba(99,102,241,0.14), transparent 70%)",
      }} />

      {/* Top bar */}
      <header
        className="sticky top-0 z-30 flex items-center gap-3 px-4 md:px-8 h-16 backdrop-blur-xl"
        style={{ background: "rgba(7,6,15,0.8)", borderBottom: "1px solid rgba(255,255,255,0.06)" }}
      >
        <Link to="/" className="flex items-center gap-2.5 shrink-0">
          <img src={logoImg} alt="logo" className="w-8 h-8 rounded-full object-cover" />
          <div className="leading-none">
            <p className="text-sm font-semibold text-white flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 text-primary" /> Founder Studio
            </p>
            <p className="text-[9px] text-white/30 uppercase tracking-[0.2em] mt-1">Business OS</p>
          </div>
        </Link>

        <div className="flex-1" />

        <Link
          to="/"
          className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs text-white/45 hover:text-white border border-white/8 hover:border-white/15 transition-all"
        >
          <Globe className="w-3.5 h-3.5" /> View site
        </Link>
        <div className="flex items-center gap-2.5 pl-2">
          <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold text-white" style={{ background: "rgba(99,102,241,0.25)" }}>
            {user?.email?.[0]?.toUpperCase() ?? "A"}
          </div>
          <div className="hidden md:block leading-none">
            <p className="text-[11px] text-white/70">{user?.email?.split("@")[0] ?? "Founder"}</p>
            <p className="text-[9px] text-white/30">Super Admin</p>
          </div>
          <button onClick={() => signOut()} className="p-2 rounded-lg hover:bg-white/8 text-white/30 hover:text-white/70 transition-colors" title="Sign out">
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      <main className="relative max-w-[1400px] mx-auto px-4 md:px-8 py-8 md:py-10">
        {/* Headline + switcher */}
        <div ref={switcherRef} className="flex flex-col lg:flex-row lg:items-end justify-between gap-5 mb-8 scroll-mt-24">
          <div>
            <motion.div
              initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
              className="inline-flex items-center gap-2 mb-3 px-3 py-1 rounded-full text-[11px]"
              style={{ background: `${accent}15`, border: `1px solid ${accent}30`, color: accent }}
            >
              <Sparkles className="w-3 h-3" /> Private operating system
            </motion.div>
            <h1 className="font-display text-3xl md:text-4xl font-light text-white tracking-tight">
              Run the entire business <span className="text-white/40">from one screen.</span>
            </h1>
            <p className="text-sm text-white/40 mt-2 max-w-xl">
              Switch between brands, audit health, command with AI, and publish content — the system handles the rest.
            </p>
          </div>
          <div className="shrink-0">
            <p className="text-[9px] uppercase tracking-[0.2em] text-white/25 mb-2">Active Website</p>
            <WebsiteSwitcher />
          </div>
        </div>

        {/* AI Command Center */}
        <div className="mb-8">
          <AICommandCenter site={current} onAudit={runAudit} onReport={generateReport} onSwitch={scrollToSwitcher} />
        </div>

        {/* Analytics KPIs */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xs font-medium text-white/40 uppercase tracking-[0.2em]">Analytics</h2>
          <Link to="/admin/analytics" className="text-[11px] text-primary hover:text-primary/80 inline-flex items-center gap-1">
            Full analytics <ArrowUpRight className="w-3 h-3" />
          </Link>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {kpis.map((k) => <Kpi key={k.label} {...k} />)}
        </div>

        {/* Health + Reports */}
        <div className="grid grid-cols-1 xl:grid-cols-[1.6fr_1fr] gap-6 mb-8">
          <WebsiteHealthCenter report={report} loading={auditing} onRerun={runAudit} />

          {/* Maintenance Reports */}
          <div ref={reportsRef} className="rounded-3xl p-6 scroll-mt-24"
            style={{ background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.07)" }}>
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: "rgba(245,158,11,0.15)" }}>
                  <FileClock className="w-4.5 h-4.5" style={{ color: "#f59e0b" }} strokeWidth={1.5} />
                </div>
                <div>
                  <h2 className="font-display text-lg font-light text-white">Maintenance Reports</h2>
                  <p className="text-[11px] text-white/35">{current?.name ?? "—"} · audit history</p>
                </div>
              </div>
            </div>

            <button
              onClick={generateReport}
              disabled={auditing}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium text-white mb-4 transition-all disabled:opacity-50"
              style={{ background: "rgba(245,158,11,0.15)", border: "1px solid rgba(245,158,11,0.35)" }}
            >
              <FileDown className="w-4 h-4" /> Generate &amp; download report
            </button>

            <div className="space-y-2 max-h-[300px] overflow-y-auto [scrollbar-width:thin]">
              {history.length === 0 ? (
                <p className="text-sm text-white/30 py-8 text-center">No reports yet. Run an audit to create one.</p>
              ) : (
                history.map((h, i) => {
                  const gColor = h.score >= 80 ? "#10b981" : h.score >= 60 ? "#f59e0b" : "#f43f5e";
                  return (
                    <div key={i} className="flex items-center gap-3 p-3 rounded-xl" style={{ background: "rgba(255,255,255,0.02)" }}>
                      <div className="w-9 h-9 rounded-lg flex items-center justify-center text-xs font-semibold shrink-0"
                        style={{ background: `${gColor}18`, color: gColor }}>
                        {h.score}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-white/70">
                          {new Date(h.generatedAt).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                        </p>
                        <p className="text-[10px] text-white/30">
                          {h.critical} critical · {h.warning} warnings · {h.pass} passed
                        </p>
                      </div>
                      <span className="text-[10px] px-2 py-0.5 rounded-full shrink-0" style={{ background: `${gColor}18`, color: gColor }}>
                        Grade {h.grade}
                      </span>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* Content Studio — featured */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xs font-medium text-white/40 uppercase tracking-[0.2em]">Workspaces</h2>
        </div>
        <Link
          to="/admin/content-studio"
          className="group relative block rounded-3xl p-6 md:p-7 mb-4 overflow-hidden transition-all duration-300 hover:-translate-y-1"
          style={{ background: `linear-gradient(135deg, ${accent}14, rgba(255,255,255,0.02) 60%)`, border: `1px solid ${accent}30` }}
        >
          <div className="absolute -top-16 -right-10 w-56 h-56 rounded-full blur-3xl opacity-50"
            style={{ background: `radial-gradient(circle, ${accent}, transparent 70%)` }} />
          <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-5">
            <div className="max-w-lg">
              <div className="flex items-center gap-2.5 mb-3">
                <div className="w-11 h-11 rounded-2xl flex items-center justify-center" style={{ background: `${accent}22` }}>
                  <Layers className="w-5 h-5" style={{ color: accent }} strokeWidth={1.5} />
                </div>
                <div>
                  <h3 className="font-display text-xl font-light text-white">Content Studio</h3>
                  <p className="text-[11px] text-white/40">Upload once — the system publishes everywhere.</p>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                {contentSubLinks.map((s) => {
                  const Icon = s.icon;
                  return (
                    <Link
                      key={s.to}
                      to={s.to}
                      onClick={(e) => e.stopPropagation()}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs text-white/55 hover:text-white border border-white/8 hover:border-white/20 transition-all"
                      style={{ background: "rgba(255,255,255,0.03)" }}
                    >
                      <Icon className="w-3.5 h-3.5" /> {s.label}
                    </Link>
                  );
                })}
              </div>
            </div>
            <div className="shrink-0 inline-flex items-center gap-1.5 text-sm font-medium" style={{ color: accent }}>
              Open Studio <ArrowUpRight className="w-4 h-4 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
            </div>
          </div>
        </Link>

        {/* Module grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-10">
          {modules.map((m) => <ModuleCard key={m.title} m={m} />)}
        </div>

        <p className="text-center text-[11px] text-white/20 pb-6">
          Founder Studio · {user?.email} · {report ? `Last audit ${new Date(report.generatedAt).toLocaleString()}` : "Initializing…"}
        </p>
      </main>
    </div>
  );
}
