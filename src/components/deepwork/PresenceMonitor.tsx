import { useEffect, useState, type RefObject } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Activity, AlertTriangle, Camera, CheckCircle2, Eye, Hand, MonitorCheck, ScanFace, ShieldAlert,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import type { PresenceSnapshot } from "@/lib/presence-verification";
import type { FaceDetectorTier } from "@/lib/presence-detectors";
import type { AttentionCheckState } from "@/hooks/usePresenceVerification";

// ─── Status styling ──────────────────────────────────────────────────────────

const STATUS_META: Record<string, { label: string; dot: string; text: string; ring: string }> = {
  verified:  { label: "Presence Verified",    dot: "bg-emerald-400", text: "text-emerald-400", ring: "border-emerald-400/30" },
  warning:   { label: "Warning",              dot: "bg-amber-400",   text: "text-amber-400",   ring: "border-amber-400/40" },
  grace:     { label: "Grace Period Active",  dot: "bg-sky-400",     text: "text-sky-400",     ring: "border-sky-400/40" },
  at_risk:   { label: "Challenge At Risk",    dot: "bg-red-400",     text: "text-red-400",     ring: "border-red-400/50" },
  failed:    { label: "Challenge Failed",     dot: "bg-red-500",     text: "text-red-500",     ring: "border-red-500/50" },
  completed: { label: "Challenge Completed",  dot: "bg-primary",     text: "text-primary",     ring: "border-primary/40" },
  idle:      { label: "Ready",                dot: "bg-muted-foreground", text: "text-muted-foreground", ring: "border-border" },
};

const fmtClock = (s: number) => {
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
};

type Props = {
  snapshot: PresenceSnapshot | null;
  remainingSec: number;
  totalSec: number;
  videoRef: RefObject<HTMLVideoElement>;
  faceTier: FaceDetectorTier | null;
  attentionCheck: AttentionCheckState | null;
  onConfirmAttention: () => void;
};

