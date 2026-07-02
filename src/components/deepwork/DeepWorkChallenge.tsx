import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Award, Flag, FlaskConical, Loader2, Play, RotateCcw, ShieldCheck, Square, Trophy, X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { PresenceConsentDialog } from "./PresenceConsentDialog";
import { PresenceMonitor } from "./PresenceMonitor";
import { usePresenceVerification, type ChallengeResult } from "@/hooks/usePresenceVerification";
import {
  hasPresenceConsent, loadPresenceConfig, PRESENCE_DEFAULTS, type PresenceConfig,
} from "@/lib/presence-verification";
import { recordFocusSession, type FocusStats } from "@/lib/focus-streak";

type Props = {
  roomSlug: string;
  roomName: string;
  onRewardEarned?: (stats: FocusStats) => void;
};

export const DeepWorkChallenge = ({ roomSlug, roomName, onRewardEarned }: Props) => {
  const [cfg, setCfg] = useState<PresenceConfig>(PRESENCE_DEFAULTS);
  const [durationMin, setDurationMin] = useState(PRESENCE_DEFAULTS.challengeDurationsMin[0]);
  const [consentOpen, setConsentOpen] = useState(false);
  const [confirmEnd, setConfirmEnd] = useState(false);

  useEffect(() => {
    loadPresenceConfig().then((c) => {
      setCfg(c);
      if (c.challengeDurationsMin.length) setDurationMin(c.challengeDurationsMin[0]);
    });
  }, []);

  const pv = usePresenceVerification({
    roomSlug,
    durationMin,
    onComplete: (res: ChallengeResult) => {
      if (res.rewarded) {
        const stats = recordFocusSession(res.rewardMinutes, `${roomName} · Challenge`);
        onRewardEarned?.(stats);
      }
    },
  });

  const beginChallenge = () => {
    if (!hasPresenceConsent()) setConsentOpen(true);
    else void pv.start();
  };

  const totalSec = durationMin * 60;

  return (
    <div className="rounded-3xl bg-card-elevated border border-primary/20 p-5 md:p-6 relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,hsl(270_80%_60%/0.08),transparent_60%)] pointer-events-none" />

      {/* Header */}
      <div className="relative flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center">
            <FlaskConical className="w-4 h-4 text-primary" />
          </div>
          <div>
            <p className="text-sm font-medium">Deep Work Challenge</p>
            <p className="text-[10px] text-muted-foreground">Verified focus · {cfg.rewardMultiplier}× streak credit</p>
          </div>
        </div>
        {pv.phase === "active" && (
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-400/10 border border-emerald-400/20">
            <ShieldCheck className="w-3 h-3 text-emerald-400" />
            <span className="text-[9px] text-emerald-400">Verifying</span>
          </div>
        )}
      </div>

      <AnimatePresence mode="wait">
        {/* ── Setup ── */}
        {pv.phase === "idle" && (
          <motion.div key="setup" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="relative">
            <p className="text-xs text-muted-foreground leading-relaxed mb-4">
              Commit to an uninterrupted deep work block. Your presence is verified
              on-device via camera — finish the challenge and earn{" "}
              <span className="text-primary font-medium">{cfg.rewardMultiplier}× focus credit</span>.
              Breaks are fine: you always get a warning and a grace period first.
            </p>

            <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground mb-2">Challenge length</p>
            <div className="flex gap-2 mb-5">
              {cfg.challengeDurationsMin.map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setDurationMin(m)}
                  className={`flex-1 px-3 py-2.5 rounded-xl border text-xs transition-all ${
                    durationMin === m
                      ? "bg-primary/15 border-primary/40 text-primary font-medium"
                      : "bg-secondary/50 border-border text-muted-foreground hover:border-primary/25"
                  }`}
                >
                  {m} min
                </button>
              ))}
            </div>

            {pv.error && (
              <div className="mb-4 px-3 py-2 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-[11px]">
                {pv.error}
              </div>
            )}

            <Button variant="hero" className="w-full" onClick={beginChallenge}>
              <Play className="w-4 h-4 mr-2" />
              Start verified challenge
            </Button>
            <p className="text-[9px] text-muted-foreground/60 text-center mt-2">
              Camera required · processed locally · nothing recorded
            </p>
          </motion.div>
        )}

        {/* ── Requesting camera ── */}
        {pv.phase === "requesting" && (
          <motion.div key="req" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="relative py-10 text-center">
            <Loader2 className="w-6 h-6 text-primary mx-auto mb-3 animate-spin" />
            <p className="text-xs text-muted-foreground">Starting camera & loading on-device verification…</p>
          </motion.div>
        )}

        {/* ── Active ── */}
        {pv.phase === "active" && (
          <motion.div key="active" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="relative">
            <PresenceMonitor
              snapshot={pv.snapshot}
              remainingSec={pv.remainingSec}
              totalSec={totalSec}
              videoRef={pv.videoRef}
              faceTier={pv.faceTier}
              attentionCheck={pv.attentionCheck}
              onConfirmAttention={pv.confirmAttention}
            />

            <div className="mt-4">
              {!confirmEnd ? (
                <Button variant="glass" size="sm" className="w-full" onClick={() => setConfirmEnd(true)}>
                  <Square className="w-3 h-3 mr-1.5" />
                  End challenge early
                </Button>
              ) : (
                <div className="flex gap-2">
                  <Button variant="glass" size="sm" className="flex-1" onClick={() => setConfirmEnd(false)}>
                    <X className="w-3 h-3 mr-1.5" />Keep going
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    className="flex-1"
                    onClick={() => { setConfirmEnd(false); pv.stop(); }}
                  >
                    End without credit
                  </Button>
                </div>
              )}
            </div>
          </motion.div>
        )}

        {/* ── Completed ── */}
        {pv.phase === "completed" && pv.result && (
          <motion.div key="done" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="relative text-center py-6">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 200, damping: 12, delay: 0.1 }}
              className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-primary/20 to-purple-500/20 border border-primary/30 flex items-center justify-center"
            >
              <Trophy className="w-8 h-8 text-primary" />
            </motion.div>
            <p className="font-display text-2xl font-light text-gradient mb-1">Challenge Completed</p>
            <p className="text-xs text-muted-foreground mb-4">
              {Math.round(pv.result.presentRatio * 100)}% verified presence over {pv.result.minutes} minutes
            </p>

            {pv.result.rewarded ? (
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-400/10 border border-emerald-400/20 mb-5">
                <Award className="w-4 h-4 text-emerald-400" />
                <span className="text-xs text-emerald-400 font-medium">
                  +{pv.result.rewardMinutes} min focus credit earned
                </span>
              </div>
            ) : (
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-amber-400/10 border border-amber-400/20 mb-5">
                <Flag className="w-4 h-4 text-amber-400" />
                <span className="text-[11px] text-amber-400">
                  Completed, but presence was too low for bonus credit this time.
                </span>
              </div>
            )}

            <Button variant="hero" size="sm" onClick={pv.reset} className="w-full">
              <RotateCcw className="w-3.5 h-3.5 mr-1.5" />
              Start another challenge
            </Button>
          </motion.div>
        )}

        {/* ── Failed ── */}
        {pv.phase === "failed" && (
          <motion.div key="failed" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="relative text-center py-6">
            <div className="w-14 h-14 mx-auto mb-4 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center">
              <X className="w-7 h-7 text-red-400" />
            </div>
            <p className="font-display text-xl font-light mb-1">Challenge ended</p>
            <p className="text-xs text-muted-foreground max-w-xs mx-auto mb-1 leading-relaxed">
              {pv.snapshot?.statusDetail || "Presence couldn't be verified."}
            </p>
            <p className="text-[11px] text-muted-foreground/70 mb-5">
              No stress — deep work is a practice. Reset and try a shorter block.
            </p>
            <Button variant="hero" size="sm" onClick={pv.reset} className="w-full">
              <RotateCcw className="w-3.5 h-3.5 mr-1.5" />
              Try again
            </Button>
          </motion.div>
        )}
      </AnimatePresence>

      <PresenceConsentDialog
        open={consentOpen}
        onOpenChange={setConsentOpen}
        onConsent={() => void pv.start()}
      />
    </div>
  );
};
