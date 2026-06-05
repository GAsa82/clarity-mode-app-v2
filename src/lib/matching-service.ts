import { supabase } from "@/lib/supabase";

export type MatchType = "study" | "networking" | "accountability" | "random";
export type GenderPreference = "any" | "male" | "female";
export type PlanTier = "free" | "premium" | "vip";

export const DAILY_MATCH_LIMITS: Record<PlanTier, number> = {
  free: 3,
  premium: 999,
  vip: 999,
};

export interface QueueEntry {
  id: string;
  user_id: string;
  focus_room_slug: string;
  match_type: MatchType;
  gender_preference: GenderPreference;
  interest_tags: string[];
  plan_tier: PlanTier;
  status: "waiting" | "matched" | "cancelled" | "expired";
  matched_room_id: string | null;
  created_at: string;
  expires_at: string;
}

export interface PrivateRoom {
  id: string;
  slug: string;
  focus_room_slug: string;
  match_type: string;
  status: "waiting" | "active" | "ended";
  created_by: string;
  started_at: string | null;
}

// ─── Queue management ─────────────────────────────────────────────────────────

export async function joinMatchQueue(params: {
  userId: string;
  focusRoomSlug: string;
  matchType: MatchType;
  genderPreference: GenderPreference;
  interestTags: string[];
  planTier: PlanTier;
}): Promise<QueueEntry> {
  // Cancel stale entries for this user first
  await supabase
    .from("match_queue")
    .update({ status: "cancelled" })
    .eq("user_id", params.userId)
    .eq("status", "waiting");

  const { data, error } = await supabase
    .from("match_queue")
    .insert({
      user_id:          params.userId,
      focus_room_slug:  params.focusRoomSlug,
      match_type:       params.matchType,
      gender_preference: params.genderPreference,
      interest_tags:    params.interestTags,
      plan_tier:        params.planTier,
    })
    .select()
    .single();

  if (error) throw error;
  return data as QueueEntry;
}

export async function leaveMatchQueue(userId: string) {
  await supabase
    .from("match_queue")
    .update({ status: "cancelled" })
    .eq("user_id", userId)
    .eq("status", "waiting");
}

export async function findCompatibleMatch(params: {
  userId: string;
  focusRoomSlug: string;
  matchType: MatchType;
  blockedUsers?: string[];
}): Promise<QueueEntry | null> {
  const { data, error } = await supabase
    .from("match_queue")
    .select("*")
    .eq("focus_room_slug", params.focusRoomSlug)
    .eq("match_type", params.matchType)
    .eq("status", "waiting")
    .neq("user_id", params.userId)
    .gt("expires_at", new Date().toISOString())
    .order("plan_tier", { ascending: false }) // VIP first
    .order("created_at", { ascending: true })  // then oldest waiting
    .limit(10);

  if (error || !data) return null;

  const blocked = params.blockedUsers ?? [];
  const candidates = data.filter(e => !blocked.includes(e.user_id));
  return (candidates[0] as QueueEntry) ?? null;
}

// ─── Room management ──────────────────────────────────────────────────────────

export async function createPrivateRoom(params: {
  createdBy: string;
  focusRoomSlug: string;
  matchType: MatchType;
}): Promise<PrivateRoom> {
  const { data, error } = await supabase
    .from("rooms")
    .insert({
      focus_room_slug: params.focusRoomSlug,
      match_type:      params.matchType,
      created_by:      params.createdBy,
      status:          "waiting",
    })
    .select()
    .single();

  if (error) throw error;
  return data as PrivateRoom;
}

export async function confirmMatch(params: {
  myQueueId: string;
  partnerQueueId: string;
  roomId: string;
}): Promise<void> {
  await supabase
    .from("match_queue")
    .update({ status: "matched", matched_room_id: params.roomId })
    .in("id", [params.myQueueId, params.partnerQueueId]);
}

export async function getRoom(roomId: string): Promise<PrivateRoom | null> {
  const { data } = await supabase
    .from("rooms")
    .select("*")
    .eq("id", roomId)
    .single();
  return data as PrivateRoom | null;
}

export async function getRoomParticipants(roomId: string): Promise<string[]> {
  const { data } = await supabase
    .from("room_participants")
    .select("user_id")
    .eq("room_id", roomId)
    .eq("is_active", true);
  return (data ?? []).map((r: any) => r.user_id as string);
}

export async function joinPrivateRoom(roomId: string, userId: string): Promise<void> {
  await supabase.from("room_participants").upsert({
    room_id:   roomId,
    user_id:   userId,
    is_active: true,
    joined_at: new Date().toISOString(),
    left_at:   null,
  }, { onConflict: "room_id,user_id" });
}

export async function leavePrivateRoom(roomId: string, userId: string): Promise<void> {
  await supabase
    .from("room_participants")
    .update({ is_active: false, left_at: new Date().toISOString() })
    .eq("room_id", roomId)
    .eq("user_id", userId);
}

// ─── Session tracking ─────────────────────────────────────────────────────────

export async function createSession(params: {
  roomId: string;
  userId: string;
  partnerId: string;
  matchType: MatchType;
  focusRoomSlug: string;
}): Promise<string> {
  const { data, error } = await supabase
    .from("sessions")
    .insert({
      room_id:         params.roomId,
      user_id:         params.userId,
      partner_id:      params.partnerId,
      match_type:      params.matchType,
      focus_room_slug: params.focusRoomSlug,
    })
    .select("id")
    .single();
  if (error) throw error;
  return data.id as string;
}

export async function endSession(sessionId: string, durationMinutes: number, pomodoroCount: number) {
  await supabase
    .from("sessions")
    .update({
      duration_minutes: durationMinutes,
      pomodoro_count:   pomodoroCount,
      ended_at:         new Date().toISOString(),
      completed:        durationMinutes >= 1,
    })
    .eq("id", sessionId);
}

// ─── Safety features ──────────────────────────────────────────────────────────

export async function reportUser(params: {
  reporterId: string;
  reportedId: string;
  roomId: string;
  reason: string;
  notes?: string;
}): Promise<void> {
  await supabase.from("user_reports").upsert({
    reporter_id: params.reporterId,
    reported_id: params.reportedId,
    room_id:     params.roomId,
    reason:      params.reason,
    notes:       params.notes ?? null,
  }, { onConflict: "reporter_id,reported_id,room_id", ignoreDuplicates: true });
}

export async function blockUser(userId: string, blockedId: string): Promise<void> {
  // Fetch current list then update (no array_append RPC required)
  const { data } = await supabase
    .from("user_stats")
    .select("blocked_users")
    .eq("user_id", userId)
    .single();

  const current: string[] = data?.blocked_users ?? [];
  if (current.includes(blockedId)) return;

  await supabase
    .from("user_stats")
    .upsert({ user_id: userId, blocked_users: [...current, blockedId] });
}

export async function getBlockedUsers(userId: string): Promise<string[]> {
  const { data } = await supabase
    .from("user_stats")
    .select("blocked_users")
    .eq("user_id", userId)
    .single();
  return data?.blocked_users ?? [];
}

export async function canMatchToday(userId: string, planTier: PlanTier): Promise<boolean> {
  const limit = DAILY_MATCH_LIMITS[planTier];
  if (limit >= 999) return true;

  const { data } = await supabase
    .from("user_stats")
    .select("daily_matches, last_match_date")
    .eq("user_id", userId)
    .single();

  if (!data) return true;
  const today = new Date().toISOString().slice(0, 10);
  if (data.last_match_date !== today) return true;
  return data.daily_matches < limit;
}
