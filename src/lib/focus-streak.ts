const STREAK_KEY = "clarity-focus-streak";
const STATS_KEY = "clarity-focus-stats";
const SESSION_KEY = "clarity-focus-sessions";

export type FocusStats = {
  todaySessions: number;
  todayMinutes: number;
  weeklySessions: number;
  weeklyMinutes: number;
  totalSessions: number;
  totalMinutes: number;
  longestStreak: number;
};

export type FocusSession = {
  date: string;
  minutes: number;
  room: string;
};

const anonymousNames = [
  "ClearMinder", "FocusFox", "ZenSeeker", "DeepDiver", "QuietStorm",
  "SilentWolf", "FlowPhoenix", "CalmVoyager", "SharpMind", "LaserEyes",
  "NoiseBreaker", "ClarityGhost", "PresentOne", "StillWater", "MindfulMoose",
  "SoloFocus", "DarkStar", "PomodoroPanda", "TimeNomad", "DeepSpace",
];

export function getAnonymousUsername(): string {
  const stored = localStorage.getItem("clarity-anon-name");
  if (stored) return stored;
  const name = anonymousNames[Math.floor(Math.random() * anonymousNames.length)];
  localStorage.setItem("clarity-anon-name", name);
  return name;
}

export function getFocusStreak(): number {
  try {
    const raw = localStorage.getItem(STREAK_KEY);
    return raw ? parseInt(raw, 10) : 0;
  } catch { return 0; }
}

export function updateFocusStreak(): number {
  const today = new Date().toDateString();
  const lastActive = localStorage.getItem("clarity-last-active");
  let streak = getFocusStreak();
  if (lastActive === today) return streak;
  const yesterday = new Date(Date.now() - 86400000).toDateString();
  if (lastActive === yesterday) {
    streak += 1;
  } else {
    streak = 1;
  }
  localStorage.setItem(STREAK_KEY, String(streak));
  localStorage.setItem("clarity-last-active", today);
  return streak;
}

export function getFocusStats(): FocusStats {
  try {
    const raw = localStorage.getItem(STATS_KEY);
    return raw ? JSON.parse(raw) : { todaySessions: 0, todayMinutes: 0, weeklySessions: 0, weeklyMinutes: 0, totalSessions: 0, totalMinutes: 0, longestStreak: 0 };
  } catch { return { todaySessions: 0, todayMinutes: 0, weeklySessions: 0, weeklyMinutes: 0, totalSessions: 0, totalMinutes: 0, longestStreak: 0 }; }
}

export function recordFocusSession(minutes: number, room: string): FocusStats {
  const stats = getFocusStats();
  const today = new Date().toDateString();
  const sessions: FocusSession[] = getSessions();
  sessions.push({ date: today, minutes, room });
  saveSessions(sessions);
  stats.totalSessions += 1;
  stats.totalMinutes += minutes;
  stats.todaySessions += 1;
  stats.todayMinutes += minutes;
  stats.weeklySessions += 1;
  stats.weeklyMinutes += minutes;
  const streak = updateFocusStreak();
  if (streak > stats.longestStreak) stats.longestStreak = streak;
  localStorage.setItem(STATS_KEY, JSON.stringify(stats));
  return stats;
}

function getSessions(): FocusSession[] {
  try { const raw = localStorage.getItem(SESSION_KEY); return raw ? JSON.parse(raw) : []; } catch { return []; }
}

function saveSessions(s: FocusSession[]) { localStorage.setItem(SESSION_KEY, JSON.stringify(s)); }

const motivationalMessages = [
  "Your focus is a superpower. Keep going.",
  "Every minute of deep work compounds.",
  "This is the version of you that finishes.",
  "The noise fades. The signal grows.",
  "One commit at a time. You're building.",
  "Stillness isn't empty. It's full of potential.",
  "The easy path is distraction. You chose the other one.",
  "Your brain is rewiring. Let it cook.",
  "This quiet moment is where breakthroughs begin.",
  "You didn't come this far to stop now.",
];

export function getMotivationalMessage(): string {
  return motivationalMessages[Math.floor(Math.random() * motivationalMessages.length)];
}