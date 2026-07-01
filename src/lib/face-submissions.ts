import { supabase } from "@/lib/supabase";

export type FaceSubmission = {
  id: string;
  username: string;
  image: string;
  status: "pending" | "approved" | "rejected";
  created_at: string;
  reviewed_at: string | null;
};

const FACE_SUBMISSION_QUEUE_KEY = "clarity-face-submission-queue";
const FACE_SUBMISSION_QUEUE_MAX_ATTEMPTS = 5;

export type QueuedFaceSubmission = {
  queueId: string;
  username: string;
  image: string;
  created_at: string;
  attempts: number;
  last_error?: string;
  last_attempted_at?: string;
};

export type SubmitFaceResult = {
  queued: boolean;
};

function readQueuedFaceSubmissions(): QueuedFaceSubmission[] {
  try {
    const raw = localStorage.getItem(FACE_SUBMISSION_QUEUE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as QueuedFaceSubmission[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveQueuedFaceSubmissions(items: QueuedFaceSubmission[]) {
  try {
    localStorage.setItem(FACE_SUBMISSION_QUEUE_KEY, JSON.stringify(items));
  } catch {
    // Ignore persistence failures.
  }
}

function enqueueFaceSubmission(username: string, image: string, last_error?: string): QueuedFaceSubmission {
  const item: QueuedFaceSubmission = {
    queueId:
      typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
    username: username.trim(),
    image,
    created_at: new Date().toISOString(),
    attempts: 0,
    last_error,
    last_attempted_at: undefined,
  };

  const queue = readQueuedFaceSubmissions();
  queue.push(item);
  saveQueuedFaceSubmissions(queue);
  return item;
}

function isTransientNetworkError(error: unknown): boolean {
  if (typeof navigator !== "undefined" && !navigator.onLine) return true;
  if (!error) return true;

  const message =
    typeof error === "string"
      ? error
      : error instanceof Error
      ? error.message
      : "";

  const normalized = message.toLowerCase();
  return (
    normalized.includes("failed to fetch") ||
    normalized.includes("network") ||
    normalized.includes("offline") ||
    normalized.includes("timeout") ||
    normalized.includes("connection")
  );
}

function shouldRetryQueueItem(item: QueuedFaceSubmission): boolean {
  return item.attempts < FACE_SUBMISSION_QUEUE_MAX_ATTEMPTS;
}

async function submitFaceRemote(username: string, image: string): Promise<void> {
  const { error } = await supabase
    .from("face_submissions")
    .insert({ username: username.trim(), image, status: "pending" });

  if (error) throw error;
}

export async function flushQueuedFaceSubmissions(): Promise<void> {
  const queue = readQueuedFaceSubmissions();
  if (queue.length === 0) return;
  if (typeof navigator !== "undefined" && !navigator.onLine) return;

  const nextQueue: QueuedFaceSubmission[] = [];
  for (const item of queue) {
    if (!shouldRetryQueueItem(item)) {
      continue;
    }

    try {
      await submitFaceRemote(item.username, item.image);
    } catch (error) {
      nextQueue.push({
        ...item,
        attempts: item.attempts + 1,
        last_error: error instanceof Error ? error.message : String(error),
        last_attempted_at: new Date().toISOString(),
      });
    }
  }

  saveQueuedFaceSubmissions(nextQueue);
}

export function getQueuedFaceSubmissionCount(): number {
  return readQueuedFaceSubmissions().filter(shouldRetryQueueItem).length;
}

/**
 * Downscale + compress an image file to a small JPEG data URL (max ~256px).
 * Keeps stored submissions tiny (~20–40KB) so they live comfortably in a text
 * column and load fast in the public widget.
 */
export function downscaleImage(file: File, max = 256, quality = 0.82): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const scale = Math.min(1, max / Math.max(img.width, img.height));
        const w = Math.round(img.width * scale);
        const h = Math.round(img.height * scale);
        const canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d");
        if (!ctx) return reject(new Error("Canvas not supported"));
        ctx.drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL("image/jpeg", quality));
      };
      img.onerror = () => reject(new Error("Could not read image"));
      img.src = reader.result as string;
    };
    reader.onerror = () => reject(new Error("Could not read file"));
    reader.readAsDataURL(file);
  });
}

/** Submit a face for review. Always lands as 'pending'. */
export async function submitFace(username: string, image: string): Promise<SubmitFaceResult> {
  const sanitizedUsername = username.trim();
  if (!sanitizedUsername) throw new Error("Username is required");
  if (!image) throw new Error("Image is required");

  if (typeof navigator !== "undefined" && !navigator.onLine) {
    enqueueFaceSubmission(sanitizedUsername, image, "offline");
    return { queued: true };
  }

  try {
    await submitFaceRemote(sanitizedUsername, image);
    await flushQueuedFaceSubmissions();
    return { queued: false };
  } catch (error) {
    if (isTransientNetworkError(error)) {
      enqueueFaceSubmission(sanitizedUsername, image, error instanceof Error ? error.message : String(error));
      return { queued: true };
    }
    throw error;
  }
}

/** Public: approved members, newest first. */
export async function getApprovedFaces(limit = 12): Promise<FaceSubmission[]> {
  const { data, error } = await supabase
    .from("face_submissions")
    .select("id, username, image, status, created_at, reviewed_at")
    .eq("status", "approved")
    .order("reviewed_at", { ascending: false })
    .limit(limit);
  if (error) return [];
  return (data as FaceSubmission[]) ?? [];
}

/** Admin: submissions awaiting review, newest first. */
export async function getPendingFaces(): Promise<FaceSubmission[]> {
  const { data, error } = await supabase
    .from("face_submissions")
    .select("*")
    .eq("status", "pending")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data as FaceSubmission[]) ?? [];
}

/** Admin: count of pending submissions (for the nav badge). */
export async function getPendingFaceCount(): Promise<number> {
  const { count } = await supabase
    .from("face_submissions")
    .select("id", { count: "exact", head: true })
    .eq("status", "pending");
  return count ?? 0;
}

/** Admin: recently reviewed submissions. */
export async function getReviewedFaces(limit = 30): Promise<FaceSubmission[]> {
  const { data, error } = await supabase
    .from("face_submissions")
    .select("*")
    .neq("status", "pending")
    .order("reviewed_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data as FaceSubmission[]) ?? [];
}

/** Admin: approve or reject a submission. */
export async function reviewFace(id: string, status: "approved" | "rejected"): Promise<void> {
  const { error } = await supabase
    .from("face_submissions")
    .update({ status, reviewed_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw error;
}

/** Admin: permanently delete a submission. */
export async function deleteFace(id: string): Promise<void> {
  const { error } = await supabase.from("face_submissions").delete().eq("id", id);
  if (error) throw error;
}
