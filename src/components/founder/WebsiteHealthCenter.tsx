import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Activity, AlertOctagon, AlertTriangle, CheckCircle2, RefreshCw,
  ChevronRight, ArrowUpRight, ShieldCheck,
} from "lucide-react";
import type { HealthReport, CheckSeverity, HealthCheck } from "@/lib/health-center";

const SEVERITY_META: Record<
  CheckSeverity,
  { color: string; icon: React.ElementType; label: string }
> = {
  critical: { color: "#f43f5e", icon: AlertOctagon, label: "Critical" },
  warning: { color: "#f59e0b", icon: AlertTriangle, label: "Warning" },
  pass: { color: "#10b981", icon: CheckCircle2, label: "Passed" },
};

function ScoreRing({ score, grade }: { score: number; grade: string }) {
  const r = 52;
  const circ = 2 * Math.PI * r;
  const offset = circ - (score / 100) * circ;
  const color = score >= 80 ? "#10b981" : score >= 60 ? "#f59e0b" : "#f43f5e";

  return (
    <div className="relative w-[140px] h-[140px] shrink-0">
      <svg className="w-full h-full -rotate-90" viewBox="0 0 120 120">
        <circle cx="60" cy="60" r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="8" />
        <motion.circle
          cx="60" cy="60" r={r} fill="none" stroke={color} strokeWidth="8" strokeLinecap="round"
          strokeDasharray={circ}
          initial={{ strokeDashoffset: circ }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1, ease: [0.22, 1, 0.36, 1] }}
          style={{ filter: `drop-shadow(0 0 8px ${color}80)` }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <motion.span
          key={score}
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          className="font-display text-4xl font-light text-white leading-none"
        >
          {score}
        </motion.span>
        <span className="text-[10px] uppercase tracking-[0.2em] mt-1" style={{ color }}>
          Grade {grade}
        </span>
      </div>
    </div>
  );
}

