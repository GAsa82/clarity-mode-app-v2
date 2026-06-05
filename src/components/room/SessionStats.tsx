import { Clock, CheckCircle2, Zap } from "lucide-react";

interface Props {
  durationSeconds: number;
  completedPomodoros: number;
  totalFocusMinutes: number;
  matchType: string;
}

export function SessionStats({ durationSeconds, completedPomodoros, totalFocusMinutes, matchType }: Props) {
  const hours   = Math.floor(durationSeconds / 3600);
  const mins    = Math.floor((durationSeconds % 3600) / 60);
  const timeStr = hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;

  return (
    <div className="flex items-center gap-4 text-[10px] text-muted-foreground">
      <div className="flex items-center gap-1">
        <Clock className="w-3 h-3" />
        <span className="tabular-nums">{timeStr}</span>
      </div>
      {completedPomodoros > 0 && (
        <div className="flex items-center gap-1">
          <Zap className="w-3 h-3 text-orange-400" />
          <span>{completedPomodoros} pomodoro{completedPomodoros !== 1 ? "s" : ""}</span>
        </div>
      )}
      {totalFocusMinutes > 0 && (
        <div className="flex items-center gap-1">
          <CheckCircle2 className="w-3 h-3 text-green-400" />
          <span>{totalFocusMinutes}m focused</span>
        </div>
      )}
      <span className="capitalize px-2 py-0.5 rounded-full bg-primary/10 text-primary">{matchType}</span>
    </div>
  );
}
