import {
  applyCors, requireAdmin, geminiConfigured, notConfigured,
  geminiGenerate, geminiEmbed, fetchScanAsInlineData, serviceClient,
} from "../_shared.js";

/**
 * Autonomous publishing pipeline — the step runner.
 *
 * Vercel Hobby has no queue service and caps a function at 60s, so instead of
 * one long-running orchestration this advances a job by exactly ONE stage per
 * call and returns. The caller (browser poll, or a cron) keeps calling until
 * the job reaches `done`. Consequences that matter:
 *   - No stage can blow the timeout, however many pages are in flight.
 *   - A crash loses at most one stage; everything before it is committed.
 *   - Each stage is independently retryable and replaceable.
 *
 * Stage order: ocr → analyze → seo → research → embed → publish → done
 * (`thumbnail` is generated in the browser, which has real font rendering —
 * see markThumbnails below.)
 */

// analyze/seo/research used to be three separate LLM calls. Against a
// rate-limited free tier that meant 5 AI requests per page, so a handful of
// pages exhausted the per-minute quota instantly. They're now one 'enrich'
// call — 3 requests per page, and more coherent output since the model sees
// everything at once. The retired names still map forward so any job queued
// before this change finishes rather than stalling.
const NEXT_STAGE = {
  ocr: "enrich",
  analyze: "enrich",
  seo: "enrich",
  research: "enrich",
  enrich: "embed",
  embed: "publish",
  publish: "done",
};

const STALE_LOCK_MS = 3 * 60 * 1000; // a lock older than this is from a dead run

export default async function handler(req, res) {
  if (applyCors(req, res)) return;
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  const userId = await requireAdmin(req, res);
  if (!userId) return;
  if (!geminiConfigured()) return notConfigured(res);

  const { pageId, action } = req.body || {};

  try {
    if (action === "enqueue") return res.status(200).json(await enqueue(pageId, userId));
    if (action === "retry") return res.status(200).json(await retry(pageId));
    // Default: advance whatever is next.
    return res.status(200).json(await step(pageId));
  } catch (err) {
    console.error("[diary/pipeline]", err?.message ?? err);
    return res.status(500).json({ error: err?.message ?? "Pipeline error." });
  }
}

// ─── Queue control ──────────────────────────────────────────────────────────

async function enqueue(pageId, userId) {
  if (!pageId) throw new Error("pageId is required.");
  const { error } = await serviceClient
    .from("diary_jobs")
    .upsert(
      {
        page_id: pageId,
        stage: "ocr",
        status: "queued",
        attempts: 0,
        last_error: null,
        logs: [logLine("queued", `Queued by ${userId.slice(0, 8)}`)],
        locked_at: null,
        finished_at: null,
        started_at: new Date().toISOString(),
      },
      { onConflict: "page_id" }
    );
  if (error) throw new Error(error.message);
  await serviceClient.from("diary_pages").update({ status: "processing" }).eq("id", pageId);
  return { ok: true, stage: "ocr", status: "queued" };
}

async function retry(pageId) {
  const { data: job } = await serviceClient
    .from("diary_jobs").select("*").eq("page_id", pageId).maybeSingle();
  if (!job) throw new Error("No job for that page.");
  const { error } = await serviceClient
    .from("diary_jobs")
    .update({
      status: "queued",
      attempts: 0,
      last_error: null,
      locked_at: null,
      logs: [...(job.logs ?? []), logLine("retry", `Retrying from ${job.stage}`)],
    })
    .eq("page_id", pageId);
  if (error) throw new Error(error.message);
  return { ok: true, stage: job.stage, status: "queued" };
}

// ─── One stage ──────────────────────────────────────────────────────────────

