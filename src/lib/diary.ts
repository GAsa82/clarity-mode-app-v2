import { supabase } from "@/lib/supabase";

/**
 * Diary — the admin-only knowledge engine.
 *
 * Diary scans live in the PRIVATE `diary-private` bucket, so every image is
 * read through a short-lived signed URL rather than a public URL. Nothing here
 * is reachable by a non-admin: the tables are RLS'd to `is_admin_user()` and
 * the bucket has matching storage policies.
 */

export const DIARY_BUCKET = "diary-private";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

// ─── Types ──────────────────────────────────────────────────────────────────

export type DiaryStatus =
  | "pending"
  | "processing"
  | "needs_review"
  | "processed"
  | "failed"
  | "archived";

export type DiaryAssetKind =
  | "pdf"
  | "audio"
  | "template"
  | "insight"
  | "research_paper"
  | "article";

export type DiaryAssetStatus =
  | "draft"
  | "review"
  | "approved"
  | "published"
  | "rejected"
  | "archived";

/** Structured extractions pulled out of a page. All optional — a page only has what it has. */
export type DiaryExtraction = {
  lessons?: string[];
  ideas?: string[];
  business_ideas?: string[];
  productivity?: string[];
  psychology?: string[];
  frameworks?: string[];
  observations?: string[];
  quotes?: string[];
  action_items?: string[];
  stories?: string[];
  research_notes?: string[];
  patterns?: string[];
};

export type DiaryPage = {
  id: string;
  collection_id: string | null;
  image_path: string;
  thumbnail_path: string | null;
  original_filename: string | null;
  file_size_bytes: number | null;
  mime_type: string | null;
  content_hash: string | null;
  page_number: number | null;
  entry_date: string | null;
  status: DiaryStatus;
  status_message: string | null;
  processing_started_at: string | null;
  processed_at: string | null;
  confidence: number | null;
  ocr_text: string | null;
  corrected_text: string | null;
  summary: string | null;
  topics: string[];
  keywords: string[];
  categories: string[];
  tags: string[];
  emotion: string | null;
  extracted: DiaryExtraction;
  version: number;
  created_by: string | null;
  created_at: string;
  updated_at: string;

  // Populated by the autonomous pipeline.
  seo: DiarySeo;
  descriptions: DiaryDescriptions;
  research: Record<string, string[]>;
  /** size key (e.g. "1200x630", "800x800.png") → storage path in the private bucket */
  thumbnails: Record<string, string>;
  intent: string | null;
  tone: string | null;
  audience: string | null;
  difficulty: string | null;
  reading_min: number | null;
  slug: string | null;
  auto_publish: boolean;
  published_to_table: string | null;
  published_to_id: string | null;
};

export type DiarySeo = {
  title?: string;
  description?: string;
  keywords?: string[];
  canonical?: string | null;
  robots?: string;
  og?: { title?: string; description?: string; type?: string };
  twitter?: { card?: string; title?: string; description?: string };
  jsonld?: Record<string, unknown>;
};

export type DiaryDescriptions = {
  short?: string;
  medium?: string;
  long?: string;
  bullets?: string[];
  takeaways?: string[];
};

export type DiaryCollection = {
  id: string;
  name: string;
  slug: string | null;
  description: string | null;
  color: string | null;
  sort: number | null;
  created_at: string;
  updated_at: string;
};

