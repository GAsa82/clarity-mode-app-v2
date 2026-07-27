import { createClient } from "@supabase/supabase-js";

// Keeps the Supabase project active. Supabase's free tier auto-pauses a
// project after ~1 week with no API activity — the project's own subdomain
// stops resolving in DNS entirely, which took down the ENTIRE site (auth,
// content, payments — everything) for an extended period undetected.
// Called on a schedule by Vercel Cron (see vercel.json "crons") so the
// project always has recent real activity, well inside the inactivity
// window, with no manual step required.
const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } }
);

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  if (req.method === "OPTIONS") return res.status(204).end();

  try {
    const { error } = await supabase.from("websites").select("id").limit(1);
    if (error) throw error;
    return res.status(200).json({ ok: true, pinged: "supabase", timestamp: Date.now() });
  } catch (err) {
    // Still 200: this endpoint's job is to keep the project warm, not to be
    // a health check consumed by anything user-facing. Log server-side so a
    // real outage is still visible in Vercel's function logs.
    console.error("[keep-alive] Supabase ping failed:", err?.message ?? err);
    return res.status(200).json({ ok: false, error: err?.message ?? "ping failed", timestamp: Date.now() });
  }
}
