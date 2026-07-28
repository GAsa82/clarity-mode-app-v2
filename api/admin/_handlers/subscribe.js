// Moved from the standalone api/subscribe.js so it could share a Vercel
// function slot with set-role.js — Hobby caps deployments at 12 functions.
// Logic is unchanged; only the file location and import paths moved.
import { serviceClient as supabase } from "../../_supabase.js";

const ORIGIN = process.env.VITE_SITE_URL || "https://clarity-mode-app-v2-gq26.vercel.app";

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", ORIGIN);
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "POST") return res.status(405).end();

  const { email } = req.body || {};
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ error: "Valid email required" });
  }

  try {
    const { error } = await supabase
      .from("newsletter_subscribers")
      .upsert(
        { email: email.toLowerCase().trim(), subscribed_at: new Date().toISOString() },
        { onConflict: "email", ignoreDuplicates: true }
      );

    if (error) {
      console.error("[subscribe] db error:", error);
      return res.status(500).json({ error: "Failed to save subscription" });
    }

    return res.json({ success: true });
  } catch (err) {
    console.error("[subscribe] unexpected error:", err);
    return res.status(500).json({ error: "Server error" });
  }
}