async function step(pageId) {
  const job = await claimJob(pageId);
  if (!job) return { ok: true, idle: true };
  if (job.stage === "done" || job.stage === "failed") {
    return { ok: true, stage: job.stage, status: job.status, done: true };
  }

  const { data: page } = await serviceClient
    .from("diary_pages").select("*").eq("id", job.page_id).maybeSingle();
  if (!page) {
    await finishJob(job, "failed", "Page no longer exists.");
    return { ok: false, stage: "failed" };
  }

  const started = Date.now();
  try {
    let note = "";
    switch (job.stage) {
      // The three retired stage names all run the merged step, so a job
      // queued before the merge completes instead of hitting "unknown stage".
      case "ocr":      note = await stageOcr(page); break;
      case "analyze":
      case "seo":
      case "research":
      case "enrich":   note = await stageEnrich(page); break;
      case "embed":    note = await stageEmbed(page); break;
      case "publish":  note = await stagePublish(page); break;
      default: throw new Error(`Unknown stage ${job.stage}`);
    }

    const next = NEXT_STAGE[job.stage] ?? "done";
    const logs = [...(job.logs ?? []), logLine(job.stage, note, Date.now() - started)];

    if (next === "done") {
      await serviceClient.from("diary_jobs").update({
        stage: "done", status: "done", locked_at: null, logs,
        finished_at: new Date().toISOString(),
      }).eq("id", job.id);
      return { ok: true, stage: "done", status: "done", done: true, note };
    }

    await serviceClient.from("diary_jobs").update({
      stage: next, status: "queued", locked_at: null, attempts: 0, logs,
    }).eq("id", job.id);
    return { ok: true, stage: next, status: "queued", previous: job.stage, note };
  } catch (err) {
    const message = err?.message ?? "Stage failed.";
    const logs = [...(job.logs ?? []), logLine(job.stage, `Error: ${message}`, Date.now() - started)];

    // A rate limit is a "come back later", not a failure. Burning an attempt
    // on it would mean three quota errors in a row permanently killing a job
    // that was only ever going to need a short wait.
    if (err?.code === "RATE_LIMITED") {
      await serviceClient.from("diary_jobs").update({
        status: "queued", locked_at: null, last_error: message.slice(0, 500), logs,
      }).eq("id", job.id);
      return {
        ok: false,
        stage: job.stage,
        status: "queued",
        rateLimited: true,
        retryAfterMs: err.retryAfterMs ?? 30000,
        error: message,
      };
    }

    const attempts = job.attempts + 1;

    if (attempts >= job.max_attempts) {
      await serviceClient.from("diary_jobs").update({
        status: "failed", locked_at: null, attempts, last_error: message.slice(0, 500), logs,
        finished_at: new Date().toISOString(),
      }).eq("id", job.id);
      await serviceClient.from("diary_pages").update({
        status: "failed", status_message: message.slice(0, 400),
      }).eq("id", page.id);
      return { ok: false, stage: job.stage, status: "failed", error: message };
    }

    // Leave it queued so the next poll retries this same stage.
    await serviceClient.from("diary_jobs").update({
      status: "queued", locked_at: null, attempts, last_error: message.slice(0, 500), logs,
    }).eq("id", job.id);
    return { ok: false, stage: job.stage, status: "queued", willRetry: true, error: message };
  }
}

/**
 * Take the next runnable job. Uses a lock timestamp rather than SELECT FOR
 * UPDATE because the browser polls and a cron may run concurrently — without
 * this, two runners would execute the same stage twice and double-charge the
 * AI call.
 */
async function claimJob(pageId) {
  const staleBefore = new Date(Date.now() - STALE_LOCK_MS).toISOString();

  let q = serviceClient
    .from("diary_jobs")
    .select("*")
    .eq("status", "queued")
    .or(`locked_at.is.null,locked_at.lt.${staleBefore}`)
    .order("updated_at", { ascending: true })
    .limit(1);
  if (pageId) q = q.eq("page_id", pageId);

  const { data } = await q;
  const job = data?.[0];
  if (!job) return null;

  // Conditional update = the lock. If another runner won the race its
  // status is no longer 'queued' and this affects zero rows.
  const { data: locked } = await serviceClient
    .from("diary_jobs")
    .update({ status: "running", locked_at: new Date().toISOString() })
    .eq("id", job.id)
    .eq("status", "queued")
    .select("*");

  return locked?.[0] ?? null;
}

