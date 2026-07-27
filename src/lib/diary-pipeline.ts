import { supabase } from "@/lib/supabase";
import { DIARY_BUCKET, getPage, type DiaryPage } from "@/lib/diary";
import { renderThumbnails } from "@/lib/diary-thumbnail";

/**
 * Client-side orchestrator for the autonomous pipeline.
 *
 * The server advances one stage per call (Vercel Hobby has no queue service
 * and a 60s function ceiling), so something has to keep calling it. That's
 * this: enqueue → poll until done, generating thumbnails locally when the
 * page has enough metadata to draw them.
 */

export type PipelineStage =
  | "ocr" | "analyze" | "seo" | "research" | "embed" | "thumbnail" | "publish" | "done" | "failed";

export const STAGE_LABELS: Record<PipelineStage, string> = {
  ocr: "Reading handwriting",
  analyze: "Understanding the page",
  seo: "Writing SEO metadata",
  research: "Building research material",
  embed: "Indexing for search",
  thumbnail: "Designing thumbnails",
  publish: "Publishing",
  done: "Complete",
  failed: "Failed",
};

export const STAGE_ORDER: PipelineStage[] = [
  "ocr", "analyze", "seo", "research", "embed", "thumbnail", "publish", "done",
];

export type DiaryJob = {
  id: string;
  page_id: string;
  stage: PipelineStage;
  status: "queued" | "running" | "done" | "failed";
  attempts: number;
  max_attempts: number;
  last_error: string | null;
  logs: { stage: string; message: string; ms: number | null; at: string }[];
  started_at: string;
  finished_at: string | null;
  updated_at: string;
};

