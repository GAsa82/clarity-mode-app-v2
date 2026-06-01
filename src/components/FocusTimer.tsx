import { useState, useEffect, useRef, useCallback } from "react";
import { motion } from "framer-motion";
import { Play, Pause, RotateCcw, Coffee } from "lucide-react";

type FocusTimerProps = {
  modes: { label: string; focus: number; break: number }[];
  onSessionComplete?: (type: "focus" | "break") => void;
  onPhaseChange?: (phase: "focus" | "break") => void;
  externalRunning?: boolean;
  externalToggle?: () => void;
};

export const FocusTimer = ({ modes, onSessionComplete, onPhaseChange, externalRunning, externalToggle }: FocusTimerProps) => {
  const [modeIndex, setModeIndex] = useState(0);
  const [phase, setPhase] = useState<"focus" | "break">("focus");
  const [running, setRunning] = useState(false);
  const [seconds, setSeconds] = useState(modes[0].focus * 60);
  const [completedSessions, setCompletedSessions] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const mode = modes[modeIndex];
  const totalSeconds = phase === "focus" ? mode.focus * 60 : mode.break * 60;
  const progress = 1 - seconds / totalSeconds;
  const mm = String(Math.floor(seconds / 60)).padStart(2, "0");
  const ss = String(seconds % 60).padStart(2, "0");

  const clearTimer = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const toggle = useCallback(() => {
    setRunning((prev) => !prev);
  }, []);

  const reset = useCallback(() => {
    clearTimer();
    setRunning(false);
    setSeconds(mode.focus * 60);
    setPhase("focus");
  }, [clearTimer, mode]);

  const switchMode = useCallback(
    (index: number) => {
      clearTimer();
      setRunning(false);
      setModeIndex(index);
      const m = modes[index];
      setSeconds(m.focus * 60);
      setPhase("focus");
    },
    [clearTimer, modes],
  );

  useEffect(() => {
    if (!running) {
      clearTimer();
      return;
    }
    intervalRef.current = setInterval(() => {
      setSeconds((prev) => {
        if (prev <= 1) {
          clearTimer();
          setRunning(false);
          if (phase === "focus") {
            onSessionComplete?.("focus");
            setPhase("break");
            setCompletedSessions((c) => c + 1);
            return mode.break * 60;
          } else {
            onSessionComplete?.("break");
            setPhase("focus");
            return mode.focus * 60;
          }
        }
        return prev - 1;
      });
    }, 1000);
    return clearTimer;
  }, [running, phase, mode, clearTimer, onSessionComplete]);

  // Reset timer if mode changes while running
  useEffect(() => {
    if (!running) {
      setSeconds(mode.focus * 60);
      setPhase("focus");
    }
  }, [modeIndex]);

  return (
    <div className="flex flex-col items-center">
      {/* Mode selector */}
      <div className="flex gap-2 mb-6">
        {modes.map((m, i) => (
          <button
            key={m.label}
            type="button"
            onClick={() => switchMode(i)}
            className={`px-4 py-1.5 rounded-full text-[11px] uppercase tracking-[0.15em] transition-all ${
              i === modeIndex
                ? "bg-primary/20 text-primary border border-primary/40"
                : "bg-secondary text-muted-foreground border border-transparent hover:border-border"
            }`}
          >
            {m.label}
          </button>
        ))}
      </div>

      {/* Timer display */}
      <div className="relative mb-6">
        {/* Progress ring background */}
        <svg className="w-44 h-44 -rotate-90" viewBox="0 0 100 100">
          <circle
            cx="50"
            cy="50"
            r="45"
            fill="none"
            stroke="hsl(220 20% 14%)"
            strokeWidth="4"
          />
          <motion.circle
            cx="50"
            cy="50"
            r="45"
            fill="none"
            stroke={phase === "focus" ? "hsl(215 90% 62%)" : "hsl(145 60% 50%)"}
            strokeWidth="4"
            strokeDasharray={`${2 * Math.PI * 45}`}
            strokeDashoffset={`${2 * Math.PI * 45 * (1 - progress)}`}
            strokeLinecap="round"
            transition={{ duration: 0.5, ease: "linear" }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="font-display text-5xl font-light tabular-nums text-gradient">
            {mm}:{ss}
          </span>
          <span className="text-[10px] uppercase tracking-[0.25em] text-muted-foreground mt-1">
            {phase === "focus" ? "Focus" : "Break"}
          </span>
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center gap-3 mb-4">
        <motion.button
          type="button"
          whileTap={{ scale: 0.92 }}
          onClick={toggle}
          className="flex h-12 w-12 items-center justify-center rounded-full bg-primary-gradient text-primary-foreground shadow-glow"
          aria-label={running ? "Pause" : "Start"}
        >
          {running ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 ml-0.5 fill-current" />}
        </motion.button>
        <motion.button
          type="button"
          whileTap={{ scale: 0.92 }}
          onClick={reset}
          className="flex h-9 w-9 items-center justify-center rounded-full bg-secondary text-muted-foreground hover:text-foreground transition-colors"
          aria-label="Reset"
        >
          <RotateCcw className="w-4 h-4" />
        </motion.button>
      </div>

      {/* Session counter */}
      <div className="flex items-center gap-2">
        <Coffee className="w-3 h-3 text-muted-foreground" />
        <span className="text-[10px] text-muted-foreground">
          {completedSessions} session{completedSessions !== 1 ? "s" : ""} completed
        </span>
      </div>

      {/* Phase indicator */}
      {phase === "break" && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-4 px-4 py-2 rounded-full bg-green-500/10 border border-green-500/20"
        >
          <p className="text-[11px] text-green-400">Break time — rest your mind.</p>
        </motion.div>
      )}
    </div>
  );
};