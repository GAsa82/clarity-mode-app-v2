import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Activity, UserPlus, UserMinus, Award, Flame, Sparkles } from "lucide-react";
import { getAnonymousUsername } from "@/lib/focus-streak";

type Activity = {
  id: string;
  type: "join" | "leave" | "session" | "achievement" | "streak";
  user: string;
  message: string;
  time: number;
};

const joinMessages = [
  "joined the room", "entered the focus zone", "started their session",
  "is ready to focus", "logged in for deep work",
];
const leaveMessages = ["left the room", "completed their session", "signed off"];
const sessionMessages = ["completed a focus session", "finished a Pomodoro", "crushed their deep work block"];
const achievementMessages = ["earned the First Session badge", "hit a 3-day streak", "unlocked Deep Focus Master"];

const otherUsers = ["FocusFox", "ZenSeeker", "DeepDiver", "SilentWolf", "CalmVoyager", "LaserEyes", "NightOwl", "MindfulMoose"];

let activityId = 0;

export const ActivityFeed = () => {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [collapsed, setCollapsed] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);
  const userName = getAnonymousUsername();

  useEffect(() => {
    // Initial activities
    const initial: Activity[] = [
      { id: `init-${++activityId}`, type: "join", user: "FocusFox", message: "joined the room", time: Date.now() - 60000 },
      { id: `init-${++activityId}`, type: "join", user: "ZenSeeker", message: "entered the focus zone", time: Date.now() - 30000 },
      { id: `init-${++activityId}`, type: "streak", user: "DeepDiver", message: "hit a 5-day streak", time: Date.now() - 10000 },
    ];
    setActivities(initial);
  }, []);

  // Simulate live activity
  useEffect(() => {
    const interval = setInterval(() => {
      if (Math.random() < 0.3) return;
      const isJoin = Math.random() > 0.5;
      const user = otherUsers[Math.floor(Math.random() * otherUsers.length)];
      const type = isJoin ? "join" : Math.random() > 0.6 ? "leave" : "session";
      const msgPool = type === "join" ? joinMessages : type === "leave" ? leaveMessages : sessionMessages;
      const msg = msgPool[Math.floor(Math.random() * msgPool.length)];
      const activity: Activity = {
        id: `act-${++activityId}`,
        type: type as any,
        user,
        message: msg,
        time: Date.now(),
      };
      setActivities(prev => [...prev.slice(-19), activity]);
    }, 5000 + Math.random() * 3000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
  }, [activities]);

  const getIcon = (type: string) => {
    switch (type) {
      case "join": return <UserPlus className="w-2.5 h-2.5 text-green-400" />;
      case "leave": return <UserMinus className="w-2.5 h-2.5 text-muted-foreground" />;
      case "session": return <Award className="w-2.5 h-2.5 text-primary" />;
      case "achievement": return <Sparkles className="w-2.5 h-2.5 text-yellow-400" />;
      case "streak": return <Flame className="w-2.5 h-2.5 text-orange-400" />;
      default: return <Activity className="w-2.5 h-2.5" />;
    }
  };

  return (
    <div className="rounded-2xl bg-card-elevated border border-border overflow-hidden">
      <button
        type="button"
        onClick={() => setCollapsed(!collapsed)}
        className="w-full flex items-center justify-between p-3 hover:bg-secondary/50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Activity className="w-3 h-3 text-primary" />
          <p className="text-[10px] uppercase tracking-[0.2em] text-primary font-medium">Live Activity</p>
        </div>
        <span className="text-[9px] text-muted-foreground">{activities.length}</span>
      </button>

      <AnimatePresence>
        {!collapsed && (
          <motion.div
            initial={{ height: 0 }}
            animate={{ height: "auto" }}
            exit={{ height: 0 }}
            className="overflow-hidden"
          >
            <div ref={listRef} className="h-32 overflow-y-auto px-3 pb-2 space-y-1.5 scrollbar-none">
              {activities.map((act) => (
                <motion.div
                  key={act.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="flex items-start gap-2"
                >
                  <span className="mt-0.5 shrink-0">{getIcon(act.type)}</span>
                  <p className="text-[10px] text-foreground/80 leading-relaxed">
                    <span className="font-medium text-foreground">{act.user}</span>{" "}
                    <span className="text-muted-foreground">{act.message}</span>
                  </p>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};