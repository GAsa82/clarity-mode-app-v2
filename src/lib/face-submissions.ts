import { supabase } from "@/lib/supabase";

export type FaceSubmission = {
  id: string;
  username: string;
  image: string;
  status: "pending" | "approved" | "rejected";
  created_at: string;
  reviewed_at: string | null;
};

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
export async function submitFace(username: string, image: string): Promise<void> {
  const { error } = await supabase
    .from("face_submissions")
    .insert({ username: username.trim(), image, status: "pending" });
  if (error) throw error;
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
