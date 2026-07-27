import { DeleteObjectCommand } from "@aws-sdk/client-s3";
import { R2_BUCKET, r2Client, r2Configured, requireAdmin } from "./_r2.js";

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  if (!(await requireAdmin(req, res))) return;

  if (!r2Configured()) {
    return res.status(503).json({ error: "Video storage isn't configured." });
  }

  const { url } = req.body || {};
  const base = (process.env.R2_PUBLIC_URL || "").replace(/\/$/, "");
  if (!url || !base || !url.startsWith(`${base}/`)) {
    return res.status(400).json({ error: "url is not an R2-hosted asset." });
  }
  const key = url.slice(base.length + 1);

  try {
    await r2Client().send(new DeleteObjectCommand({ Bucket: R2_BUCKET, Key: key }));
    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error("[media/delete] failed to delete R2 object:", err?.message ?? err);
    return res.status(500).json({ error: "Delete failed." });
  }
}
