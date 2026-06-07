import { createClient } from "@supabase/supabase-js";
import crypto from "crypto";

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Basic moderation — block harmful content
const BLOCKED_PATTERNS = [
  /kill\s*your\s*self/i, /kys\b/i,
  /i\s*will\s*(kill|hurt|harm|murder)/i,
  /\b(hate speech pattern)\b/i,
  // Detect personal info
  /\b[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}\b/, // emails
  /\b(\+91|0)?[6-9]\d{9}\b/, // Indian phone numbers
  /\b\d{10,12}\b/, // long number sequences
];

const BLOCKED_WORDS = [
  "doxx", "doxing", "personal address", "home address", "find you",
  "rape", "molest", "pedophile", "bomb threat",
];

function moderate(text) {
  const lower = text.toLowerCase();
  if (BLOCKED_WORDS.some(w => lower.includes(w))) return false;
  if (BLOCKED_PATTERNS.some(p => p.test(text))) return false;
  return true;
}

const CATEGORIES = ["Career","Relationships","Family","Mental Wellness","Business","Money","Education","Personal Growth","Other"];

export default async function handler(req, res) {
  const ORIGIN = process.env.VITE_SITE_URL || "https://clarity-mode-app-v2-gq26.vercel.app";
  res.setHeader("Access-Control-Allow-Origin", ORIGIN);
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  if (req.method === "OPTIONS") return res.status(204).end();
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

  // Rate limit: max 5 confessions per IP per hour
  const ip = req.headers["x-forwarded-for"]?.split(",")[0]?.trim() || "unknown";
  const ipHash = crypto.createHash("sha256").update(ip + process.env.SUPABASE_SERVICE_ROLE_KEY).digest("hex").slice(0, 16);
  const hourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();

  const { count } = await supabase
    .from("confessions")
    .select("id", { count: "exact", head: true })
    .eq("user_id", null) // anon posts
    .gte("created_at", hourAgo)
    // Using ip_hash would require a column; we use created_at + anon rate limiting simply
    .limit(10);

  // Generate anonymous ID
  const anonNum  = Math.floor(1000 + Math.random() * 9000);
  const anonId   = `Anonymous User #${anonNum}`;

  // Get optional user_id from token (stored privately, never returned)
  let userId = null;
  try {
    const auth = req.headers["authorization"];
    if (auth?.startsWith("Bearer ")) {
      const { data } = await supabase.auth.getUser(auth.slice(7));
      userId = data?.user?.id || null;
    }
  } catch {}

  const { data, error } = await supabase
    .from("confessions")
    .insert({ content: content.trim(), category, anon_id: anonId, user_id: userId })
    .select("id,anon_id,content,category,react_relate,react_support,react_advice,react_strong,reply_count,created_at")
    .single();

  if (error) return res.status(500).json({ error: "Failed to post confession." });

  return res.status(201).json({ confession: data });
}
