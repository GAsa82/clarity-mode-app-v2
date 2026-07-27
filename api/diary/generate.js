import {
  applyCors, requireAdmin, geminiConfigured, notConfigured, geminiGenerate, serviceClient,
} from "./_shared.js";

/**
 * Generate a downstream asset (PDF, audio script, template, insight, research
 * paper, article) from one or more processed diary pages.
 *
 * Same governing constraint as transcription: everything produced must come
 * from the supplied diary text. The asset stores `source_page_ids`, so any
 * claim in a generated document can be walked back to the handwritten page it
 * came from — which is only meaningful if the model didn't invent material.
 */

const KIND_BRIEF = {
  pdf: "a polished PDF document with a cover, contents and clear sections",
  audio: "an audio episode: narration script, description and key takeaways",
  template: "a reusable worksheet/template the reader can fill in",
  insight: "an insight report: observations, recurring patterns, recommendations",
  research_paper:
    "a personal research document: abstract, introduction, sections, findings, open questions. " +
    "This is personal research derived from the author's own notes — it is NOT an academic paper, " +
    "must NOT cite external literature, and must NOT be framed as peer-reviewed",
  article: "a publishable article with a hook, body and conclusion",
};

const SYSTEM = `You turn a person's own handwritten diary notes into polished written assets.

ABSOLUTE RULES:
- Build ONLY on the diary text provided. Never introduce facts, statistics,
  studies, citations, events, names or quotations that are not in that text.
- Never fabricate external references. The only legitimate references are the
  author's own diary pages, referred to by their page numbers as given.
- If the supplied material is too thin to support the requested asset, say so
  in the "insufficient_material" field rather than padding it out with
  invented or generic filler.
- Write in the author's own register — reflective and direct, not corporate.
- Quotations are permitted ONLY when the words appear verbatim in the diary text.

You may organise, structure, expand on and articulate the author's ideas. You
may not add substance that isn't theirs.`;

const SCHEMA = {
  type: "object",
  properties: {
    insufficient_material: { type: "boolean" },
    insufficient_reason: { type: "string" },
    title: { type: "string" },
    subtitle: { type: "string" },
    abstract: { type: "string" },
    description: { type: "string" },
    table_of_contents: { type: "array", items: { type: "string" } },
    sections: {
      type: "array",
      items: {
        type: "object",
        properties: { heading: { type: "string" }, body: { type: "string" } },
        required: ["heading", "body"],
      },
    },
    key_points: { type: "array", items: { type: "string" } },
    action_steps: { type: "array", items: { type: "string" } },
    open_questions: { type: "array", items: { type: "string" } },
    script: { type: "string" },
    estimated_duration_min: { type: "number" },
    source_page_numbers: { type: "array", items: { type: "number" } },
  },
  required: ["insufficient_material", "title"],
};

export default async function handler(req, res) {
  if (applyCors(req, res)) return;
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  const userId = await requireAdmin(req, res);
  if (!userId) return;
  if (!geminiConfigured()) return notConfigured(res);

  const { kind, pageIds, instruction } = req.body || {};
  if (!kind || !KIND_BRIEF[kind]) {
    return res.status(400).json({ error: `kind must be one of: ${Object.keys(KIND_BRIEF).join(", ")}` });
  }
  if (!Array.isArray(pageIds) || pageIds.length === 0) {
    return res.status(400).json({ error: "pageIds must be a non-empty array." });
  }

  const { data: pages, error } = await serviceClient
    .from("diary_pages")
    .select("id, corrected_text, ocr_text, summary, topics, entry_date, created_at, extracted")
    .in("id", pageIds)
    .order("entry_date", { ascending: true, nullsFirst: false });

  if (error) return res.status(500).json({ error: error.message });
  if (!pages?.length) return res.status(404).json({ error: "No matching diary pages." });

  // Only pages with real text can support generation.
  const usable = pages.filter((p) => (p.corrected_text ?? p.ocr_text ?? "").trim().length > 0);
  if (usable.length === 0) {
    return res.status(400).json({
      error:
        "None of the selected pages have any text yet. Process them first, or type the transcription in manually.",
      code: "NO_TEXT",
    });
  }

  // Numbered so the model can reference pages and we can map back to real ids.
  const corpus = usable
    .map((p, i) => {
      const date = p.entry_date ? ` (${p.entry_date})` : "";
      return `--- Diary page ${i + 1}${date} ---\n${(p.corrected_text ?? p.ocr_text ?? "").trim()}`;
    })
    .join("\n\n");

  try {
    const result = await geminiGenerate({
      systemInstruction: SYSTEM,
      schema: SCHEMA,
      temperature: 0.6, // some craft is wanted here, unlike transcription
      parts: [
        {
          text:
            `Produce ${KIND_BRIEF[kind]}.\n\n` +
            (instruction ? `Additional direction from the author: ${instruction}\n\n` : "") +
            `Use only the following diary pages. Reference them by their page numbers.\n\n${corpus}`,
        },
      ],
    });

    if (result.insufficient_material) {
      return res.status(422).json({
        error:
          result.insufficient_reason ||
          "There isn't enough diary material yet to build this without inventing content.",
        code: "INSUFFICIENT_MATERIAL",
      });
    }

    // Map the model's 1-based page numbers back to real ids; fall back to
    // everything we fed it so the citation trail is never empty.
    const cited = Array.isArray(result.source_page_numbers)
      ? result.source_page_numbers
          .map((n) => usable[Number(n) - 1]?.id)
          .filter(Boolean)
      : [];
    const sourceIds = cited.length ? Array.from(new Set(cited)) : usable.map((p) => p.id);

    const { data: asset, error: insertErr } = await serviceClient
      .from("diary_assets")
      .insert({
        kind,
        title: result.title || "Untitled",
        subtitle: result.subtitle || null,
        content: stripNulls(result),
        source_page_ids: sourceIds,
        duration_sec: result.estimated_duration_min
          ? Math.round(Number(result.estimated_duration_min) * 60)
          : null,
        status: "draft",
        created_by: userId,
      })
      .select("*")
      .single();

    if (insertErr) throw new Error(insertErr.message);
    return res.status(200).json({ ok: true, asset });
  } catch (err) {
    const message = err?.message ?? "Generation failed.";
    console.error("[diary/generate]", kind, message);
    return res.status(500).json({ error: message });
  }
}

/** Keep the stored jsonb tidy — drop empty/absent fields rather than storing nulls. */
function stripNulls(obj) {
  const out = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v === null || v === undefined || v === "") continue;
    if (Array.isArray(v) && v.length === 0) continue;
    if (k === "insufficient_material" || k === "insufficient_reason") continue;
    out[k] = v;
  }
  return out;
}
