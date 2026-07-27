import { S3Client } from "@aws-sdk/client-s3";
import { getVerifiedUserId } from "../_auth.js";
import { serviceClient } from "../_supabase.js";

export const R2_BUCKET = "clarity-mode-videos";

export function r2Configured() {
  return Boolean(
    process.env.R2_ACCOUNT_ID &&
      process.env.R2_ACCESS_KEY_ID &&
      process.env.R2_SECRET_ACCESS_KEY &&
      process.env.R2_PUBLIC_URL
  );
}

export function r2Client() {
  return new S3Client({
    region: "auto",
    endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: process.env.R2_ACCESS_KEY_ID,
      secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
    },
  });
}

/** Only admins may request video upload/delete access — this bucket has no RLS of its own. */
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
