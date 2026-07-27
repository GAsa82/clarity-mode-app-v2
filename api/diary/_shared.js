import { createClient } from "@supabase/supabase-js";
import { getVerifiedUserId } from "../_auth.js";

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
export const GEMINI_EMBED_MODEL = process.env.GEMINI_EMBED_MODEL || "text-embedding-004";

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

/**
 * The diary is the owner's private notebook — only admins may touch it.
 * Mirrors the guard used by the R2 media endpoints.
 */
export async function requireAdmin(req, res) {
  const userId = await getVerifiedUserId(req);
  if (!userId) {
    res.status(401).json({ error: "Sign in required." });
    return null;
  }
  const { data } = await serviceClient
    .from("profiles")
    .select("role")
    .eq("id", userId)
    .maybeSingle();

  if (data?.role !== "admin") {
    res.status(403).json({ error: "Admin access required." });
    return null;
  }
  return userId;
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

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`Gemini ${res.status}: ${detail.slice(0, 300)}`);
  }

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

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: `models/${GEMINI_EMBED_MODEL}`,
      content: { parts: [{ text: text.slice(0, 8000) }] },
    }),
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`Gemini embed ${res.status}: ${detail.slice(0, 200)}`);
  }
  const json = await res.json();
  const values = json?.embedding?.values;
  if (!Array.isArray(values)) throw new Error("Gemini embed returned no vector.");
  return values;
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
