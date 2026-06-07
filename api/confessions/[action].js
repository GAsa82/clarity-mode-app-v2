import { createClient } from "@supabase/supabase-js";
import crypto from "crypto";

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const ORIGIN = process.env.VITE_SITE_URL || "https://clarity-mode-app-v2-gq26.vercel.app";

const CATEGORIES = ["Career","Relationships","Family","Mental Wellness","Business","Money","Education","Personal Growth","Other"];

const REACTION_COLS = {
  relate:  "react_relate",
  support: "react_support",
  advice:  "react_advice",
  strong:  "react_strong",
};

const BLOCKED_PATTERNS = [
  /kill\s*your\s*self/i, /kys\b/i,
  /i\s*will\s*(kill|hurt|harm|murder)/i,
  /\b[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}\b/,
  /\b(\+91|0)?[6-9]\d{9}\b/,
];
const BLOCKED_WORDS = ["doxx","doxing","personal address","home address","find you","rape","molest","pedophile","bomb threat"];

function moderate(text) {
  const lower = text.toLowerCase();
  if (BLOCKED_WORDS.some(w => lower.includes(w))) return false;
  if (BLOCKED_PATTERNS.some(p => p.test(text))) return false;
  return true;
}

function anonId() {
  return `Anonymous User #${Math.floor(1000 + Math.random() * 9000)}`;
}

async function getOptionalUserId(req) {
  try {
    const auth = req.headers["authorization"];
    if (auth?.startsWith("Bearer ")) {
      const { data } = await supabase.auth.getUser(auth.slice(7));
      return data?.user?.id || null;
    }
  } catch {}
  return null;
}

// ── HANDLERS ───────────────────────────────────────────────────────────────

async function handleFeed(req, res) {
  if (req.method !== "GET") return res.status(405).end();
  res.setHeader("Cache-Control", "no-store");

  const { category = "All", sort = "recent", limit = "20", offset = "0" } = req.query;

  let query = supabase
    .from("confessions")
    .select("id,anon_id,content,category,react_relate,react_support,react_advice,react_strong,reply_count,is_success,created_at")
    .eq("is_approved", true)
    .eq("is_flagged", false)
    .limit(parseInt(limit))
    .range(parseInt(offset), parseInt(offset) + parseInt(limit) - 1);

  if (category !== "All") query = query.eq("category", category);
  if (sort === "success")  query = query.eq("is_success", true);

  if (sort === "recent" || sort === "success") {
    query = query.order("created_at", { ascending: false });
  } else if (sort === "supported") {
    query = query.order("react_support", { ascending: false });
  } else if (sort === "relatable") {
    query = query.order("react_relate", { ascending: false });
  } else if (sort === "trending") {
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    query = query.gte("created_at", weekAgo).order("react_relate", { ascending: false });
  }

  const { data, error } = await query;
  if (error) return res.status(500).json({ error: error.message });
  return res.json({ confessions: data || [] });
}

async function handlePost(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  const { content, category } = req.body || {};
  if (!content || content.trim().length < 10)
    return res.status(400).json({ error: "Confession must be at least 10 characters." });
  if (content.length > 1000)
    return res.status(400).json({ error: "Confession too long. Max 1000 characters." });
  if (!CATEGORIES.includes(category))
    return res.status(400).json({ error: "Invalid category." });
  if (!moderate(content))
    return res.status(422).json({ error: "Your confession was flagged by our moderation system. Please keep the space safe and supportive." });

  const userId = await getOptionalUserId(req);
  const { data, error } = await supabase
    .from("confessions")
    .insert({ content: content.trim(), category, anon_id: anonId(), user_id: userId })
    .select("id,anon_id,content,category,react_relate,react_support,react_advice,react_strong,reply_count,created_at")
    .single();

  if (error) return res.status(500).json({ error: "Failed to post confession." });
  return res.status(201).json({ confession: data });
}

async function handleReact(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  const { confessionId, reactionType, fingerprint } = req.body || {};
  if (!confessionId || !REACTION_COLS[reactionType])
    return res.status(400).json({ error: "Invalid request" });

  const ip = req.headers["x-forwarded-for"]?.split(",")[0]?.trim() || "anon";
  const raw = `${ip}:${fingerprint || "none"}:${process.env.SUPABASE_SERVICE_ROLE_KEY}`;
  const userFingerprint = crypto.createHash("sha256").update(raw).digest("hex").slice(0, 32);

  const { error: insertError } = await supabase
    .from("confession_reactions")
    .insert({ confession_id: confessionId, reaction_type: reactionType, user_fingerprint: userFingerprint });

  if (insertError) {
    if (insertError.code === "23505")
      return res.json({ success: false, alreadyReacted: true });
    return res.status(500).json({ error: "Failed to record reaction" });
  }

  const col = REACTION_COLS[reactionType];
  const { data: current } = await supabase
    .from("confessions").select(col).eq("id", confessionId).single();
  await supabase.from("confessions")
    .update({ [col]: (current?.[col] || 0) + 1 })
    .eq("id", confessionId);

  const { data: updated } = await supabase
    .from("confessions")
    .select("react_relate,react_support,react_advice,react_strong")
    .eq("id", confessionId)
    .single();

  return res.json({ success: true, counts: updated });
}

async function handleReplies(req, res) {
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

    const userId = await getOptionalUserId(req);
    const { data: reply, error } = await supabase
      .from("confession_replies")
      .insert({ confession_id: confessionId, anon_id: anonId(), content: content.trim(), user_id: userId })
      .select("id,anon_id,content,created_at")
      .single();

    if (error) return res.status(500).json({ error: "Failed to post reply." });

    const { data: cur } = await supabase
      .from("confessions").select("reply_count").eq("id", confessionId).single();
    await supabase.from("confessions")
      .update({ reply_count: (cur?.reply_count || 0) + 1 })
      .eq("id", confessionId);

    return res.status(201).json({ reply });
  }

  return res.status(405).end();
}

// ── ROUTER ─────────────────────────────────────────────────────────────────

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", ORIGIN);
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  if (req.method === "OPTIONS") return res.status(204).end();

  const action = req.query.action;

  if (action === "feed")    return handleFeed(req, res);
  if (action === "post")    return handlePost(req, res);
  if (action === "react")   return handleReact(req, res);
  if (action === "replies") return handleReplies(req, res);

  return res.status(404).json({ error: `Unknown action: ${action}` });
}
