import { createClient } from "@supabase/supabase-js";
import crypto from "crypto";

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const BLOCKED_WORDS = ["doxx","doxing","kill yourself","kys","bomb threat","rape"];

function moderate(text) {
  const lower = text.toLowerCase();
  if (BLOCKED_WORDS.some(w => lower.includes(w))) return false;
  if (/\b[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}\b/.test(text)) return false;
  if (/\b(\+91|0)?[6-9]\d{9}\b/.test(text)) return false;
  return true;
}

export default async function handler(req, res) {
  const ORIGIN = process.env.VITE_SITE_URL || "https://clarity-mode-app-v2-gq26.vercel.app";
  res.setHeader("Access-Control-Allow-Origin", ORIGIN);
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  if (req.method === "OPTIONS") return res.status(204).end();

  if (req.method === "GET") {
    const { confessionId } = req.query;
    if (!confessionId) return res.status(400).json({ error: "confessionId required" });

    const { data, error } = await supabase
      .from("confession_replies")
      .select("id,anon_id,content,created_at")
      .eq("confession_id", confessionId)
      .eq("is_approved", true)
      .order("created_at", { ascending: true })
      .limit(50);

    if (error) return res.status(500).json({ error: error.message });
    return res.json({ replies: data || [] });
  }

  if (req.method === "POST") {
    const { confessionId, content } = req.body || {};
    if (!confessionId || !content?.trim())
      return res.status(400).json({ error: "Missing fields" });
    if (content.length > 500)
      return res.status(400).json({ error: "Reply too long. Max 500 characters." });
    if (!moderate(content))
      return res.status(422).json({ error: "Reply flagged by moderation. Please keep replies supportive." });

    const anonId = `Anonymous User #${Math.floor(1000 + Math.random() * 9000)}`;

    let userId = null;
    try {
      const auth = req.headers["authorization"];
      if (auth?.startsWith("Bearer ")) {
        const { data } = await supabase.auth.getUser(auth.slice(7));
        userId = data?.user?.id || null;
      }
    } catch {}

    const { data: reply, error } = await supabase
      .from("confession_replies")
      .insert({ confession_id: confessionId, anon_id: anonId, content: content.trim(), user_id: userId })
      .select("id,anon_id,content,created_at")
      .single();

    if (error) return res.status(500).json({ error: "Failed to post reply." });

    // Increment reply_count
    await supabase.from("confessions")
      .update({ reply_count: supabase.rpc ? undefined : undefined }) // handled below
      .eq("id", confessionId);

    const { data: cur } = await supabase
      .from("confessions").select("reply_count").eq("id", confessionId).single();
    await supabase.from("confessions")
      .update({ reply_count: (cur?.reply_count || 0) + 1 })
      .eq("id", confessionId);

    return res.status(201).json({ reply });
  }

  return res.status(405).end();
}
