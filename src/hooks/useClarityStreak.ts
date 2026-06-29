import { useCallback, useEffect, useState } from "react";

/**
 * Zero-cost retention engine. Tracks a daily-visit streak, total "clarity
 * moments", and the companion's evolution stage — all in localStorage.
 * No backend, no auth, no API cost.
 */

const KEY = "clarity-streak-v1";

type ClarityState = {
  streak: number;
  lastVisit: string; // YYYY-MM-DD (local)
  moments: number;
  firstVisit: string;
};

const todayKey = (d = new Date()) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate()
  ).padStart(2, "0")}`;

const daysBetween = (a: string, b: string) => {
  const da = new Date(`${a}T00:00:00`).getTime();
  const db = new Date(`${b}T00:00:00`).getTime();
  return Math.round((db - da) / 86_400_000);
};

export const milestoneLabel = (streak: number) => {
  if (streak >= 100) return "100 Days of Calm";
  if (streak >= 60) return "60 Days of Growth";
  if (streak >= 30) return "30 Days of Focus";
  if (streak >= 14) return "14 Days of Courage";
  if (streak >= 7) return "7 Days of Clarity";
  return `Day ${streak} of Clarity`;
};

const STAGE_TITLES = [
  "New companion",
  "Your companion",
  "Expressive guide",
  "Mentor companion",
  "Legendary companion",
];

export const stageForStreak = (streak: number) => {
  let level = 0;
  if (streak >= 100) level = 4;
  else if (streak >= 60) level = 3;
  else if (streak >= 30) level = 2;
  else if (streak >= 7) level = 1;
  return { level, title: STAGE_TITLES[level] };
};

export function useClarityStreak() {
  const [state, setState] = useState<ClarityState | null>(null);
  const [justReturned, setJustReturned] = useState(false);

  useEffect(() => {
    const today = todayKey();
    let s: ClarityState | null = null;
    try {
      s = JSON.parse(localStorage.getItem(KEY) || "null");
    } catch {
      s = null;
    }

    if (!s || typeof s.streak !== "number") {
      s = { streak: 1, lastVisit: today, moments: 0, firstVisit: today };
    } else {
      const gap = daysBetween(s.lastVisit, today);
      if (gap === 1) {
        s.streak += 1;
        setJustReturned(true);
      } else if (gap > 1) {
        s.streak = 1;
        setJustReturned(true);
      }
      s.lastVisit = today;
    }

    try {
      localStorage.setItem(KEY, JSON.stringify(s));
    } catch {
      /* private mode — keep in-memory */
    }
    setState(s);
  }, []);

  const addMoment = useCallback(() => {
    setState((prev) => {
      if (!prev) return prev;
      const next = { ...prev, moments: prev.moments + 1 };
      try {
        localStorage.setItem(KEY, JSON.stringify(next));
      } catch {
        /* ignore */
      }
      return next;
    });
  }, []);

  const streak = state?.streak ?? 1;
  const moments = state?.moments ?? 0;

  return {
    ready: !!state,
    streak,
    moments,
    justReturned,
    label: milestoneLabel(streak),
    stage: stageForStreak(streak),
    addMoment,
  };
}
