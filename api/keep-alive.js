const RAILWAY_URL = "https://clarity-mode-app-v2-production-1982.up.railway.app";

export default async function handler(req, res) {
  // CORS headers so the frontend can also call this directly
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  if (req.method === "OPTIONS") return res.status(204).end();

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15_000);
    const response = await fetch(`${RAILWAY_URL}/api/health`, {
      signal: controller.signal,
    });
    clearTimeout(timeout);
    const data = await response.json();
    return res.status(200).json({
      ok: true,
      pinged: true,
      backend_status: data?.status ?? "unknown",
      timestamp: Date.now(),
    });
  } catch (err) {
    return res.status(200).json({
      ok: false,
      pinged: false,
      error: err?.message ?? "fetch failed",
      timestamp: Date.now(),
    });
  }
}
