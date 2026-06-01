import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Award, Sparkles } from "lucide-react";
import { getAchievements, type Achievement } from "@/lib/achievements";

type AchievementPanelProps = {
  newAchievement?: Achievement | null;
  onDismiss?: () => void;
};

export const AchievementPanel = ({ newAchievement, onDismiss }: AchievementPanelProps) => {
  const [collapsed, setCollapsed] = useState(false);
  const [achievements, setAchievements] = useState<Achievement[]>([]);

  useEffect(() => {
    setAchievements(getAchievements());
  }, [newAchievement]);

  const unlocked = achievements.filter(a => a.unlocked).length;

  return (
    <div className="rounded-2xl bg-card-elevated border border-border overflow-hidden">
      <button
        type="button"
        onClick={() => setCollapsed(!collapsed)}
        className="w-full flex items-center justify-between p-3 hover:bg-secondary/50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Award className="w-3 h-3 text-primary" />
          <p className="text-[10px] uppercase tracking-[0.2em] text-primary font-medium">Achievements</p>
        </div>
        <span className="text-[9px] text-muted-foreground">{unlocked}/{achievements.length}</span>
      </button>

      <AnimatePresence>
        {!collapsed && (
          <motion.div
            initial={{ height: 0 }}
            animate={{ height: "auto" }}
            exit={{ height: 0 }}
            className="overflow-hidden"
          >
            <div className="px-3 pb-3 space-y-1.5">
              {achievements.map((a) => (
                <div
                  key={a.id}
                  className={`flex items-center gap-2 p-2 rounded-xl transition-all ${
                    a.unlocked ? "bg-primary/5" : "opacity-40"
                  }`}
                >
                  <span className="text-base">{a.icon}</span>
                  <div className="min-w-0 flex-1">
                    <p className={`text-[10px] font-medium ${a.unlocked ? "text-foreground" : "text-muted-foreground"}`}>
                      {a.name}
                    </p>
                    <p className="text-[8px] text-muted-foreground">{a.description}</p>
                  </div>
                  {a.unlocked && <Sparkles className="w-2.5 h-2.5 text-yellow-400 shrink-0" />}
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* New achievement celebration */}
      <AnimatePresence>
        {newAchievement && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.9 }}
            className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50"
          >
            <div className="rounded-2xl bg-card-elevated border border-yellow-500/30 shadow-glow p-4 text-center">
              <motion.div
                animate={{ rotate: [0, -10, 10, -5, 5, 0] }}
                transition={{ duration: 0.6 }}
                className="text-3xl mb-2"
              >
                {newAchievement.icon}
              </motion.div>
              <p className="text-[10px] uppercase tracking-[0.2em] text-yellow-400 mb-1">Achievement Unlocked!</p>
              <p className="font-display text-sm font-medium">{newAchievement.name}</p>
              <p className="text-[10px] text-muted-foreground mt-1">{newAchievement.description}</p>
              <button
                type="button"
                onClick={onDismiss}
                className="mt-3 text-[9px] text-primary hover:underline"
              >
                Dismiss
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};