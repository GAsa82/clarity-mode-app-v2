import { supabase } from "@/lib/supabase";

const BUCKET = "cms-media";
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

export type UploadProgressHandler = (percent: number) => void;

function xhrUpload(
  method: "PUT" | "POST",
  url: string,
  headers: Record<string, string>,
  file: File,
  onProgress?: UploadProgressHandler
): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open(method, url);
    for (const [k, v] of Object.entries(headers)) xhr.setRequestHeader(k, v);
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable && onProgress) onProgress(Math.round((e.loaded / e.total) * 100));
    };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) resolve();
      else reject(new Error(`Upload failed (${xhr.status}): ${xhr.responseText.slice(0, 200)}`));
    };
    xhr.onerror = () => reject(new Error("Network error during upload."));
    xhr.send(file);
  });
}

/**
 * Videos go straight to Cloudflare R2 (via a presigned URL from
 * /api/media/presign) instead of Supabase Storage — the cms-media bucket
 * caps individual files at 200MB, which real video routinely exceeds. R2 has
 * no comparable practical limit.
 */
async function uploadVideoToR2(file: File, token: string, onProgress?: UploadProgressHandler): Promise<string> {
  const presignRes = await fetch("/api/media/presign", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({ filename: file.name, contentType: file.type || "application/octet-stream" }),
  });
  if (!presignRes.ok) {
    const body = await presignRes.json().catch(() => ({}) as { error?: string });
    throw new Error(body.error || `Couldn't prepare the video upload (${presignRes.status}).`);
  }
  const { uploadUrl, publicUrl } = (await presignRes.json()) as { uploadUrl: string; publicUrl: string };

  await xhrUpload(
    "PUT",
    uploadUrl,
    { "Content-Type": file.type || "application/octet-stream" },
    file,
    onProgress
  );

  return publicUrl;
}

/**
 * Uploads a file and returns its public URL. Video (`folder === "video"`)
 * goes to R2; everything else (images, audio) uses the public `cms-media`
 * Supabase Storage bucket, unchanged.
 */
export async function uploadMedia(
  file: File,
  folder: string,
  onProgress?: UploadProgressHandler
): Promise<string> {
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token;
  if (!token) throw new Error("You must be signed in to upload files.");

  if (folder === "video") {
    return uploadVideoToR2(file, token, onProgress);
  }

  const ext = file.name.includes(".") ? file.name.split(".").pop() : "bin";
  const path = `${folder}/${crypto.randomUUID()}.${ext}`;

  await xhrUpload(
    "POST",
    `${SUPABASE_URL}/storage/v1/object/${BUCKET}/${path}`,
    {
      Authorization: `Bearer ${token}`,
      apikey: SUPABASE_ANON_KEY,
      "Content-Type": file.type || "application/octet-stream",
    },
    file,
    onProgress
  );

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return data.publicUrl;
}

/** Deletes a previously-uploaded file, given its public URL. Best-effort. */
export async function deleteMediaByUrl(url: string): Promise<void> {
  const marker = `/storage/v1/object/public/${BUCKET}/`;
  const idx = url.indexOf(marker);
  if (idx !== -1) {
    await supabase.storage.from(BUCKET).remove([url.slice(idx + marker.length)]);
    return;
  }

  // Not a Supabase asset — try R2 (best-effort; a non-R2 external URL just
  // gets a 400 from the endpoint and is silently ignored, same as before).
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token;
  if (!token) return;
  await fetch("/api/media/delete", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({ url }),
  }).catch(() => {});
}

/** Best-effort cleanup for every media field on a row being deleted (e.g. cover_url, video_url, pdf_url). */
export async function deleteMediaUrls(urls: (string | null | undefined)[]): Promise<void> {
  await Promise.all(urls.filter((u): u is string => !!u).map((u) => deleteMediaByUrl(u)));
}
