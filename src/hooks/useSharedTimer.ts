import { useState, useRef, useCallback, useEffect } from "react";
import { supabase, isSupabaseReady } from "@/lib/supabase";

export interface SharedTimerState {
  minutes: number;
  seconds: number;
  running: boolean;
  phase: "focus" | "break";
  completedPomodoros: number;
  totalFocusMinutes: number;
}

const FOCUS_MINS  = 25;
const BREAK_MINS  = 5;

const INITIAL: SharedTimerState = {
  minutes: FOCUS_MINS,
  seconds: 0,
  running: false,
  phase: "focus",
  completedPomodoros: 0,
  totalFocusMinutes: 0,
};

export function useSharedTimer(roomId: string, userId: string, isInitiator: boolean) {
  const [timer, setTimer] = useState<SharedTimerState>(INITIAL);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const stateRef = useRef(timer);
  stateRef.current = timer;

  const broadcastState = useCallback((state: SharedTimerState) => {
    if (!isInitiator || !isSupabaseReady()) return;
    channelRef.current?.send({
      type: "broadcast",
      event: "timer",
      payload: { ...state, from: userId },
    });
  }, [isInitiator, userId]);

  // ─── Tick ────────────────────────────────────────────────────────────────
  const tick = useCallback(() => {
    setTimer(prev => {
      if (!prev.running) return prev;
      let { minutes, seconds, phase, completedPomodoros, totalFocusMinutes } = prev;

      if (seconds > 0) return { ...prev, seconds: seconds - 1 };

      if (minutes > 0) {
        const newMins = minutes - 1;
        const newFocusMins = phase === "focus" ? totalFocusMinutes + 1 : totalFocusMinutes;
        return { ...prev, minutes: newMins, seconds: 59, totalFocusMinutes: newFocusMins };
      }

      // Timer reached 0 — switch phase
      const nextPhase: "focus" | "break" = phase === "focus" ? "break" : "focus";
      const nextMins = nextPhase === "focus" ? FOCUS_MINS : BREAK_MINS;
      const newPomodoros = phase === "focus" ? completedPomodoros + 1 : completedPomodoros;
      const next: SharedTimerState = {
        ...prev, phase: nextPhase, minutes: nextMins, seconds: 0, running: false,
        completedPomodoros: newPomodoros,
      };
      if (isInitiator) broadcastState(next);
      return next;
    });
  }, [isInitiator, broadcastState]);

  useEffect(() => {
    if (timer.running) {
      intervalRef.current = setInterval(tick, 1000);
    } else {
      if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null; }
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [timer.running, tick]);

  // ─── Realtime sync ────────────────────────────────────────────────────────
  useEffect(() => {
    if (!isSupabaseReady()) return;
    const ch = supabase.channel(`timer:${roomId}`, { config: { broadcast: { self: false } } });
    channelRef.current = ch;

    ch.on("broadcast", { event: "timer" }, ({ payload }: any) => {
      if (payload.from !== userId) {
        setTimer(prev => ({ ...prev, ...payload, from: undefined }));
      }
    });

    ch.subscribe();
    return () => ch.unsubscribe();
  }, [roomId, userId]);

  // ─── Controls (only initiator drives; non-initiator sends requests) ───────
  const startTimer = useCallback(() => {
    const next = { ...stateRef.current, running: true };
    setTimer(next);
    broadcastState(next);
    // Non-initiator: broadcast an intent so partner can relay
    if (!isInitiator) {
      channelRef.current?.send({ type: "broadcast", event: "timer", payload: { ...next, from: userId } });
    }
  }, [isInitiator, broadcastState, userId]);

  const pauseTimer = useCallback(() => {
    const next = { ...stateRef.current, running: false };
    setTimer(next);
    broadcastState(next);
    if (!isInitiator) {
      channelRef.current?.send({ type: "broadcast", event: "timer", payload: { ...next, from: userId } });
    }
  }, [isInitiator, broadcastState, userId]);

  const resetTimer = useCallback(() => {
    const next = { ...stateRef.current, minutes: FOCUS_MINS, seconds: 0, running: false, phase: "focus" as const };
    setTimer(next);
    broadcastState(next);
    if (!isInitiator) {
      channelRef.current?.send({ type: "broadcast", event: "timer", payload: { ...next, from: userId } });
    }
  }, [isInitiator, broadcastState, userId]);

  return { timer, startTimer, pauseTimer, resetTimer };
}
