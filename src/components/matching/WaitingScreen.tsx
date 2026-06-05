import { motion } from "framer-motion";
import { Users, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { MatchType } from "@/lib/matching-service";

interface Props {
  matchType: MatchType;
  waitSeconds: number;
  onCancel: () => void;
}

const TYPE_LABELS: Record<MatchType, string> = {
  study:          "Study Partner",
  networking:     "Networking Partner",
  accountability: "Accountability Buddy",
  random:         "Random Partner",
};

const TIPS = [
  "Make sure your camera is ready",
  "Find a quiet spot for better focus",
  "Have your goals ready to share",
  "Put on your headphones",
  "Clear your workspace",
];

export function WaitingScreen({ matchType, waitSeconds, onCancel }: Props) {
  const mins = Math.floor(waitSeconds / 60);
  const secs = waitSeconds % 60;
  const timeStr = mins > 0 ? `${mins}:${String(secs).padStart(2, "0")}` : `${secs}s`;
  const tipIdx = Math.floor(waitSeconds / 10) % TIPS.length;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="flex flex-col items-center gap-6 py-4"
    >
      {/* Pulsing orb animation */}
      <div className="relative">
        {[0, 1, 2].map(i => (
          <motion.div
            key={i}
            className="absolute inset-0 rounded-full border border-primary/30"
            animate={{ scale: [1, 2.2 + i * 0.4], opacity: [0.6, 0] }}
            transition={{ duration: 2, repeat: Infinity, delay: i * 0.6, ease: "easeOut" }}
          />
        ))}
        <div className="relative w-16 h-16 rounded-full bg-primary/10 border border-primary/30 flex items-center justify-center">
          <Users className="w-7 h-7 text-primary" />
        </div>
      </div>

      {/* Status text */}
      <div className="text-center">
        <p className="text-sm font-medium">Finding your {TYPE_LABELS[matchType]}</p>
        <p className="text-xs text-muted-foreground mt-1">Searching globally across this room</p>
        <motion.p
          key={timeStr}
          initial={{ opacity: 0.5 }}
          animate={{ opacity: 1 }}
          className="text-2xl font-mono font-light text-primary mt-3 tabular-nums"
        >
          {timeStr}
        </motion.p>
      </div>

      {/* Animated dots */}
      <div className="flex gap-1.5">
        {[0, 1, 2, 3].map(i => (
          <motion.div
            key={i}
            className="w-1.5 h-1.5 rounded-full bg-primary"
            animate={{ opacity: [0.3, 1, 0.3] }}
            transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.2 }}
          />
        ))}
      </div>

      {/* Rotating tip */}
      <motion.div
        key={tipIdx}
        initial={{ opacity: 0, y: 4 }}
        animate={{ opacity: 1, y: 0 }}
        className="px-4 py-2.5 rounded-xl bg-secondary/60 border border-border text-center"
      >
        <p className="text-[11px] text-muted-foreground">💡 {TIPS[tipIdx]}</p>
      </motion.div>

      {/* Queue info */}
      <p className="text-[10px] text-muted-foreground/60">
        You're in the queue — you'll be matched automatically
      </p>

      <Button variant="ghost" size="sm" onClick={onCancel} className="gap-1.5 text-muted-foreground">
        <X className="w-3.5 h-3.5" />Cancel search
      </Button>
    </motion.div>
  );
}
