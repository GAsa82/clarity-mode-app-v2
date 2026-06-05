import { Play, Pause, RotateCcw, Coffee, Brain } from "lucide-react";
import type { SharedTimerState } from "@/hooks/useSharedTimer";

interface Props {
  timer: SharedTimerState;
  onStart: () => void;
  onPause: () => void;
  onReset: () => void;
}

export function SharedTimer({ timer, onStart, onPause, onReset }: Props) {
  const { minutes, seconds, running, phase, completedPomodoros } = timer;

  const total   = phase === "focus" ? 25 * 60 : 5 * 60;
  const elapsed = total - (minutes * 60 + seconds);
  const pct     = Math.min(elapsed / total, 1);
  const radius  = 32;
  const circ    = 2 * Math.PI * radius;
  const dash    = circ * (1 - pct);

  return (
    <div className="flex items-center gap-4">
      {/* Ring */}
      <div className="relative w-20 h-20 shrink-0">
        <svg className="w-full h-full -rotate-90" viewBox="0 0 80 80">
          <circle cx="40" cy="40" r={radius} fill="none" strokeWidth="4" className="stroke-border" />
          <circle
            cx="40" cy="40" r={radius} fill="none" strokeWidth="4"
            className={phase === "focus" ? "stroke-primary" : "stroke-green-400"}
            strokeLinecap="round"
            strokeDasharray={circ}
            strokeDashoffset={dash}
            style={{ transition: "stroke-dashoffset 0.5s ease" }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-xs font-mono font-semibold tabular-nums">
            {String(minutes).padStart(2, "0")}:{String(seconds).padStart(2, "0")}
          </span>
          <span className="text-[8px] text-muted-foreground">{phase}</span>
        </div>
      </div>

      {/* Controls + info */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-1.5">
          {phase === "focus"
            ? <Brain className="w-3 h-3 text-primary" />
            : <Coffee className="w-3 h-3 text-green-400" />
          }
          <span className="text-[11px] capitalize font-medium">{phase} time</span>
          {completedPomodoros > 0 && (
            <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-orange-500/15 text-orange-400">
              🍅 {completedPomodoros}
            </span>
          )}
        </div>

        <div className="flex items-center gap-1">
          {running ? (
            <button onClick={onPause} className="p-1.5 rounded-lg bg-secondary border border-border hover:border-primary/40 transition-all">
              <Pause className="w-3 h-3" />
            </button>
          ) : (
            <button onClick={onStart} className="p-1.5 rounded-lg bg-primary/10 border border-primary/30 text-primary hover:bg-primary/20 transition-all">
              <Play className="w-3 h-3" />
            </button>
          )}
          <button onClick={onReset} className="p-1.5 rounded-lg bg-secondary border border-border hover:border-primary/40 transition-all">
            <RotateCcw className="w-3 h-3" />
          </button>
          <span className="text-[9px] text-muted-foreground ml-1">Shared timer</span>
        </div>
      </div>
    </div>
  );
}
