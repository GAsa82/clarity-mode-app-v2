import { createClient } from "@supabase/supabase-js";
import crypto from "crypto";

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const REACTION_COLS = {
  relate:  "react_relate",
  support: "react_support",
  advice:  "react_advice",
  strong:  "react_strong",
};

export default async function handler(req, res) {
  const ORIGIN = process.env.VITE_SITE_URL || "https://clarity-mode-app-v2-gq26.vercel.app";
  res.setHeader("Access-Control-Allow-Origin", ORIGIN);
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "POST") return res.status(405).end();

  const { confessionId, reactionType, fingerprint } = req.body || {};
  if (!confessionId || !REACTION_COLS[reactionType])
    return res.status(400).json({ error: "Invalid request" });

  // Build a server-side fingerprint from IP + client fingerprint to prevent easy bypass
  const ip = req.headers["x-forwarded-for"]?.split(",")[0]?.trim() || "anon";
  const raw = `${ip}:${fingerprint || "none"}:${process.env.SUPABASE_SERVICE_ROLE_KEY}`;
  const userFingerprint = crypto.createHash("sha256").update(raw).digest("hex").slice(0, 32);

  // Try to insert — UNIQUE constraint handles dedup
  const { error: insertError } = await supabase
    .from("confession_reactions")
    .insert({ confession_id: confessionId, reaction_type: reactionType, user_fingerprint: userFingerprint });

  if (insertError) {
    if (insertError.code === "23505") // unique violation = already reacted
      return res.json({ success: false, alreadyReacted: true });
    return res.status(500).json({ error: "Failed to record reaction" });
  }

  // Increment counter on the confession
  const col = REACTION_COLS[reactionType];
  const { data, error: updateError } = await supabase.rpc("increment_confession_reaction", {
    p_confession_id: confessionId,
    p_col: col,
  });

  // Fallback if RPC doesn't exist: manual increment
  if (updateError) {
    const { data: current } = await supabase
      .from("confessions").select(col).eq("id", confessionId).single();
    await supabase.from("confessions")
      .update({ [col]: (current?.[col] || 0) + 1 })
      .eq("id", confessionId);
  }

  // Return updated counts
  const { data: updated } = await supabase
    .from("confessions")
    .select("react_relate,react_support,react_advice,react_strong")
    .eq("id", confessionId)
    .single();

  return res.json({ success: true, counts: updated });
}
