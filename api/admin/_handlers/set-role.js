import { requireAdmin } from "../../_auth.js";
import { serviceClient } from "../../_supabase.js";

const ORIGIN = process.env.VITE_SITE_URL || "https://clarity-mode-app-v2-gq26.vercel.app";
const VALID_ROLES = ["user", "admin"];

/**
 * There was previously no way to grant or revoke admin access except direct
 * database access — the Users admin page only ever listed people, and
 * `profiles` has no RLS policy letting an admin UPDATE anyone else's row
 * (only SELECT). This is the first legitimate path, using service_role to
 * bypass RLS and the profiles_guard_role_change trigger's admin check —
 * the caller's OWN admin status is verified here, server-side, first.
 */
export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", ORIGIN);
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "POST") return res.status(405).end();

  const actorId = await requireAdmin(req, res);
  if (!actorId) return; // requireAdmin already sent 401/403

  const { userId, role } = req.body || {};
  if (!userId || !VALID_ROLES.includes(role)) {
    return res.status(400).json({ error: "userId and a valid role ('user' or 'admin') are required." });
  }

  if (userId === actorId && role !== "admin") {
    return res.status(400).json({
      error: "You can't remove your own admin access. Have another admin do it.",
    });
  }

  const { data: target, error: targetErr } = await serviceClient
    .from("profiles")
    .select("id, email, role")
    .eq("id", userId)
    .maybeSingle();
  if (targetErr || !target) return res.status(404).json({ error: "User not found." });

  if (target.role === role) {
    return res.json({ success: true, unchanged: true });
  }

  // Demoting the last remaining admin would lock everyone out of the admin
  // panel with no way back in short of direct database access.
  if (target.role === "admin" && role === "user") {
    const { count } = await serviceClient
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .eq("role", "admin");
    if ((count ?? 0) <= 1) {
      return res.status(400).json({ error: "Can't remove the last remaining admin." });
    }
  }

  const { error: updateErr } = await serviceClient
    .from("profiles")
    .update({ role })
    .eq("id", userId);
  if (updateErr) {
    console.error("[admin/set-role] update failed:", updateErr);
    return res.status(500).json({ error: "Failed to update role." });
  }

  // First real write this table has ever received — the Audit Logs admin
  // page has existed with zero rows because nothing wrote to it.
  const { error: logErr } = await serviceClient.from("audit_logs").insert({
    user_id: actorId,
    action: role === "admin" ? "grant_admin" : "revoke_admin",
    resource: "profiles",
    resource_id: userId,
    metadata: { target_email: target.email, previous_role: target.role, new_role: role },
  });
  if (logErr) console.error("[admin/set-role] audit log write failed:", logErr);

  return res.json({ success: true });
}
