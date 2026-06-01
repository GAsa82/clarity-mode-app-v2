import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Zap } from "lucide-react";

type RoomEnergyProps = {
  activeUsers: number;
  completedSessions: number;
};

export const RoomEnergy = ({ activeUsers, completedSessions }: RoomEnergyProps) => {
  const [energy, setEnergy] = useState(30);

  useEffect(() => {
    const level = Math.min(100, 20 + activeUsers * 5 + completedSessions * 2);
    setEnergy(level);
  }, [activeUsers, completedSessions]);

  const getColor = () => {
    if (energy > 70) return "from-green-500 via-emerald-400 to-primary";
    if (energy > 40) return "from-primary via-blue-400 to-primary";
    return "from-muted-foreground/30 via-muted-foreground/20 to-muted-foreground/30";
  };

  const getLabel = () => {
    if (energy > 80) return "High Energy 🔥";
    if (energy > 50) return "Focused 🎯";
    if (energy > 20) return "Calm 🧘";
    return "Quiet 🌙";
  };

  return (
    <div className="rounded-2xl bg-card-elevated border border-border p-4">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Zap className="w-3.5 h-3.5 text-primary" />
          <p className="text-[10px] uppercase tracking-[0.2em] text-primary font-medium">Room Energy</p>
        </div>
        <span className="text-[9px] text-muted-foreground">{getLabel()}</span>
      </div>
      <div className="h-2 rounded-full bg-secondary overflow-hidden">
        <motion.div
          className={`h-full rounded-full bg-gradient-to-r ${getColor()}`}
          initial={{ width: 0 }}
          animate={{ width: `${energy}%` }}
          transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
        />
      </div>
      <div className="flex justify-between mt-1">
        <span className="text-[8px] text-muted-foreground">{energy}% energy</span>
        <span className="text-[8px] text-muted-foreground">{activeUsers} active</span>
      </div>
    </div>
  );
};