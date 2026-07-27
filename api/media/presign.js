import { randomUUID } from "node:crypto";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { R2_BUCKET, r2Client, r2Configured, requireAdmin } from "./_r2.js";

// Videos go to R2 instead of Supabase Storage: Supabase's cms-media bucket is
// capped at 200MB (storage.buckets.file_size_limit), which real session/course
// video files routinely exceed. R2 has no comparable practical cap and no
// egress fees, so it's a better fit for large media specifically — images and
// audio stay on Supabase, where they already work fine.
export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  if (!(await requireAdmin(req, res))) return; // requireAdmin already sent the response

  if (!r2Configured()) {
    return res.status(503).json({
      error: "Video storage isn't configured yet — R2_ACCOUNT_ID / R2_ACCESS_KEY_ID / R2_SECRET_ACCESS_KEY / R2_PUBLIC_URL are missing in Vercel env vars.",
    });
  }

  const { filename, contentType } = req.body || {};
  if (!filename || typeof filename !== "string") {
    return res.status(400).json({ error: "filename is required." });
  }

  const ext = filename.includes(".") ? filename.split(".").pop().slice(0, 10) : "bin";
  const key = `videos/${randomUUID()}.${ext}`;

  try {
    const uploadUrl = await getSignedUrl(
      r2Client(),
      new PutObjectCommand({
        Bucket: R2_BUCKET,
        Key: key,
        ContentType: contentType || "application/octet-stream",
      }),
      { expiresIn: 600 }
    );
    const publicUrl = `${process.env.R2_PUBLIC_URL.replace(/\/$/, "")}/${key}`;
    return res.status(200).json({ uploadUrl, publicUrl });
  } catch (err) {
    console.error("[media/presign] failed to sign R2 upload URL:", err?.message ?? err);
    return res.status(500).json({ error: "Couldn't prepare the video upload." });
  }
}