function CheckRow({ check }: { check: HealthCheck }) {
  const [open, setOpen] = useState(false);
  const meta = SEVERITY_META[check.severity];
  const Icon = meta.icon;
  const hasDetail = !!check.fix || !!check.to;

  return (
    <div className="rounded-xl border border-white/5 overflow-hidden" style={{ background: "rgba(255,255,255,0.015)" }}>
      <button
        onClick={() => hasDetail && setOpen((o) => !o)}
        className="w-full flex items-center gap-3 px-3.5 py-2.5 text-left"
        style={{ cursor: hasDetail ? "pointer" : "default" }}
      >
        <Icon className="w-4 h-4 shrink-0" style={{ color: meta.color }} />
        <div className="flex-1 min-w-0">
          <p className="text-sm text-white/85 truncate">{check.label}</p>
          <p className="text-[11px] text-white/35 truncate">{check.detail}</p>
        </div>
        <span
          className="hidden sm:inline-block text-[9px] uppercase tracking-wider px-2 py-0.5 rounded-full shrink-0"
          style={{ background: `${meta.color}18`, color: meta.color }}
        >
          {check.category}
        </span>
        {hasDetail && (
          <ChevronRight className={`w-3.5 h-3.5 text-white/25 shrink-0 transition-transform ${open ? "rotate-90" : ""}`} />
        )}
      </button>
      <AnimatePresence>
        {open && hasDetail && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="px-3.5 pb-3 pt-0.5 ml-7 border-l border-white/8">
              {check.fix && <p className="text-[11px] text-white/50 leading-relaxed pl-3">{check.fix}</p>}
              {check.to && (
                <Link
                  to={check.to}
                  className="inline-flex items-center gap-1 ml-3 mt-2 text-[11px] text-primary hover:text-primary/80"
                >
                  Fix this <ArrowUpRight className="w-3 h-3" />
                </Link>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

interface Props {
  report: HealthReport | null;
  loading: boolean;
  onRerun: () => void;
}

export function WebsiteHealthCenter({ report, loading, onRerun }: Props) {
  const [filter, setFilter] = useState<CheckSeverity | "all">("all");

  const visible = useMemo(() => {
    if (!report) return [];
    return filter === "all" ? report.checks : report.checks.filter((c) => c.severity === filter);
  }, [report, filter]);

  const tiles: { key: CheckSeverity | "score"; label: string; value: number; color: string; icon: React.ElementType }[] =
    [
      { key: "score", label: "Health Score", value: report?.score ?? 0, color: "#6366f1", icon: Activity },
      { key: "critical", label: "Critical Issues", value: report?.counts.critical ?? 0, color: "#f43f5e", icon: AlertOctagon },
      { key: "warning", label: "Warnings", value: report?.counts.warning ?? 0, color: "#f59e0b", icon: AlertTriangle },
      { key: "pass", label: "Passed Checks", value: report?.counts.pass ?? 0, color: "#10b981", icon: CheckCircle2 },
    ];

  return (
    <div className="rounded-3xl p-6 md:p-7 relative overflow-hidden"
      style={{ background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.07)" }}>
      <div className="absolute -top-24 -right-24 w-64 h-64 rounded-full blur-3xl pointer-events-none"
        style={{ background: "radial-gradient(circle, rgba(99,102,241,0.12), transparent 70%)" }} />

      <div className="relative flex items-center justify-between mb-6">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: "rgba(99,102,241,0.15)" }}>
            <ShieldCheck className="w-4.5 h-4.5 text-primary" strokeWidth={1.5} />
          </div>
          <div>
            <h2 className="font-display text-lg font-light text-white">Website Health Center</h2>
            <p className="text-[11px] text-white/35">
              {report ? `Audited ${new Date(report.generatedAt).toLocaleTimeString()}` : "Live diagnostics"}
            </p>
          </div>
        </div>
        <button
          onClick={onRerun}
          disabled={loading}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs text-white/60 hover:text-white border border-white/8 hover:border-white/15 transition-all disabled:opacity-50"
          style={{ background: "rgba(255,255,255,0.03)" }}
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          {loading ? "Scanning…" : "Re-run"}
        </button>
      </div>

      {/* Score + tiles */}
      <div className="relative grid grid-cols-1 md:grid-cols-[auto_1fr] gap-6 items-center mb-6">
        <ScoreRing score={report?.score ?? 0} grade={report?.grade ?? "—"} />
        <div className="grid grid-cols-2 sm:grid-cols-2 gap-3">
          {tiles.slice(1).map((t) => {
            const Icon = t.icon;
            const active = filter === t.key;
            return (
              <button
                key={t.key}
                onClick={() => setFilter(active ? "all" : (t.key as CheckSeverity))}
                className="rounded-2xl p-4 text-left transition-all duration-200"
                style={{
                  background: active ? `${t.color}12` : "rgba(255,255,255,0.02)",
                  border: `1px solid ${active ? `${t.color}40` : "rgba(255,255,255,0.06)"}`,
                }}
              >
                <div className="flex items-center justify-between mb-2">
                  <Icon className="w-4 h-4" style={{ color: t.color }} />
                  {t.key !== "score" && (
                    <span className="text-[9px] uppercase tracking-wider text-white/25">{active ? "filtered" : "filter"}</span>
                  )}
                </div>
                <p className="text-2xl font-semibold text-white">
                  {loading ? <span className="inline-block w-6 h-5 rounded bg-white/10 animate-pulse" /> : t.value}
                </p>
                <p className="text-[11px] text-white/40 mt-0.5">{t.label}</p>
              </button>
            );
          })}
        </div>
      </div>

      {/* Filter bar */}
      <div className="relative flex items-center gap-2 mb-3">
        {(["all", "critical", "warning", "pass"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`text-[11px] px-2.5 py-1 rounded-full capitalize transition-colors ${
              filter === f ? "text-white" : "text-white/35 hover:text-white/70"
            }`}
            style={{ background: filter === f ? "rgba(255,255,255,0.08)" : "transparent" }}
          >
            {f === "pass" ? "passed" : f}
          </button>
        ))}
      </div>

      {/* Checks */}
      <div className="relative space-y-1.5 max-h-[340px] overflow-y-auto pr-1 [scrollbar-width:thin]">
        {loading && !report ? (
          [...Array(5)].map((_, i) => (
            <div key={i} className="h-12 rounded-xl bg-white/5 animate-pulse" />
          ))
        ) : visible.length === 0 ? (
          <p className="text-sm text-white/30 py-6 text-center">No checks in this category.</p>
        ) : (
          visible.map((c) => <CheckRow key={c.id} check={c} />)
        )}
      </div>
    </div>
  );
}