export type DiaryAsset = {
  id: string;
  kind: DiaryAssetKind;
  title: string;
  subtitle: string | null;
  content: Record<string, unknown>;
  source_page_ids: string[];
  file_path: string | null;
  file_size_bytes: number | null;
  duration_sec: number | null;
  status: DiaryAssetStatus;
  published_ref_table: string | null;
  published_ref_id: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

export type DiaryPageVersion = {
  id: string;
  page_id: string;
  version: number;
  corrected_text: string | null;
  summary: string | null;
  changed_by: string | null;
  change_note: string | null;
  created_at: string;
};

// `embedding` is deliberately excluded — 768 floats per row would bloat every
// list response for data only the database needs.
const PAGE_COLUMNS =
  "id, collection_id, image_path, thumbnail_path, original_filename, file_size_bytes, mime_type, " +
  "content_hash, page_number, entry_date, status, status_message, processing_started_at, processed_at, " +
  "confidence, ocr_text, corrected_text, summary, topics, keywords, categories, tags, emotion, " +
  "extracted, version, created_by, created_at, updated_at, " +
  "seo, descriptions, research, thumbnails, intent, tone, audience, difficulty, reading_min, slug, " +
  "auto_publish, published_to_table, published_to_id";

// ─── Signed URLs ────────────────────────────────────────────────────────────

/**
 * Mint signed URLs for private diary objects. Batched because a grid view
 * needs dozens at once and one request beats N round-trips.
 */
export async function signDiaryPaths(
  paths: string[],
  expiresInSec = 60 * 60
): Promise<Record<string, string>> {
  const unique = Array.from(new Set(paths.filter(Boolean)));
  if (unique.length === 0) return {};

  const { data, error } = await supabase.storage
    .from(DIARY_BUCKET)
    .createSignedUrls(unique, expiresInSec);

  if (error || !data) return {};

  const map: Record<string, string> = {};
  for (const row of data) {
    // `path` echoes back the input; signedUrl is null for objects that failed.
    if (row.path && row.signedUrl) map[row.path] = row.signedUrl;
  }
  return map;
}

export async function signDiaryPath(path: string, expiresInSec = 60 * 60): Promise<string | null> {
  const map = await signDiaryPaths([path], expiresInSec);
  return map[path] ?? null;
}

// ─── Upload ─────────────────────────────────────────────────────────────────

/** SHA-256 of the raw bytes — the basis for duplicate detection. */
export async function hashFile(file: File): Promise<string> {
  const buf = await file.arrayBuffer();
  const digest = await crypto.subtle.digest("SHA-256", buf);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/**
 * Downscaled JPEG preview so the library grid doesn't pull full-resolution
 * scans (often 5-10MB each). Returns null for non-images (e.g. PDF scans),
 * which simply fall back to the source file.
 */
async function makeThumbnail(file: File, maxEdge = 640): Promise<Blob | null> {
  if (!file.type.startsWith("image/")) return null;
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, maxEdge / Math.max(bitmap.width, bitmap.height));
    const w = Math.max(1, Math.round(bitmap.width * scale));
    const h = Math.max(1, Math.round(bitmap.height * scale));
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    ctx.drawImage(bitmap, 0, 0, w, h);
    bitmap.close?.();
    return await new Promise((resolve) =>
      canvas.toBlob((b) => resolve(b), "image/jpeg", 0.82)
    );
  } catch {
    // A corrupt or unsupported image shouldn't block the real upload.
    return null;
  }
}

/** True when a page with these exact bytes already exists. */
export async function findDuplicate(hash: string): Promise<DiaryPage | null> {
  const { data } = await supabase
    .from("diary_pages")
    .select(PAGE_COLUMNS)
    .eq("content_hash", hash)
    .limit(1)
    .maybeSingle();
  return (data as DiaryPage) ?? null;
}

function uploadBlob(
  path: string,
  body: Blob,
  token: string,
  contentType: string,
  onProgress?: (pct: number) => void
): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", `${SUPABASE_URL}/storage/v1/object/${DIARY_BUCKET}/${path}`);
    xhr.setRequestHeader("Authorization", `Bearer ${token}`);
    xhr.setRequestHeader("apikey", SUPABASE_ANON_KEY);
    xhr.setRequestHeader("Content-Type", contentType);
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable && onProgress) {
        onProgress(Math.round((e.loaded / e.total) * 100));
      }
    };
    xhr.onload = () =>
      xhr.status >= 200 && xhr.status < 300
        ? resolve()
        : reject(new Error(`Upload failed (${xhr.status}): ${xhr.responseText.slice(0, 200)}`));
    xhr.onerror = () => reject(new Error("Network error during upload."));
    xhr.send(body);
  });
}

