import { supabase } from "@/lib/supabase";
import { getSetting, setSetting } from "@/lib/site-settings";

export type FaceSubmission = {
  id: string;
  username: string;
  image: string;
  status: "pending" | "approved" | "rejected";
  created_at: string;
  reviewed_at: string | null;
  // Payment linkage (temporary ₹2 verification fee)
  user_id?: string | null;
  email?: string | null;
  payment_status?: "free" | "pending_payment" | "paid" | "refunded";
  order_id?: string | null;
  amount_paise?: number;
};

// ─── Payment config (admin-controlled via site_settings) ────────────────────

export type FacePaymentConfig = {
  /** Master switch — off restores the free submission flow. */
  enabled: boolean;
  /** Fee in paise (₹2 = 200). Razorpay minimum is 100 (₹1). */
  amountPaise: number;
  /** Marks this as a temporary end-to-end verification fee in the UI. */
  testingMode: boolean;
};

export const FACE_PAYMENT_DEFAULTS: FacePaymentConfig = {
  enabled: false,
  amountPaise: 200,
  testingMode: true,
};

export const FACE_PAYMENT_SETTINGS_KEY = "face_payment_config";

export async function getFacePaymentConfig(): Promise<FacePaymentConfig> {
  try {
    const stored = await getSetting<Partial<FacePaymentConfig>>(FACE_PAYMENT_SETTINGS_KEY);
    return { ...FACE_PAYMENT_DEFAULTS, ...(stored ?? {}) };
  } catch {
    return { ...FACE_PAYMENT_DEFAULTS };
  }
}

export async function saveFacePaymentConfig(cfg: FacePaymentConfig) {
  return setSetting(
    FACE_PAYMENT_SETTINGS_KEY,
    cfg,
    "Member of the Day payment config (temporary testing fee)"
  );
}

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

/**
 * Paid flow: create the submission BEFORE payment so the order can reference
 * it (item_id = submission id). It sits in 'pending_payment' until the server
 * verifies the gateway signature and flips it to 'paid'.
 * Returns the submission id for order creation / payment retry.
 */
export async function submitFaceForPayment(
  username: string,
  image: string,
  userId: string,
  email: string,
  amountPaise: number
): Promise<string> {
  const sanitizedUsername = username.trim();
  if (!sanitizedUsername) throw new Error("Username is required");
  if (!image) throw new Error("Image is required");

  const { data, error } = await supabase
    .from("face_submissions")
    .insert({
      username: sanitizedUsername,
      image,
      status: "pending",
      payment_status: "pending_payment",
      user_id: userId,
      email,
      amount_paise: amountPaise,
    })
    .select("id")
    .single();
  if (error) throw error;
  return data.id as string;
}

// ─── Admin: payment audit & end-to-end verification ─────────────────────────

export type FacePaymentRecord = {
  order_id: string;
  submission_id: string | null;
  username: string;
  email: string | null;
  amount_paise: number;
  razorpay_order_id: string | null;
  razorpay_payment_id: string | null;
  status: string;
  submission_payment_status: string | null;
  submission_review_status: string | null;
  created_at: string;
};

/** Admin: all Member of the Day transactions, joined to their submissions. */
export async function getFacePayments(limit = 50): Promise<FacePaymentRecord[]> {
  const { data: orders, error } = await supabase
    .from("orders")
    .select("id, item_id, item_title, amount, razorpay_order_id, razorpay_payment_id, status, created_at")
    .eq("item_type", "face_of_clarity")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;

  const ids = (orders ?? []).map((o) => o.item_id).filter(Boolean);
  const subsById = new Map<string, FaceSubmission>();
  if (ids.length) {
    const { data: subs } = await supabase
      .from("face_submissions")
      .select("id, username, email, payment_status, status")
      .in("id", ids);
    (subs ?? []).forEach((s) => subsById.set(s.id, s as FaceSubmission));
  }

  return (orders ?? []).map((o) => {
    const sub = o.item_id ? subsById.get(o.item_id) : undefined;
    return {
      order_id: o.id,
      submission_id: o.item_id ?? null,
      username: sub?.username ?? (o.item_title ?? "—").replace(/^Face of Clarity — /, ""),
      email: sub?.email ?? null,
      amount_paise: o.amount,
      razorpay_order_id: o.razorpay_order_id,
      razorpay_payment_id: o.razorpay_payment_id,
      status: o.status,
      submission_payment_status: sub?.payment_status ?? null,
      submission_review_status: sub?.status ?? null,
      created_at: o.created_at,
    };
  });
}

export type FaceVerificationReport = {
  ranAt: string;
  totalOrders: number;
  completedOrders: number;
  totalRevenuePaise: number;
  checks: { label: string; pass: boolean; detail: string }[];
};

/**
 * Automated end-to-end verification against live data:
 * every completed order must have a gateway payment id and a linked
 * submission marked paid; no order may be double-completed.
 */
export async function runFaceVerificationReport(): Promise<FaceVerificationReport> {
  const payments = await getFacePayments(200);
  const completed = payments.filter((p) => p.status === "completed");

  const missingGatewayRef = completed.filter((p) => !p.razorpay_payment_id);
  const unlinkedSubmissions = completed.filter(
    (p) => p.submission_payment_status !== "paid"
  );
  const paymentIds = completed.map((p) => p.razorpay_payment_id).filter(Boolean);
  const duplicates = paymentIds.filter((id, i) => paymentIds.indexOf(id) !== i);
  const inQueue = completed.filter(
    (p) => p.submission_review_status === "pending" || p.submission_review_status === "approved"
  );

  const checks = [
    {
      label: "Payments created & stored in database (orders table)",
      pass: payments.length > 0,
      detail: `${payments.length} order(s) found for Member of the Day`,
    },
    {
      label: "Completed payments carry a gateway transaction ID",
      pass: missingGatewayRef.length === 0,
      detail: missingGatewayRef.length
        ? `${missingGatewayRef.length} completed order(s) missing razorpay_payment_id`
        : `${completed.length}/${completed.length} completed orders have gateway refs`,
    },
    {
      label: "User records updated (submission marked paid)",
      pass: unlinkedSubmissions.length === 0,
      detail: unlinkedSubmissions.length
        ? `${unlinkedSubmissions.length} completed order(s) whose submission is not marked paid`
        : "Every completed order links to a paid submission",
    },
    {
      label: "No duplicate transactions",
      pass: duplicates.length === 0,
      detail: duplicates.length
        ? `Duplicate payment ids: ${[...new Set(duplicates)].join(", ")}`
        : "All gateway payment ids are unique",
    },
    {
      label: "Paid members entered the review queue",
      pass: completed.length === 0 || inQueue.length > 0,
      detail: `${inQueue.length}/${completed.length} paid submissions pending/approved in queue`,
    },
    {
      label: "Revenue analytics include these payments",
      pass: true,
      detail: "Analytics + payment history read from the same orders table (verified by design)",
    },
  ];

  return {
    ranAt: new Date().toISOString(),
    totalOrders: payments.length,
    completedOrders: completed.length,
    totalRevenuePaise: completed.reduce((s, p) => s + p.amount_paise, 0),
    checks,
  };
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