async function finishJob(job, status, error) {
  await serviceClient.from("diary_jobs").update({
    status, stage: status === "failed" ? "failed" : job.stage,
    last_error: error ?? null, locked_at: null,
    finished_at: new Date().toISOString(),
  }).eq("id", job.id);
}

const logLine = (stage, message, ms) => ({
  stage, message, ms: ms ?? null, at: new Date().toISOString(),
});

// ─── Stages ─────────────────────────────────────────────────────────────────

const OCR_SYSTEM = `You transcribe handwritten diary pages with archival accuracy.

ABSOLUTE RULES:
- Transcribe ONLY what is written. Never add, complete or infer content.
- Illegible word → [?]. Illegible region → [illegible]. Never guess.
- Never invent dates, names, numbers or quotations.
- If the image is blank, unreadable, or not a diary/notes page, say so with a
  low confidence score and leave the text empty.
- corrected_text may fix OCR slips, spacing, punctuation and paragraph breaks
  ONLY. It must remain the writer's own words — do not paraphrase or improve.`;

const OCR_SCHEMA = {
  type: "object",
  properties: {
    is_readable: { type: "boolean" },
    is_diary_page: { type: "boolean" },
    confidence: { type: "number" },
    raw_text: { type: "string" },
    corrected_text: { type: "string" },
  },
  required: ["is_readable", "is_diary_page", "confidence", "raw_text", "corrected_text"],
};

async function stageOcr(page) {
  // A page transcribed by hand shouldn't be overwritten by the machine.
  if ((page.corrected_text ?? "").trim().length > 0 && page.confidence !== null) {
    return "Text already present — skipped OCR.";
  }

  const imagePart = await fetchScanAsInlineData(page.image_path, page.mime_type);
  const r = await geminiGenerate({
    systemInstruction: OCR_SYSTEM,
    schema: OCR_SCHEMA,
    temperature: 0.1,
    parts: [imagePart, { text: "Transcribe this page. Follow the absolute rules exactly." }],
  });

  const confidence = clamp01(Number(r.confidence) || 0);
  if (!r.is_readable || !(r.corrected_text || "").trim()) {
    await serviceClient.from("diary_pages").update({
      status: "needs_review", confidence,
      ocr_text: r.raw_text || null,
      status_message: r.is_diary_page
        ? "The handwriting couldn't be read reliably — transcribe it manually or re-photograph the page."
        : "This doesn't look like a diary or notes page.",
      processed_at: new Date().toISOString(),
    }).eq("id", page.id);
    // Deliberately stops the pipeline: generating from unreadable text would
    // mean inventing content.
    throw new Error("Unreadable page — flagged for review.");
  }

  await serviceClient.from("diary_pages").update({
    ocr_text: r.raw_text || null,
    corrected_text: r.corrected_text,
    confidence,
    processed_at: new Date().toISOString(),
  }).eq("id", page.id);

  return `Transcribed ${r.corrected_text.length} chars at ${Math.round(confidence * 100)}%.`;
}