export type UploadResult =
  | { ok: true; page: DiaryPage }
  | { ok: false; duplicateOf: DiaryPage }
  | { ok: false; error: string };

/**
 * Upload one diary page: hash → dedupe check → store original + thumbnail →
 * insert the row as `pending` for the processing pipeline to pick up.
 */
export async function uploadDiaryPage(
  file: File,
  opts: { allowDuplicate?: boolean; onProgress?: (pct: number) => void } = {}
): Promise<UploadResult> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const token = session?.access_token;
  if (!token) return { ok: false, error: "You must be signed in." };

  try {
    const hash = await hashFile(file);

    if (!opts.allowDuplicate) {
      const dupe = await findDuplicate(hash);
      if (dupe) return { ok: false, duplicateOf: dupe };
    }

    const ext = file.name.includes(".") ? file.name.split(".").pop()!.slice(0, 8) : "bin";
    const id = crypto.randomUUID();
    const imagePath = `pages/${id}.${ext}`;

    await uploadBlob(
      imagePath,
      file,
      token,
      file.type || "application/octet-stream",
      opts.onProgress
    );

    let thumbnailPath: string | null = null;
    const thumb = await makeThumbnail(file);
    if (thumb) {
      thumbnailPath = `thumbs/${id}.jpg`;
      try {
        await uploadBlob(thumbnailPath, thumb, token, "image/jpeg");
      } catch {
        // A missing thumbnail degrades the grid to the full image — not fatal.
        thumbnailPath = null;
      }
    }

    const { data, error } = await supabase
      .from("diary_pages")
      .insert({
        image_path: imagePath,
        thumbnail_path: thumbnailPath,
        original_filename: file.name,
        file_size_bytes: file.size,
        mime_type: file.type || null,
        content_hash: hash,
        status: "pending",
        created_by: session.user.id,
      })
      .select(PAGE_COLUMNS)
      .single();

    if (error) return { ok: false, error: error.message };
    return { ok: true, page: data as DiaryPage };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Upload failed." };
  }
}

// ─── Queries ────────────────────────────────────────────────────────────────

export type PageFilters = {
  search?: string;
  status?: DiaryStatus | "all";
  collectionId?: string | "all";
  tag?: string;
  limit?: number;
  offset?: number;
};

export async function listPages(filters: PageFilters = {}): Promise<{ pages: DiaryPage[]; total: number }> {
  const { search, status = "all", collectionId = "all", tag, limit = 60, offset = 0 } = filters;

  let query = supabase
    .from("diary_pages")
    .select(PAGE_COLUMNS, { count: "exact" })
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (status !== "all") query = query.eq("status", status);
  if (collectionId !== "all") query = query.eq("collection_id", collectionId);
  if (tag) query = query.contains("tags", [tag]);

  // Postgres full-text over the stored search_vector (summary/topics/keywords/
  // tags/body). websearch_to_tsquery handles quoted phrases and OR naturally.
  if (search?.trim()) query = query.textSearch("search_vector", search.trim(), { type: "websearch" });

  const { data, error, count } = await query;
  if (error) throw error;
  return { pages: (data ?? []) as DiaryPage[], total: count ?? 0 };
}

export async function getPage(id: string): Promise<DiaryPage | null> {
  const { data } = await supabase.from("diary_pages").select(PAGE_COLUMNS).eq("id", id).maybeSingle();
  return (data as DiaryPage) ?? null;
}

export async function getPageVersions(pageId: string): Promise<DiaryPageVersion[]> {
  const { data } = await supabase
    .from("diary_page_versions")
    .select("*")
    .eq("page_id", pageId)
    .order("version", { ascending: false });
  return (data ?? []) as DiaryPageVersion[];
}

