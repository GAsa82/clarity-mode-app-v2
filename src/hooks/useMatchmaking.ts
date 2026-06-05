import { useState, useRef, useCallback, useEffect } from "react";
import { supabase, isSupabaseReady } from "@/lib/supabase";
import {
  joinMatchQueue,
  leaveMatchQueue,
  findCompatibleMatch,
  createPrivateRoom,
  confirmMatch,
  getRoom,
  getRoomParticipants,
  canMatchToday,
  getBlockedUsers,
  type MatchType,
  type GenderPreference,
  type PlanTier,
} from "@/lib/matching-service";

export type MatchingPhase = "idle" | "searching" | "matched" | "error";

export interface MatchResult {
  roomId: string;
  roomSlug: string;
  isInitiator: boolean;
  partnerId: string;
}

interface Params {
  userId: string;
  focusRoomSlug: string;
  planTier: PlanTier;
}

export function useMatchmaking({ userId, focusRoomSlug, planTier }: Params) {
  const [phase, setPhase] = useState<MatchingPhase>("idle");
  const [matchResult, setMatchResult] = useState<MatchResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [waitSeconds, setWaitSeconds] = useState(0);

  const queueIdRef   = useRef<string | null>(null);
  const channelRef   = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const timerRef     = useRef<ReturnType<typeof setInterval> | null>(null);
  const activeRef    = useRef(false);
  const paramsRef    = useRef<{ matchType: MatchType; genderPreference: GenderPreference }>({
    matchType: "study",
    genderPreference: "any",
  });

  const stopTimer = useCallback(() => {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
  }, []);

  const cleanup = useCallback(() => {
    stopTimer();
    channelRef.current?.unsubscribe();
    channelRef.current = null;
    activeRef.current = false;
  }, [stopTimer]);

  // ─── Core: try to match with someone already in queue ────────────────────
  const tryMatch = useCallback(async () => {
    if (!activeRef.current || !queueIdRef.current) return;
    const { matchType, genderPreference } = paramsRef.current;

    const blocked = await getBlockedUsers(userId);
    const partner = await findCompatibleMatch({ userId, focusRoomSlug, matchType, blockedUsers: blocked });
    if (!partner || !activeRef.current) return;

    // Deterministic: lexicographically smaller userId creates the room
    if (userId >= partner.user_id) return;

    try {
      const room = await createPrivateRoom({ createdBy: userId, focusRoomSlug, matchType });
      await confirmMatch({ myQueueId: queueIdRef.current, partnerQueueId: partner.id, roomId: room.id });

      cleanup();
      setPhase("matched");
      setMatchResult({ roomId: room.id, roomSlug: room.slug, isInitiator: true, partnerId: partner.user_id });
    } catch (e) {
      console.error("[Matchmaking] createRoom failed:", e);
    }
  }, [userId, focusRoomSlug, cleanup]);

  // ─── Start searching ──────────────────────────────────────────────────────
  const startSearching = useCallback(async (params: {
    matchType: MatchType;
    genderPreference: GenderPreference;
    interestTags: string[];
  }) => {
    if (!isSupabaseReady()) {
      setError("Sign in to use 1-on-1 matching.");
      setPhase("error");
      return;
    }
    if (!userId) {
      setError("You must be signed in to find a partner.");
      setPhase("error");
      return;
    }

    const allowed = await canMatchToday(userId, planTier);
    if (!allowed) {
      setError(`Free plan allows 3 matches per day. Upgrade to Premium for unlimited.`);
      setPhase("error");
      return;
    }

    setPhase("searching");
    setError(null);
    setWaitSeconds(0);
    activeRef.current = true;
    paramsRef.current = { matchType: params.matchType, genderPreference: params.genderPreference };

    // Insert queue entry
    try {
      const entry = await joinMatchQueue({
        userId,
        focusRoomSlug,
        matchType: params.matchType,
        genderPreference: params.genderPreference,
        interestTags: params.interestTags,
        planTier,
      });
      queueIdRef.current = entry.id;
    } catch (e: any) {
      setPhase("error");
      setError(e?.message ?? "Failed to join queue.");
      return;
    }

    timerRef.current = setInterval(() => setWaitSeconds(s => s + 1), 1000);

    // Try immediately
    await tryMatch();

    // Watch for new queue inserts (someone joins after me)
    if (!isSupabaseReady()) return;
    const ch = supabase
      .channel(`mq:${focusRoomSlug}:${params.matchType}:${userId}`)
      .on("postgres_changes", {
        event: "INSERT",
        schema: "public",
        table: "match_queue",
        filter: `focus_room_slug=eq.${focusRoomSlug}`,
      }, () => tryMatch())
      // Watch my own row for partner-created room (other side of the deterministic race)
      .on("postgres_changes", {
        event: "UPDATE",
        schema: "public",
        table: "match_queue",
        filter: `user_id=eq.${userId}`,
      }, async (payload) => {
        const row = payload.new as any;
        if (row.status === "matched" && row.matched_room_id && activeRef.current) {
          cleanup();
          // Fetch partner from room_participants
          const participants = await getRoomParticipants(row.matched_room_id);
          const partnerId = participants.find(id => id !== userId) ?? "";
          const room = await getRoom(row.matched_room_id);
          setPhase("matched");
          setMatchResult({
            roomId:      row.matched_room_id,
            roomSlug:    room?.slug ?? row.matched_room_id,
            isInitiator: false,
            partnerId,
          });
        }
      });

    ch.subscribe();
    channelRef.current = ch;
  }, [userId, focusRoomSlug, planTier, tryMatch, cleanup]);

  // ─── Cancel / reset ───────────────────────────────────────────────────────
  const cancelSearch = useCallback(async () => {
    cleanup();
    setPhase("idle");
    await leaveMatchQueue(userId);
    queueIdRef.current = null;
  }, [userId, cleanup]);

  const reset = useCallback(() => {
    cleanup();
    setPhase("idle");
    setMatchResult(null);
    setError(null);
    setWaitSeconds(0);
    queueIdRef.current = null;
  }, [cleanup]);

  useEffect(() => {
    return () => {
      cleanup();
      if (queueIdRef.current) leaveMatchQueue(userId);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return { phase, matchResult, error, waitSeconds, startSearching, cancelSearch, reset };
}