// One schema covering understanding + SEO + research material. Combining them
// is not just a cost saving: the SEO title is better when written by the same
// pass that decided the topics, and the research prompts stay consistent with
// the summary instead of drifting.
const ENRICH_SCHEMA = {
  type: "object",
  properties: {
    // understanding
    summary: { type: "string" },
    entry_date: { type: "string" },
    emotion: { type: "string" },
    intent: { type: "string" },
    tone: { type: "string" },
    audience: { type: "string" },
    difficulty: { type: "string" },
    reading_min: { type: "number" },
    primary_category: { type: "string" },
    topics: { type: "array", items: { type: "string" } },
    keywords: { type: "array", items: { type: "string" } },
    categories: { type: "array", items: { type: "string" } },
    tags: { type: "array", items: { type: "string" } },
    // extractions
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
    // seo
    seo_title: { type: "string" },
    seo_description: { type: "string" },
    seo_keywords: { type: "array", items: { type: "string" } },
    slug: { type: "string" },
    og_title: { type: "string" },
    og_description: { type: "string" },
    twitter_title: { type: "string" },
    twitter_description: { type: "string" },
    short_description: { type: "string" },
    medium_description: { type: "string" },
    long_description: { type: "string" },
    bullet_highlights: { type: "array", items: { type: "string" } },
    key_takeaways: { type: "array", items: { type: "string" } },
    // research material
    insights: { type: "array", items: { type: "string" } },
    mental_models: { type: "array", items: { type: "string" } },
    questions: { type: "array", items: { type: "string" } },
    reflection_prompts: { type: "array", items: { type: "string" } },
    journal_prompts: { type: "array", items: { type: "string" } },
    exercises: { type: "array", items: { type: "string" } },
    applications: { type: "array", items: { type: "string" } },
    checklist: { type: "array", items: { type: "string" } },
  },
  required: ["summary", "topics", "primary_category", "seo_title", "seo_description", "slug"],
};

const CATEGORIES = [
  "psychology", "business", "productivity", "mindset", "self_improvement",
  "finance", "health", "technology", "life", "relationships", "diary",
];

const RESEARCH_KEYS = [
  "insights", "lessons", "frameworks", "mental_models", "action_items",
  "questions", "reflection_prompts", "journal_prompts", "exercises",
  "applications", "checklist",
];

/**
 * Understand the page, write its SEO metadata, and build its research
 * material — in a single model call.
 */
