import { anonClient } from "./_supabase.js";

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