// ─── Mutations ──────────────────────────────────────────────────────────────

/**
 * Save edited text. The previous revision is snapshotted first so the original
 * machine output is never lost behind a human edit.
 */
export async function savePageText(
  page: DiaryPage,
  next: { corrected_text?: string | null; summary?: string | null },
  changeNote = "Edited by admin"
): Promise<void> {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  await supabase.from("diary_page_versions").insert({
    page_id: page.id,
    version: page.version,
    corrected_text: page.corrected_text,
    summary: page.summary,
    changed_by: session?.user.id ?? null,
    change_note: changeNote,
  });

  const { error } = await supabase
    .from("diary_pages")
    .update({ ...next, version: page.version + 1 })
    .eq("id", page.id);
  if (error) throw error;
}

export async function setPageStatus(ids: string[], status: DiaryStatus): Promise<void> {
  if (ids.length === 0) return;
  const { error } = await supabase.from("diary_pages").update({ status }).in("id", ids);
  if (error) throw error;
}

export async function updatePage(id: string, patch: Partial<DiaryPage>): Promise<void> {
  const { error } = await supabase.from("diary_pages").update(patch).eq("id", id);
  if (error) throw error;
}

/** Delete rows and their stored originals/thumbnails together — no orphans. */
export async function deletePages(pages: Pick<DiaryPage, "id" | "image_path" | "thumbnail_path">[]): Promise<void> {
  if (pages.length === 0) return;

  const { error } = await supabase
    .from("diary_pages")
    .delete()
    .in("id", pages.map((p) => p.id));
  if (error) throw error;

  const paths = pages.flatMap((p) => [p.image_path, p.thumbnail_path].filter(Boolean) as string[]);
  if (paths.length) {
    await supabase.storage.from(DIARY_BUCKET).remove(paths).catch(() => {});
  }
}

// ─── Collections ────────────────────────────────────────────────────────────

export async function listCollections(): Promise<DiaryCollection[]> {
  const { data } = await supabase
    .from("diary_collections")
    .select("*")
    .order("sort", { ascending: true })
    .order("name", { ascending: true });
  return (data ?? []) as DiaryCollection[];
}

export async function createCollection(name: string, description?: string): Promise<void> {
  const slug = name.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  const { error } = await supabase
    .from("diary_collections")
    .insert({ name: name.trim(), slug: slug || null, description: description || null });
  if (error) throw error;
}

// ─── Assets ─────────────────────────────────────────────────────────────────

export async function listAssets(kind?: DiaryAssetKind): Promise<DiaryAsset[]> {
  let query = supabase.from("diary_assets").select("*").order("created_at", { ascending: false });
  if (kind) query = query.eq("kind", kind);
  const { data } = await query;
  return (data ?? []) as DiaryAsset[];
}

export async function setAssetStatus(ids: string[], status: DiaryAssetStatus): Promise<void> {
  if (ids.length === 0) return;
  const { error } = await supabase.from("diary_assets").update({ status }).in("id", ids);
  if (error) throw error;
}

export async function updateAsset(id: string, patch: Partial<DiaryAsset>): Promise<void> {
  const { error } = await supabase.from("diary_assets").update(patch).eq("id", id);
  if (error) throw error;
}

/** Delete asset rows and any rendered file they reference — no orphans in storage. */
export async function deleteAssets(assets: Pick<DiaryAsset, "id" | "file_path">[]): Promise<void> {
  if (assets.length === 0) return;
  const { error } = await supabase
    .from("diary_assets")
    .delete()
    .in("id", assets.map((a) => a.id));
  if (error) throw error;

  const paths = assets.map((a) => a.file_path).filter(Boolean) as string[];
  if (paths.length) {
    await supabase.storage.from(DIARY_BUCKET).remove(paths).catch(() => {});
  }
}

// ─── Dashboard ──────────────────────────────────────────────────────────────

