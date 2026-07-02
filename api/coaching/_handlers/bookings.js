import { createClient } from "@supabase/supabase-js";
import { getVerifiedUserId } from "../../_auth.js";

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  const userId = await getVerifiedUserId(req);
  if (!userId) return res.status(401).json({ error: "Unauthorized" });

  const { data: profile } = await supabase
    .from("profiles").select("role").eq("id", userId).single();
  if (profile?.role !== "admin") return res.status(403).json({ error: "Forbidden" });

  if (req.method === "GET") {
    const { data, error } = await supabase
      .from("coaching_sessions")
      .select("*")
      .order("session_datetime", { ascending: true });
    if (error) return res.status(500).json({ error: error.message });
    return res.json({ bookings: data || [] });
  }

  if (req.method === "PATCH") {
    const { id, ...updates } = req.body || {};
    if (!id) return res.status(400).json({ error: "Missing session id" });
    const { error } = await supabase
      .from("coaching_sessions")
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq("id", id);
    if (error) return res.status(500).json({ error: error.message });
    return res.json({ success: true });
  }

  return res.status(405).end();
}
