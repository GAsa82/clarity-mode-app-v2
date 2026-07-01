import { supabase } from "@/lib/supabase";

const BUCKET = "cms-media";
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

export type UploadProgressHandler = (percent: number) => void;

/**
 * Uploads a file to the public `cms-media` storage bucket under `folder/`
 * and returns its public URL. Uses raw XHR (not supabase-js's fetch-based
 * upload) so we can report real upload percentage — fetch() doesn't
 * reliably expose request-body upload progress across browsers.
 */
export async function uploadMedia(
  file: File,
  folder: string,
  onProgress?: UploadProgressHandler
): Promise<string> {
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token;
  if (!token) throw new Error("You must be signed in to upload files.");

  const ext = file.name.includes(".") ? file.name.split(".").pop() : "bin";
  const path = `${folder}/${crypto.randomUUID()}.${ext}`;

  await new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", `${SUPABASE_URL}/storage/v1/object/${BUCKET}/${path}`);
    xhr.setRequestHeader("Authorization", `Bearer ${token}`);
    xhr.setRequestHeader("apikey", SUPABASE_ANON_KEY);
    xhr.setRequestHeader("Content-Type", file.type || "application/octet-stream");
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable && onProgress) {
        onProgress(Math.round((e.loaded / e.total) * 100));
      }
    };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) resolve();
      else reject(new Error(`Upload failed (${xhr.status}): ${xhr.responseText.slice(0, 200)}`));
    };
    xhr.onerror = () => reject(new Error("Network error during upload."));
    xhr.send(file);
  });

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return data.publicUrl;
}

/** Deletes a previously-uploaded file, given its public URL. Best-effort. */
export async function deleteMediaByUrl(url: string): Promise<void> {
  const marker = `/storage/v1/object/public/${BUCKET}/`;
  const idx = url.indexOf(marker);
  if (idx === -1) return; // not one of our uploads (e.g. an external URL) — nothing to do
  const path = url.slice(idx + marker.length);
  await supabase.storage.from(BUCKET).remove([path]);
}