async function call(body: Record<string, unknown>) {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error("You must be signed in.");

  const res = await fetch("/api/diary/pipeline", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${session.access_token}`,
    },
    body: JSON.stringify(body),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(json.error || `Pipeline call failed (${res.status})`) as Error & { code?: string };
    err.code = json.code;
    throw err;
  }
  return json as StepResult;
}

type StepResult = {
  ok: boolean;
  stage: PipelineStage;
  status?: string;
  done?: boolean;
  error?: string;
  note?: string;
  rateLimited?: boolean;
  retryAfterMs?: number;
};

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export const enqueuePage = (pageId: string) => call({ pageId, action: "enqueue" });
export const retryPage = (pageId: string) => call({ pageId, action: "retry" });
export const stepPage = (pageId?: string) => call(pageId ? { pageId } : {});

export async function getJob(pageId: string): Promise<DiaryJob | null> {
  const { data } = await supabase.from("diary_jobs").select("*").eq("page_id", pageId).maybeSingle();
  return (data as DiaryJob) ?? null;
}

export async function listJobs(): Promise<DiaryJob[]> {
  const { data } = await supabase
    .from("diary_jobs").select("*").order("updated_at", { ascending: false }).limit(100);
  return (data ?? []) as DiaryJob[];
}

// ─── Thumbnails ─────────────────────────────────────────────────────────────

async function uploadBlob(path: string, blob: Blob, token: string, contentType: string) {
  const res = await fetch(
    `${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/${DIARY_BUCKET}/${path}`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        apikey: import.meta.env.VITE_SUPABASE_ANON_KEY as string,
        "Content-Type": contentType,
        "x-upsert": "true",
      },
      body: blob,
    }
  );
  if (!res.ok) throw new Error(`Thumbnail upload failed (${res.status})`);
}

/**
 * Draw and store every thumbnail size/format for a page, recording the paths
 * on the row. Runs in the browser because Canvas gives real typography.
 */
export async function generateThumbnails(page: DiaryPage): Promise<number> {
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token;
  if (!token) throw new Error("You must be signed in.");

  const seo = (page.seo ?? {}) as { title?: string };
  const title = seo.title || page.summary || page.original_filename || "Diary entry";

  const rendered = await renderThumbnails({
    title,
    topics: page.topics ?? [],
    category: (page.categories ?? [])[0],
  });

  const map: Record<string, string> = {};
  for (const t of rendered) {
    const path = `thumbnails/${page.id}/${t.key}.${t.ext}`;
    await uploadBlob(path, t.blob, token, t.mime);
    // WebP is the preferred source for each size; png/jpeg stay addressable
    // under their own keys for anything that can't take WebP.
    if (t.ext === "webp") map[t.key] = path;
    map[`${t.key}.${t.ext}`] = path;
  }

  const { error } = await supabase.from("diary_pages").update({ thumbnails: map }).eq("id", page.id);
  if (error) throw error;
  return rendered.length;
}

// ─── Full run ───────────────────────────────────────────────────────────────

export type ProgressFn = (info: { stage: PipelineStage; note?: string; error?: string }) => void;

/**
 * Drive one page from upload to published without further input.
 * Server stages are advanced by polling; the thumbnail stage is handled here
 * between `embed` and `publish` so the published row can reference a real
 * cover image.
 */
export async function runPipeline(
  pageId: string,
  onProgress?: ProgressFn,
  opts: { maxSteps?: number } = {}
): Promise<{ ok: boolean; stage: PipelineStage; error?: string }> {
  // Generous, because rate-limit waits consume iterations without progress.
  const maxSteps = opts.maxSteps ?? 80;

  await enqueuePage(pageId);
  onProgress?.({ stage: "ocr" });

  let thumbsDone = false;

  for (let i = 0; i < maxSteps; i++) {
    const job = await getJob(pageId);
    if (!job) return { ok: false, stage: "failed", error: "Job disappeared." };

    if (job.status === "failed") {
      onProgress?.({ stage: "failed", error: job.last_error ?? undefined });
      return { ok: false, stage: "failed", error: job.last_error ?? "Pipeline failed." };
    }
    if (job.stage === "done") {
      onProgress?.({ stage: "done" });
      return { ok: true, stage: "done" };
    }

    // Slot the local thumbnail stage in once the page has its SEO title and
    // topics, and before publish so the draft can carry the cover.
    if (!thumbsDone && job.stage === "publish") {
      onProgress?.({ stage: "thumbnail" });
      const fresh = await getPage(pageId);
      if (fresh) {
        try {
          const n = await generateThumbnails(fresh);
          onProgress?.({ stage: "thumbnail", note: `${n} images` });
        } catch (e) {
          // A missing thumbnail must not sink an otherwise good run.
          onProgress?.({ stage: "thumbnail", error: e instanceof Error ? e.message : "Thumbnail failed" });
        }
      }
      thumbsDone = true;
    }

    const result = await stepPage(pageId);

    // The free tier is rate limited; the server tells us how long to wait.
    // Honour it instead of hammering, and don't count it as a failure.
    if (result.rateLimited) {
      const waitMs = Math.min(result.retryAfterMs ?? 30000, 60000);
      onProgress?.({
        stage: result.stage,
        note: `Rate limited — resuming in ${Math.ceil(waitMs / 1000)}s`,
      });
      await sleep(waitMs);
      continue;
    }

    onProgress?.({ stage: result.stage, note: result.note, error: result.error });

    if (result.done) return { ok: true, stage: "done" };
    if (result.status === "failed") {
      return { ok: false, stage: result.stage, error: result.error };
    }
  }

  return { ok: false, stage: "failed", error: "Pipeline exceeded its step budget." };
}

/** Run several pages with limited concurrency so we don't hammer the API. */
export async function runPipelineBatch(
  pageIds: string[],
  onProgress?: (pageId: string, info: { stage: PipelineStage; note?: string; error?: string }) => void,
  // Serial by default: the AI provider is rate limited per minute, so running
  // pages in parallel just converts throughput into 429s.
  concurrency = 1
): Promise<Record<string, { ok: boolean; error?: string }>> {
  const results: Record<string, { ok: boolean; error?: string }> = {};
  const queue = [...pageIds];

  const worker = async () => {
    for (;;) {
      const id = queue.shift();
      if (!id) return;
      try {
        const r = await runPipeline(id, (info) => onProgress?.(id, info));
        results[id] = { ok: r.ok, error: r.error };
      } catch (e) {
        results[id] = { ok: false, error: e instanceof Error ? e.message : "Failed" };
      }
    }
  };

  await Promise.all(Array.from({ length: Math.min(concurrency, pageIds.length) }, worker));
  return results;
}
