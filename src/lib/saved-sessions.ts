import { supabase } from "@/lib/supabase";

/** Is this content item saved by the current user? */
export async function isSessionSaved(contentItemId: string): Promise<boolean> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;
  const { count } = await supabase
    .from("saved_sessions")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id)
    .eq("content_item_id", contentItemId);
  return (count ?? 0) > 0;
}

/** Save a session for the current user. No-ops if already saved. */
export async function saveSession(contentItemId: string): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Sign in to save sessions.");
  const { error } = await supabase
    .from("saved_sessions")
    .upsert({ user_id: user.id, content_item_id: contentItemId }, { onConflict: "user_id,content_item_id" });
  if (error) throw error;
}

/** Remove a saved session for the current user. */
export async function unsaveSession(contentItemId: string): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  const { error } = await supabase
    .from("saved_sessions")
    .delete()
    .eq("user_id", user.id)
    .eq("content_item_id", contentItemId);
  if (error) throw error;
}
