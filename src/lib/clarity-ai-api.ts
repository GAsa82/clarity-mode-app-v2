// Stub — AI Coach features removed. Admin pages that import from here still compile.
// Backend calls are routed to the Railway API for admin use only.

const BASE = "/api";

async function req<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, init);
  if (!res.ok) throw new Error(`Request failed: ${res.status}`);
  return res.json();
}

// ── Types ────────────────────────────────────────────────────────────────────

export interface HealthStatus {
  status: string;
  providers?: Record<string, unknown>;
}

export interface DashboardStats {
  total_entries: number;
  total_chunks: number;
  top_emotions: Array<{ emotion: string; count: number }>;
  top_themes: Array<{ theme: string; count: number }>;
}

export interface ChatResponse {
  message: string;
  sources?: string[];
}

export interface ProviderStats {
  provider: string;
  requests: number;
  errors: number;
}

export interface UploadResult {
  success: boolean;
  message: string;
  chunks_created?: number;
}

export interface IndexedDocument {
  id: string;
  filename: string;
  type: string;
  size: number;
  uploadedAt: string;
  chunks: number;
}

// ── Functions ─────────────────────────────────────────────────────────────────

export function healthCheck(): Promise<HealthStatus> {
  return req<HealthStatus>("/ai/health");
}

export function getDashboard(): Promise<DashboardStats> {
  return req<DashboardStats>("/ai/dashboard");
}

export function getPatterns(): Promise<{ patterns: unknown[]; insights: string[] }> {
  return req("/ai/patterns");
}

export function getProviderStats(): Promise<ProviderStats[]> {
  return req<ProviderStats[]>("/ai/provider-stats");
}

export function getProviderStatus(): Promise<Record<string, boolean>> {
  return req("/ai/provider-status");
}

export function uploadDiary(
  text: string,
  meta?: Record<string, unknown>
): Promise<UploadResult> {
  return req<UploadResult>("/ai/upload/diary", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text, ...meta }),
  });
}

export function uploadFile(
  file: File,
  category?: string
): Promise<UploadResult> {
  const form = new FormData();
  form.append("file", file);
  if (category) form.append("category", category);
  return req<UploadResult>("/ai/upload/file", { method: "POST", body: form });
}

export function getDocuments(): Promise<IndexedDocument[]> {
  return req<IndexedDocument[]>("/ai/documents");
}

export function chatWithAI(
  message: string,
  history?: { role: string; content: string }[]
): Promise<ChatResponse> {
  return req<ChatResponse>("/ai/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message, history }),
  });
}