async function stageEnrich(page) {
  const text = page.corrected_text ?? page.ocr_text ?? "";
  if (!text.trim()) throw new Error("No page text to work from.");

  const r = await geminiGenerate({
    systemInstruction:
      "You analyse a person's own diary page and prepare it for publication.\n\n" +
      "ABSOLUTE RULES:\n" +
      "- Ground every field in the supplied text. Never introduce facts, statistics, studies, " +
      "citations, events or quotations that are not in it.\n" +
      "- Quotations must appear verbatim in the text.\n" +
      "- An empty array is the correct answer when a category isn't present. Do not pad.\n" +
      "- Titles must read naturally, never keyword-stuffed.",
    schema: ENRICH_SCHEMA,
    temperature: 0.45,
    parts: [{
      text:
        `Analyse and prepare this page.\n\n` +
        `primary_category must be exactly one of: ${CATEGORIES.join(", ")}.\n` +
        `entry_date only if a full date is written on the page, otherwise empty.\n` +
        `reading_min = realistic minutes to read.\n` +
        `seo_title <= 60 chars. seo_description 140-158 chars. slug lowercase-hyphenated <= 60.\n` +
        `og/twitter titles <= 60, descriptions <= 200.\n` +
        `short_description ~1 sentence, medium ~3 sentences, long ~2 paragraphs.\n\n` +
        `---\n${text}`,
    }],
  });

  const slug = await uniqueSlug(slugish(r.slug || r.seo_title || "diary-entry"), page.id);
  const site = (process.env.VITE_SITE_URL || "").replace(/\/$/, "");
  const research = Object.fromEntries(RESEARCH_KEYS.map((k) => [k, arr(r[k])]));

  const { error } = await serviceClient.from("diary_pages").update({
    // understanding
    summary: r.summary || null,
    entry_date: parseDate(r.entry_date),
    emotion: r.emotion || null,
    intent: r.intent || null,
    tone: r.tone || null,
    audience: r.audience || null,
    difficulty: r.difficulty || null,
    reading_min: Number.isFinite(r.reading_min) ? Math.max(1, Math.round(r.reading_min)) : null,
    topics: arr(r.topics),
    keywords: arr(r.keywords),
    categories: uniq([slugish(r.primary_category), ...arr(r.categories).map(slugish)]),
    tags: uniq(arr(r.tags).map((t) => t.toLowerCase())),
    extracted: {
      lessons: arr(r.lessons), ideas: arr(r.ideas), business_ideas: arr(r.business_ideas),
      productivity: arr(r.productivity), psychology: arr(r.psychology),
      frameworks: arr(r.frameworks), observations: arr(r.observations),
      quotes: arr(r.quotes), action_items: arr(r.action_items), stories: arr(r.stories),
      research_notes: arr(r.research_notes), patterns: arr(r.patterns),
    },
    // seo
    slug,
    seo: {
      title: r.seo_title,
      description: r.seo_description,
      keywords: arr(r.seo_keywords),
      canonical: site ? `${site}/insights/${slug}` : null,
      robots: "index, follow",
      og: {
        title: r.og_title || r.seo_title,
        description: r.og_description || r.seo_description,
        type: "article",
      },
      twitter: {
        card: "summary_large_image",
        title: r.twitter_title || r.seo_title,
        description: r.twitter_description || r.seo_description,
      },
      jsonld: {
        "@context": "https://schema.org",
        "@type": "Article",
        headline: r.seo_title,
        description: r.seo_description,
        datePublished: page.entry_date ?? page.created_at,
        dateModified: new Date().toISOString(),
        author: { "@type": "Person", name: "badly talks" },
        keywords: arr(r.seo_keywords).join(", "),
      },
    },
    descriptions: {
      short: r.short_description,
      medium: r.medium_description,
      long: r.long_description,
      bullets: arr(r.bullet_highlights),
      takeaways: arr(r.key_takeaways),
    },
    research,
  }).eq("id", page.id);

  if (error) throw new Error(error.message);

  const items = Object.values(research).reduce((n, v) => n + v.length, 0);
  return `${slugish(r.primary_category)} · ${arr(r.topics).length} topics · ${items} research items · /${slug}`;
}

async function stageEmbed(page) {
  const text = [
    page.summary, (page.topics ?? []).join(" "), (page.keywords ?? []).join(" "),
    page.corrected_text ?? page.ocr_text ?? "",
  ].filter(Boolean).join("\n");

  const vector = await geminiEmbed(text);
  // pgvector accepts the JSON array form over PostgREST.
  await serviceClient.from("diary_pages").update({ embedding: JSON.stringify(vector) }).eq("id", page.id);
  return `Embedded (${vector.length} dims).`;
}

/**
 * Route the finished page to the right destination table.
 * Deterministic mapping off the analysed category — a second AI call here
 * would add cost and nondeterminism for a decision the analysis already made.
 */
const ROUTE = {
  psychology:       { table: "content_items", type: "protocol",  label: "Protocols" },
  business:         { table: "content_items", type: "framework", label: "Frameworks" },
  productivity:     { table: "content_items", type: "framework", label: "Frameworks" },
  mindset:          { table: "content_items", type: "protocol",  label: "Protocols" },
  self_improvement: { table: "content_items", type: "protocol",  label: "Protocols" },
  finance:          { table: "content_items", type: "framework", label: "Frameworks" },
  health:           { table: "content_items", type: "protocol",  label: "Protocols" },
  technology:       { table: "research_papers", label: "Research Papers" },
  life:             { table: "content_items", type: "pdf", label: "Premium Library" },
  relationships:    { table: "content_items", type: "pdf", label: "Premium Library" },
  diary:            { table: null, label: "Diary only" },
};

