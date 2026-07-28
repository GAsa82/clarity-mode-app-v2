import { createClient } from "@supabase/supabase-js";
import { requireAdmin } from "../_auth.js";

export { requireAdmin };

/**
 * Shared plumbing for the Diary processing pipeline.
 *
 * Everything here runs server-side for two reasons: the Gemini key must never
 * reach the browser, and reading a page scan requires pulling from the PRIVATE
 * `diary-private` bucket, which only the service role can do without minting a
 * signed URL per call.
 */

export const serviceClient = createClient(
  process.env.VITE_SUPABASE_URL,
  (process.env.SUPABASE_SERVICE_ROLE_KEY || "not-configured").trim(),
  { auth: { persistSession: false } }
);

export const DIARY_BUCKET = "diary-private";

// Flash is the right default here: strong handwriting vision, fast enough for
// batch page processing, and comfortably inside the free tier for personal use.
export const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-2.5-flash";
// text-embedding-004 was retired from v1beta (404s), so this is the current
// model. It defaults to 3072 dims but supports Matryoshka truncation, and we
// ask for 768 to match the diary_pages.embedding vector(768) column.
export const GEMINI_EMBED_MODEL = process.env.GEMINI_EMBED_MODEL || "gemini-embedding-001";
export const GEMINI_EMBED_DIMS = 768;

export function geminiConfigured() {
  return Boolean(process.env.GEMINI_API_KEY);
}

/** Uniform CORS + preflight handling for every diary endpoint. */
export function applyCors(req, res, methods = "POST, OPTIONS") {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", methods);
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  if (req.method === "OPTIONS") {
    res.status(204).end();
    return true;
  }
  return false;
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** Distinguishes "slow down" from "genuinely broken" for the caller. */
export class RateLimitError extends Error {
  constructor(message, retryAfterMs) {
    super(message);
    this.name = "RateLimitError";
    this.code = "RATE_LIMITED";
    this.retryAfterMs = retryAfterMs;
  }
}

/**
 * Gemini answers a rate-limit with 429 and a RetryInfo detail telling you
 * exactly how long to wait. Honour it rather than guessing — and never retry
 * a 4xx that isn't 429, because a bad request will fail identically forever.
 */
async function fetchWithBackoff(url, init, { attempts = 4 } = {}) {
  let waitMs = 2000;

  for (let attempt = 1; attempt <= attempts; attempt++) {
    const res = await fetch(url, init);
    if (res.ok) return res;

    const body = await res.text().catch(() => "");
    const isRetryable = res.status === 429 || res.status === 503 || res.status >= 500;
    if (!isRetryable || attempt === attempts) {
      if (res.status === 429) {
        throw new RateLimitError(
          "Gemini rate limit reached. The free tier allows a limited number of requests per minute — " +
            "processing will resume automatically.",
          extractRetryDelayMs(body) ?? waitMs
        );
      }
      throw new Error(`Gemini ${res.status}: ${body.slice(0, 300)}`);
    }

    const suggested = extractRetryDelayMs(body);
    await sleep(suggested ?? waitMs);
    waitMs = Math.min(waitMs * 2, 30000); // capped exponential backoff
  }

  throw new Error("Gemini: retries exhausted.");
}

/** Pull `retryDelay: "12s"` out of the RetryInfo detail Google returns on 429. */
function extractRetryDelayMs(body) {
  try {
    const json = JSON.parse(body);
    for (const detail of json?.error?.details ?? []) {
      if (typeof detail.retryDelay === "string") {
        const seconds = parseFloat(detail.retryDelay.replace("s", ""));
        if (Number.isFinite(seconds)) return Math.ceil(seconds * 1000) + 500;
      }
    }
  } catch {
    // Non-JSON error body — fall back to the caller's schedule.
  }
  return null;
}

/** Consistent 503 so the UI can explain exactly what's missing. */
export function notConfigured(res) {
  return res.status(503).json({
    error:
      "Handwriting recognition isn't configured yet — GEMINI_API_KEY is missing from the server environment.",
    code: "AI_NOT_CONFIGURED",
  });
}

/**
 * Call Gemini's generateContent. `parts` may mix text and inline image data.
 * When `schema` is supplied the model is forced into JSON mode, which removes
 * the usual brittleness of parsing prose back into structured fields.
 */
export async function geminiGenerate({ parts, schema, systemInstruction, temperature = 0.2 }) {
  const url =
    `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent` +
    `?key=${encodeURIComponent(process.env.GEMINI_API_KEY)}`;

  const body = {
    contents: [{ role: "user", parts }],
    generationConfig: {
      temperature,
      ...(schema ? { responseMimeType: "application/json", responseSchema: schema } : {}),
    },
  };
  if (systemInstruction) {
    body.systemInstruction = { parts: [{ text: systemInstruction }] };
  }

  const res = await fetchWithBackoff(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  const json = await res.json();

  // A safety block returns 200 with no candidate — surface that honestly
  // rather than letting it read as an empty page.
  const candidate = json?.candidates?.[0];
  if (!candidate) {
    const reason = json?.promptFeedback?.blockReason || "no candidate returned";
    throw new Error(`Gemini returned no result (${reason}).`);
  }

  const text = (candidate.content?.parts ?? []).map((p) => p.text ?? "").join("").trim();
  if (!text) throw new Error("Gemini returned an empty response.");

  if (!schema) return text;
  try {
    return JSON.parse(text);
  } catch {
    throw new Error("Gemini returned malformed JSON.");
  }
}

/** Embedding vector for semantic search. */
export async function geminiEmbed(text) {
  const url =
    `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_EMBED_MODEL}:embedContent` +
    `?key=${encodeURIComponent(process.env.GEMINI_API_KEY)}`;

  const res = await fetchWithBackoff(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: `models/${GEMINI_EMBED_MODEL}`,
      content: { parts: [{ text: text.slice(0, 8000) }] },
      outputDimensionality: GEMINI_EMBED_DIMS,
    }),
  });

  const json = await res.json();
  const values = json?.embedding?.values;
  if (!Array.isArray(values)) throw new Error("Gemini embed returned no vector.");

  // Only the full 3072-dim output is unit length; a Matryoshka-truncated
  // vector comes back un-normalised (measured L2 ≈ 0.59 at 768). Cosine
  // distance assumes unit vectors, so normalise before storing or every
  // similarity score would be skewed by magnitude rather than direction.
  const norm = Math.sqrt(values.reduce((sum, v) => sum + v * v, 0));
  return norm > 0 ? values.map((v) => v / norm) : values;
}

/** Pull a page scan out of private storage and encode it for the vision call. */
export async function fetchScanAsInlineData(imagePath, mimeType) {
  const { data, error } = await serviceClient.storage.from(DIARY_BUCKET).download(imagePath);
  if (error || !data) throw new Error(`Could not read the scan: ${error?.message ?? "not found"}`);

  const buffer = Buffer.from(await data.arrayBuffer());
  return {
    inline_data: {
      mime_type: mimeType || data.type || "image/jpeg",
      data: buffer.toString("base64"),
    },
  };
}
