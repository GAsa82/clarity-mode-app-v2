import {
  applyCors, requireAdmin, geminiConfigured, notConfigured,
  geminiGenerate, fetchScanAsInlineData, serviceClient,
} from "../_shared.js";

/**
 * Transcribe and understand one diary page.
 *
 * The single most important property of this endpoint is that it must never
 * invent diary content. Everything downstream — PDFs, research papers,
 * insights — is generated from this text and cited back to this page, so a
 * hallucinated line here would silently become a "quote from my diary" later.
 * The prompt and schema below are built around that constraint: illegible
 * words are marked, gaps are left as gaps, and a page the model cannot read
 * comes back with low confidence and gets flagged for human review instead of
 * being quietly accepted.
 */

const SYSTEM = `You transcribe handwritten diary pages with archival accuracy.

ABSOLUTE RULES — these override everything else:
- Transcribe ONLY what is actually written on the page. Never add, complete,
  smooth over, or infer content that is not there.
- If a word is illegible, write [?] in its place. If a whole region is
  illegible, write [illegible] — do not guess.
- Never invent dates, names, numbers, or quotations.
- If the image is blank, not a diary page, or too poor to read, say so via a
  low confidence score and leave the text fields empty.
- Preserve the writer's own wording, spelling and voice. Do not paraphrase or
  improve their prose in the transcription field.

Light correction IS allowed in corrected_text, limited to: obvious OCR-level
slips, spacing, and line-break reflow into natural paragraphs. It must remain
the writer's words.

Analysis fields (summary, topics, extractions) are YOUR observations about the
page and may be phrased in your own words — but every one must be grounded in
something actually present in the text. An empty array is always the correct
answer when a category genuinely isn't present. Do not pad.`;

const SCHEMA = {
  type: "object",
  properties: {
    is_readable: { type: "boolean" },
    is_diary_page: { type: "boolean" },
    confidence: { type: "number" },
    raw_text: { type: "string" },
    corrected_text: { type: "string" },
    summary: { type: "string" },
    entry_date: { type: "string" },
    emotion: { type: "string" },
    topics: { type: "array", items: { type: "string" } },
    keywords: { type: "array", items: { type: "string" } },
    categories: { type: "array", items: { type: "string" } },
    tags: { type: "array", items: { type: "string" } },
    lessons: { type: "array", items: { type: "string" } },
    ideas: { type: "array", items: { type: "string" } },
    business_ideas: { type: "array", items: { type: "string" } },
    productivity: { type: "array", items: { type: "string" } },
    psychology: { type: "array", items: { type: "string" } },
    frameworks: { type: "array", items: { type: "string" } },
    observations: { type: "array", items: { type: "string" } },
    quotes: { type: "array", items: { type: "string" } },
    action_items: { type: "array", items: { type: "string" } },
    stories: { type: "array", items: { type: "string" } },
    research_notes: { type: "array", items: { type: "string" } },
    patterns: { type: "array", items: { type: "string" } },
  },
  required: ["is_readable", "is_diary_page", "confidence", "raw_text", "corrected_text", "summary"],
};

// Below this, the transcription isn't trustworthy enough to generate from.
const REVIEW_THRESHOLD = 0.55;

export default async function handler(req, res) {
  if (applyCors(req, res)) return;
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  if (!(await requireAdmin(req, res))) return;
  if (!geminiConfigured()) return notConfigured(res);

  const { pageId } = req.body || {};
  if (!pageId) return res.status(400).json({ error: "pageId is required." });

  const { data: page, error: loadErr } = await serviceClient
    .from("diary_pages")
    .select("id, image_path, mime_type, status")
    .eq("id", pageId)
    .maybeSingle();

  if (loadErr || !page) return res.status(404).json({ error: "Page not found." });

  await serviceClient
    .from("diary_pages")
    .update({ status: "processing", processing_started_at: new Date().toISOString(), status_message: null })
    .eq("id", pageId);

  try {
    const imagePart = await fetchScanAsInlineData(page.image_path, page.mime_type);

    const result = await geminiGenerate({
      systemInstruction: SYSTEM,
      schema: SCHEMA,
      temperature: 0.1, // transcription is not a creative task
      parts: [
        imagePart,
        {
          text:
            "Transcribe and analyse this diary page. Follow the absolute rules exactly. " +
            "If you cannot read it, set is_readable false and confidence low rather than guessing. " +
            "Leave entry_date empty unless a date is actually written on the page.",
        },
      ],
    });

    const confidence = clamp01(Number(result.confidence) || 0);
    const unusable = !result.is_readable || !result.is_diary_page;
    const status = unusable || confidence < REVIEW_THRESHOLD ? "needs_review" : "processed";

    const statusMessage = !result.is_diary_page
      ? "This doesn't look like a diary page — review before using it."
      : !result.is_readable
        ? "The handwriting couldn't be read reliably. Transcribe manually or re-photograph the page."
        : confidence < REVIEW_THRESHOLD
          ? `Low transcription confidence (${Math.round(confidence * 100)}%) — please check it.`
          : null;

    const { error: saveErr } = await serviceClient
      .from("diary_pages")
      .update({
        status,
        status_message: statusMessage,
        processed_at: new Date().toISOString(),
        confidence,
        ocr_text: result.raw_text || null,
        corrected_text: result.corrected_text || null,
        summary: result.summary || null,
        entry_date: parseDate(result.entry_date),
        emotion: result.emotion || null,
        topics: arr(result.topics),
        keywords: arr(result.keywords),
        categories: arr(result.categories),
        tags: arr(result.tags).map((t) => t.toLowerCase()),
        extracted: {
          lessons: arr(result.lessons),
          ideas: arr(result.ideas),
          business_ideas: arr(result.business_ideas),
          productivity: arr(result.productivity),
          psychology: arr(result.psychology),
          frameworks: arr(result.frameworks),
          observations: arr(result.observations),
          quotes: arr(result.quotes),
          action_items: arr(result.action_items),
          stories: arr(result.stories),
          research_notes: arr(result.research_notes),
          patterns: arr(result.patterns),
        },
      })
      .eq("id", pageId);

    if (saveErr) throw new Error(saveErr.message);

    return res.status(200).json({ ok: true, status, confidence, statusMessage });
  } catch (err) {
    const message = err?.message ?? "Processing failed.";
    console.error("[diary/process]", pageId, message);

    // Park the page in `failed` with the reason attached so it can be retried
    // — never leave it stuck in `processing` forever.
    await serviceClient
      .from("diary_pages")
      .update({ status: "failed", status_message: message.slice(0, 400) })
      .eq("id", pageId);

    return res.status(500).json({ error: message });
  }
}

const clamp01 = (n) => (Number.isFinite(n) ? Math.min(1, Math.max(0, n)) : 0);
const arr = (v) => (Array.isArray(v) ? v.filter((x) => typeof x === "string" && x.trim()) : []);

/** Only accept a real ISO-ish date; anything else stays null rather than guessed. */
function parseDate(value) {
  if (!value || typeof value !== "string") return null;
  const m = value.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!m) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : m[0];
}