async function stagePublish(page) {
  if (!page.auto_publish) return "Auto-publish disabled — kept in the Diary.";

  const category = (page.categories ?? [])[0] ?? "diary";
  const route = ROUTE[category] ?? ROUTE.diary;

  await serviceClient.from("diary_pages").update({
    status: "processed", status_message: null,
  }).eq("id", page.id);

  if (!route.table) return "Kept in the Diary (personal entry).";

  const { data: site } = await serviceClient
    .from("websites").select("id").eq("slug", "clarity-mode").maybeSingle();

  const seo = page.seo ?? {};
  const desc = page.descriptions ?? {};
  const research = page.research ?? {};
  const title = seo.title || page.summary?.slice(0, 80) || "Untitled";

  // Compose a self-contained body so the published piece is readable on its
  // own. Without this a reader who clicked through got a title and a
  // one-liner, because everything substantial lived in the private diary row.
  const body = [
    desc.long || desc.medium || page.summary || "",
    section("Key takeaways", desc.takeaways),
    section("Highlights", desc.bullets),
    section("How to apply this", research.applications),
    section("Practice", research.exercises),
    section("Questions to sit with", research.reflection_prompts),
  ].filter(Boolean).join("\n\n").trim();
  // Everything lands as a DRAFT: the pipeline is autonomous, but pushing the
  // owner's private diary onto the public site without a look is not a
  // decision software should make on its own.
  const common = {
    website_id: site?.id ?? null,
    title,
    description: desc.short || desc.medium || page.summary || null,
    body: body || null,
    highlights: arr(desc.takeaways).slice(0, 6),
    status: "draft",
    visibility: "premium",
    tags: page.tags ?? [],
    cover_url: (page.thumbnails ?? {})["1200x630"] ?? null,
  };

  let inserted;
  if (route.table === "research_papers") {
    const { data, error } = await serviceClient.from("research_papers").insert({
      website_id: common.website_id,
      title,
      author: "badly talks",
      category: "general",
      abstract: body || desc.long || desc.medium || page.summary,
      tags: common.tags,
      visibility: "premium",
      status: "draft",
      cover_url: common.cover_url,
    }).select("id").single();
    if (error) throw new Error(`Publish failed: ${error.message}`);
    inserted = data;
  } else {
    const { data, error } = await serviceClient.from("content_items").insert({
      ...common,
      type: route.type,
      category,
      price: 0,
    }).select("id").single();
    if (error) throw new Error(`Publish failed: ${error.message}`);
    inserted = data;
  }

  await serviceClient.from("diary_pages").update({
    published_to_table: route.table,
    published_to_id: inserted.id,
  }).eq("id", page.id);

  return `Routed to ${route.label} as a draft.`;
}

// ─── helpers ────────────────────────────────────────────────────────────────

/** Render a heading + bullet list, or nothing at all when the list is empty. */
function section(heading, items) {
  const list = arr(items);
  if (list.length === 0) return "";
  return `## ${heading}\n${list.map((i) => `- ${i}`).join("\n")}`;
}

const clamp01 = (n) => (Number.isFinite(n) ? Math.min(1, Math.max(0, n)) : 0);
const arr = (v) => (Array.isArray(v) ? v.filter((x) => typeof x === "string" && x.trim()) : []);
const uniq = (a) => Array.from(new Set(a.filter(Boolean)));

const slugish = (s) =>
  String(s || "").toLowerCase().trim()
    .replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60) || "entry";

function parseDate(value) {
  if (!value || typeof value !== "string") return null;
  const m = value.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!m) return null;
  return Number.isNaN(new Date(value).getTime()) ? null : m[0];
}

/** Slugs are uniquely indexed, so suffix until free rather than letting insert fail. */
async function uniqueSlug(base, pageId) {
  for (let i = 0; i < 25; i++) {
    const candidate = i === 0 ? base : `${base}-${i + 1}`;
    const { data } = await serviceClient
      .from("diary_pages").select("id").eq("slug", candidate).maybeSingle();
    if (!data || data.id === pageId) return candidate;
  }
  return `${base}-${Date.now().toString(36)}`;
}
