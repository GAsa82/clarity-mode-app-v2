import { anonClient, serviceClient } from "./_supabase.js";

export async function getVerifiedUserId(req) {
  const authHeader = req.headers["authorization"];
  if (!authHeader?.startsWith("Bearer ")) return null;
  // Validating a user's JWT only needs the anon key — never tie auth to the
  // service key, so a misconfigured service key can't silently change what
  // this returns.
  const { data: { user }, error } = await anonClient.auth.getUser(authHeader.slice(7));
  if (error || !user) return null;
  return user.id;
}

/**
 * Was copy-pasted identically into api/media/_r2.js and api/diary/_shared.js
 * (the latter's own comment said "mirrors the guard used by the R2 media
 * endpoints" — already known duplication, never consolidated). One copy,
 * used by both plus anything admin-gated going forward.
 */
export async function requireAdmin(req, res) {
  const userId = await getVerifiedUserId(req);
  if (!userId) {
    res.status(401).json({ error: "Sign in required." });
    return null;
  }
  const { data } = await serviceClient.from("profiles").select("role").eq("id", userId).maybeSingle();
  if (data?.role !== "admin" && data?.role !== "super_admin") {
    res.status(403).json({ error: "Admin access required." });
    return null;
  }
  return userId;
}