export type DiaryStats = {
  totalPages: number;
  pending: number;
  processing: number;
  needsReview: number;
  processed: number;
  failed: number;
  archived: number;
  /** Total characters of usable text across all pages — the knowledge base size. */
  knowledgeChars: number;
  assetsByKind: Record<DiaryAssetKind, number>;
  drafts: number;
  published: number;
  totalAssets: number;
};

const EMPTY_ASSET_COUNTS: Record<DiaryAssetKind, number> = {
  pdf: 0,
  audio: 0,
  template: 0,
  insight: 0,
  research_paper: 0,
  article: 0,
};

/**
 * Every figure is counted from real rows. Nothing here is estimated or
 * fabricated — an empty diary reports zeros.
 */
export async function getDiaryStats(): Promise<DiaryStats> {
  const countBy = async (status: DiaryStatus) => {
    const { count } = await supabase
      .from("diary_pages")
      .select("id", { count: "exact", head: true })
      .eq("status", status);
    return count ?? 0;
  };

  const [
    totalRes,
    pending,
    processing,
    needsReview,
    processed,
    failed,
    archived,
    textRes,
    assetsRes,
  ] = await Promise.all([
    supabase.from("diary_pages").select("id", { count: "exact", head: true }),
    countBy("pending"),
    countBy("processing"),
    countBy("needs_review"),
    countBy("processed"),
    countBy("failed"),
    countBy("archived"),
    supabase.from("diary_pages").select("corrected_text, ocr_text"),
    supabase.from("diary_assets").select("kind, status"),
  ]);

  const knowledgeChars = (textRes.data ?? []).reduce(
    (sum, r: { corrected_text: string | null; ocr_text: string | null }) =>
      sum + (r.corrected_text ?? r.ocr_text ?? "").length,
    0
  );

  const assetsByKind = { ...EMPTY_ASSET_COUNTS };
  let drafts = 0;
  let published = 0;
  for (const a of (assetsRes.data ?? []) as { kind: DiaryAssetKind; status: DiaryAssetStatus }[]) {
    if (a.kind in assetsByKind) assetsByKind[a.kind] += 1;
    if (a.status === "draft") drafts += 1;
    if (a.status === "published") published += 1;
  }

  return {
    totalPages: totalRes.count ?? 0,
    pending,
    processing,
    needsReview,
    processed,
    failed,
    archived,
    knowledgeChars,
    assetsByKind,
    drafts,
    published,
    totalAssets: (assetsRes.data ?? []).length,
  };
}

// ─── AI pipeline ────────────────────────────────────────────────────────────

async function authedPost<T>(url: string, body: unknown): Promise<T> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) throw new Error("You must be signed in.");

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${session.access_token}`,
    },
    body: JSON.stringify(body),
  });

  const json = (await res.json().catch(() => ({}))) as { error?: string; code?: string } & T;
  if (!res.ok) {
    const err = new Error(json.error || `Request failed (${res.status})`) as Error & { code?: string };
    err.code = json.code;
    throw err;
  }
  return json;
}

export type ProcessResult = {
  ok: true;
  status: DiaryStatus;
  confidence: number;
  statusMessage: string | null;
};

/** Run handwriting recognition + extraction on a single page. */
export function processPage(pageId: string) {
  return authedPost<ProcessResult>("/api/diary/process", { pageId });
}

/** Build a downstream asset from the given diary pages. */
export function generateAsset(kind: DiaryAssetKind, pageIds: string[], instruction?: string) {
  return authedPost<{ ok: true; asset: DiaryAsset }>("/api/diary/generate", {
    kind,
    pageIds,
    instruction,
  });
}

export function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 ** 2) return `${(n / 1024).toFixed(1)} KB`;
  if (n < 1024 ** 3) return `${(n / 1024 ** 2).toFixed(1)} MB`;
  return `${(n / 1024 ** 3).toFixed(2)} GB`;
}
