import { createClient } from "@supabase/supabase-js";
import { getVerifiedUserId } from "../_auth.js";

/**
 * Cross-project federation gateway.
 *
 * Returns normalized metrics for every business the console operates, each of
 * which lives in its OWN Supabase project. Clarity Mode is this project;
 * Breakthrough Protocol is a separate project reached only via its own
 * service-role key. This endpoint is the single place that fans out per project
 * and normalizes the (differently-named) tables into one shape.
 *
 * Go-live for Breakthrough Protocol: add these to Vercel → Production:
 *   BP_SUPABASE_URL                = https://llflerfeiwhicrmunqzw.supabase.co
 *   BP_SUPABASE_SERVICE_ROLE_KEY   = <BP project service-role key>
 * Until both exist, BP is reported honestly as { configured: false } — never a
 * crash. Admin-only (checked against the Clarity project's profiles.role).
 */

const clarity = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } },
);

const PROJECTS = {
  clarity: {
    name: "Clarity Mode",
    url: process.env.VITE_SUPABASE_URL,
    key: process.env.SUPABASE_SERVICE_ROLE_KEY,
  },
  bp: {
    name: "Breakthrough Protocol",
    url: process.env.BP_SUPABASE_URL,
    key: process.env.BP_SUPABASE_SERVICE_ROLE_KEY,
  },
};

async function safeCount(sb, table) {
  try {
    const { count, error } = await sb.from(table).select("id", { count: "exact", head: true });
    return error ? null : (count ?? 0);
  } catch { return null; }
}

async function sumRevenue(sb, key) {
  try {
    if (key === "bp") {
      const { data, error } = await sb.from("payments").select("amount_paise").eq("status", "paid");
      if (error) return null;
      return (data ?? []).reduce((s, r) => s + (r.amount_paise || 0), 0) / 100;
    }
    const { data, error } = await sb.from("orders").select("amount").eq("status", "completed");
    if (error) return null;
    return (data ?? []).reduce((s, r) => s + (r.amount || 0), 0) / 100;
  } catch { return null; }
}

async function metricsFor(key, cfg) {
  if (!cfg.url || !cfg.key) return { key, name: cfg.name, configured: false };
  let sb;
  try { sb = createClient(cfg.url, cfg.key, { auth: { persistSession: false } }); }
  catch { return { key, name: cfg.name, configured: false }; }

  // Normalize the two schemas: users → profiles; content → content_items
  // (Clarity) / vault_drops (BP); revenue → orders (Clarity) / payments (BP).
  const [users, content, revenue] = await Promise.all([
    safeCount(sb, "profiles"),
    safeCount(sb, key === "bp" ? "vault_drops" : "content_items"),
    sumRevenue(sb, key),
  ]);
  return { key, name: cfg.name, configured: true, users, content, revenue };
}

export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });

  const userId = await getVerifiedUserId(req);
  if (!userId) return res.status(401).json({ error: "Unauthorized" });

  // Admin-only, verified against the Clarity project (the console's home).
  const { data: profile } = await clarity.from("profiles").select("role").eq("id", userId).single();
  if (!profile || profile.role !== "admin") return res.status(403).json({ error: "Forbidden" });

  const which = req.query.project;
  const keys = which && PROJECTS[which] ? [which] : Object.keys(PROJECTS);
  const projects = await Promise.all(keys.map((k) => metricsFor(k, PROJECTS[k])));
  return res.status(200).json({ projects });
}
