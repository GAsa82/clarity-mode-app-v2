const ACHIEVEMENTS_KEY = "clarity-achievements";

export type Achievement = {
  id: string;
  name: string;
  description: string;
  icon: string;
  unlocked: boolean;
  unlockedAt?: string;
};

const allAchievements: Achievement[] = [
  { id: "first-session", name: "First Session", description: "Complete your first focus session", icon: "🌟", unlocked: false },
  { id: "hour-5", name: "5 Hour Grind", description: "Complete 5 hours of focused work", icon: "⏰", unlocked: false },
  { id: "midnight-warrior", name: "Midnight Warrior", description: "Focus after midnight", icon: "🌙", unlocked: false },
  { id: "streak-7", name: "7 Day Streak", description: "Focus 7 days in a row", icon: "🔥", unlocked: false },
  { id: "deep-focus-master", name: "Deep Focus Master", description: "Complete 50 focus sessions", icon: "🧠", unlocked: false },
  { id: "social-butterfly", name: "Social Butterfly", description: "Join 5 different focus rooms", icon: "🦋", unlocked: false },
  { id: "early-bird", name: "Early Bird", description: "Focus before 6 AM", icon: "🌅", unlocked: false },
  { id: "focus-marathon", name: "Focus Marathon", description: "Complete a 90-min focus session", icon: "🏃", unlocked: false },
];

export function getAchievements(): Achievement[] {
  try {
    const raw = localStorage.getItem(ACHIEVEMENTS_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return allAchievements;
}

export function unlockAchievement(id: string): Achievement | null {
  const list = getAchievements();
  const ach = list.find(a => a.id === id);
  if (!ach || ach.unlocked) return null;
  ach.unlocked = true;
  ach.unlockedAt = new Date().toISOString();
  localStorage.setItem(ACHIEVEMENTS_KEY, JSON.stringify(list));
  return ach;
}

export function checkAndUnlockAchievements(
  sessions: number,
  totalMinutes: number,
  streak: number,
  visitedRooms: number,
  sessionMinutes = 0,
): Achievement[] {
  const newlyUnlocked: Achievement[] = [];
  if (sessions >= 1) {
    const ach = unlockAchievement("first-session");
    if (ach) newlyUnlocked.push(ach);
  }
  const hour = new Date().getHours();
  if (hour < 4) {
    const ach = unlockAchievement("midnight-warrior");
    if (ach) newlyUnlocked.push(ach);
  }
  if (hour >= 4 && hour < 6) {
    const ach = unlockAchievement("early-bird");
    if (ach) newlyUnlocked.push(ach);
  }
  if (sessionMinutes >= 90) {
    const ach = unlockAchievement("focus-marathon");
    if (ach) newlyUnlocked.push(ach);
  }
  if (totalMinutes >= 300) {
    const ach = unlockAchievement("hour-5");
    if (ach) newlyUnlocked.push(ach);
  }
  if (streak >= 7) {
    const ach = unlockAchievement("streak-7");
    if (ach) newlyUnlocked.push(ach);
  }
  if (sessions >= 50) {
    const ach = unlockAchievement("deep-focus-master");
    if (ach) newlyUnlocked.push(ach);
  }
  if (visitedRooms >= 5) {
    const ach = unlockAchievement("social-butterfly");
    if (ach) newlyUnlocked.push(ach);
  }
  return newlyUnlocked;
}