export const PresenceMonitor = ({
  snapshot, remainingSec, totalSec, videoRef, faceTier, attentionCheck, onConfirmAttention,
}: Props) => {
  const status = snapshot?.status ?? "idle";
  const meta = STATUS_META[status] ?? STATUS_META.idle;
  const progress = totalSec > 0 ? 1 - remainingSec / totalSec : 0;

  // Live countdown for the attention check button.
  const [checkLeft, setCheckLeft] = useState(0);
  useEffect(() => {
    if (!attentionCheck) return;
    const update = () => setCheckLeft(Math.max(0, Math.ceil((attentionCheck.deadline - Date.now()) / 1000)));
    update();
    const id = window.setInterval(update, 500);
    return () => window.clearInterval(id);
  }, [attentionCheck]);

  const escalated = status === "warning" || status === "grace" || status === "at_risk";

  return (
    <div className="space-y-4">
      {/* ── Video preview + status ── */}
      <div className={`relative rounded-2xl overflow-hidden bg-card-elevated border-2 transition-colors duration-500 ${meta.ring}`}>
        <video
          ref={videoRef}
          autoPlay
          muted
          playsInline
          className="w-full aspect-[4/3] object-cover -scale-x-100"
        />

        {/* Status pill */}
        <div className="absolute top-3 left-3 flex items-center gap-2 px-3 py-1.5 rounded-full bg-black/60 backdrop-blur-md">
          <motion.span
            className={`w-2 h-2 rounded-full ${meta.dot}`}
            animate={escalated ? { scale: [1, 1.4, 1], opacity: [1, 0.6, 1] } : { scale: 1 }}
            transition={{ duration: 1, repeat: escalated ? Infinity : 0 }}
          />
          <span className={`text-[10px] font-medium ${meta.text}`}>{meta.label}</span>
        </div>

        {/* Timer */}
        <div className="absolute top-3 right-3 px-3 py-1.5 rounded-full bg-black/60 backdrop-blur-md">
          <span className="text-xs tabular-nums text-white/90">{fmtClock(remainingSec)}</span>
        </div>

        {/* Local processing badge */}
        <div className="absolute bottom-3 left-3 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-black/50 backdrop-blur-md">
          <ShieldAlert className="w-3 h-3 text-emerald-400" />
          <span className="text-[9px] text-white/80">Verified on-device · nothing recorded</span>
        </div>

        {/* ── Escalation overlay ── */}
        <AnimatePresence>
          {escalated && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 flex flex-col items-center justify-center bg-black/70 backdrop-blur-sm p-6 text-center"
            >
              <AlertTriangle className={`w-8 h-8 mb-3 ${meta.text}`} />
              <p className={`text-sm font-medium mb-1 ${meta.text}`}>{meta.label}</p>
              <p className="text-xs text-white/80 max-w-xs leading-relaxed mb-3">
                {snapshot?.statusDetail}
              </p>
              {snapshot?.countdownSec != null && (
                <div className="flex flex-col items-center gap-1">
                  <motion.p
                    key={snapshot.countdownSec}
                    initial={{ scale: 1.15, opacity: 0.7 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className={`font-display text-4xl font-light tabular-nums ${meta.text}`}
                  >
                    {fmtClock(snapshot.countdownSec)}
                  </motion.p>
                  <p className="text-[10px] text-white/60">
                    {snapshot.countdownStage === "grace"
                      ? "Grace period — take your break, then come back"
                      : "Return to the camera to keep your challenge alive"}
                  </p>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Attention check overlay ── */}
        <AnimatePresence>
          {attentionCheck && !escalated && (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 12 }}
              className="absolute inset-x-3 bottom-12 rounded-2xl bg-black/75 backdrop-blur-md border border-primary/30 p-4 text-center"
            >
              <Hand className="w-5 h-5 text-primary mx-auto mb-2" />
              <p className="text-xs text-white/90 mb-3">Quick focus check — tap to confirm you're here.</p>
              <Button variant="hero" size="sm" onClick={onConfirmAttention} className="w-full">
                <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" />
                I'm focused ({checkLeft}s)
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── Progress bar ── */}
      <div>
        <div className="flex justify-between text-[10px] text-muted-foreground mb-1.5">
          <span>Challenge progress</span>
          <span className="tabular-nums">{Math.round(progress * 100)}%</span>
        </div>
        <div className="h-1.5 rounded-full bg-secondary overflow-hidden">
          <motion.div
            className="h-full rounded-full bg-gradient-to-r from-primary to-purple-400"
            animate={{ width: `${progress * 100}%` }}
            transition={{ duration: 0.6, ease: "easeOut" }}
          />
        </div>
      </div>

      {/* ── Signal chips ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <SignalChip
          icon={ScanFace}
          label={faceTier === "none" ? "Face: n/a" : "Face"}
          ok={faceTier !== "none" && snapshot != null && snapshot.absenceSec === 0}
          muted={faceTier === "none"}
        />
        <SignalChip icon={Activity} label="Movement" ok={snapshot != null && snapshot.absenceSec === 0} />
        <SignalChip icon={Camera} label="Camera" ok={status !== "idle" && status !== "failed" && (snapshot?.cameraDrops ?? 0) === 0 ? true : status === "verified"} />
        <SignalChip icon={MonitorCheck} label="Session" ok={status === "verified" || status === "completed"} />
      </div>

      {/* ── Presence stats ── */}
      {snapshot && (
        <div className="flex items-center justify-between px-4 py-3 rounded-xl bg-secondary/50 border border-border/50">
          <div className="flex items-center gap-1.5">
            <Eye className="w-3 h-3 text-primary" />
            <span className="text-[10px] text-muted-foreground">Presence rate</span>
          </div>
          <span className={`text-xs tabular-nums font-medium ${snapshot.presentRatio >= 0.8 ? "text-emerald-400" : "text-amber-400"}`}>
            {Math.round(snapshot.presentRatio * 100)}%
          </span>
        </div>
      )}
    </div>
  );
};

// ─── SignalChip ───────────────────────────────────────────────────────────────

function SignalChip({ icon: Icon, label, ok, muted }: {
  icon: typeof Camera; label: string; ok: boolean; muted?: boolean;
}) {
  return (
    <div className={`flex items-center gap-1.5 px-2.5 py-2 rounded-xl border text-[10px] transition-colors ${
      muted ? "bg-secondary/30 border-border/40 text-muted-foreground/50"
        : ok ? "bg-emerald-400/10 border-emerald-400/20 text-emerald-400"
        : "bg-amber-400/10 border-amber-400/20 text-amber-400"
    }`}>
      <Icon className="w-3 h-3 shrink-0" />
      <span className="truncate">{label}</span>
    </div>
  );
}
