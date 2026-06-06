// ─────────────────────────────────────────────────────────────────────────────
// Clarity AI — Frontend API Client (Production-Ready)
// ─────────────────────────────────────────────────────────────────────────────

// In dev mode: Vite proxy matches /api/* and forwards to Express (3001) → FastAPI (8000)
// In production: vercel.json rewrites /api/* to Railway backend
// API_BASE is always "" because the paths below already include /api/
const API_BASE: string =
  (import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/+$/, "") || "";

// ─── Logging helper (production-safe) ────────────────────────────────────────
const isProd = import.meta.env.MODE === "production";
function log(level: "info" | "warn" | "error", msg: string, extra?: unknown) {
  const line = `[ClarityAI] [${level.toUpperCase()}] ${msg}`;
  if (level === "error") console.error(line, extra ?? "");
  else if (level === "warn") console.warn(line, extra ?? "");
  else if (!isProd) console.info(line, extra ?? "");
}

// ─── Types ───────────────────────────────────────────────────────────────────

export interface HealthStatus {
  status: string;
  version: string;
  service: string;
  environment: string;
  uptime_seconds: number | null;
  checks: {
    chromadb: string;
    embeddings: string;
    providers: string;
    ollama: string;
  };
  stats: {
    total_requests: number;
    total_errors: number;
  };
  providers: Record<
    string,
    {
      enabled: boolean;
      model: string;
      free: boolean;
      priority: number;
    }
  >;
}

export interface UploadResult {
  success: boolean;
  filename: string;
  saved_as: string;
  size_bytes: number;
  message: string;
}

export interface FullUploadResult {
  file_id: string;
  filename: string;
  status: string;
  extracted_text?: string;
  error?: string;
  chunks_count?: number;
}

export interface DashboardStats {
  total_entries: number;
  total_chunks: number;
  top_emotions: { emotion: string; count: number }[];
  top_themes: { theme: string; count: number }[];
  recent_entries: {
    id: string;
    text: string;
    filename: string;
    uploaded_at: string;
    emotions: string[];
    themes: string[];
  }[];
}

export interface ChatResponse {
  answer: string;
  sources: { id?: string; text?: string; filename?: string; score?: number }[];
  model_used: string;
  provider_name: string;
  provider_chain: string[];
  tokens_in: number;
  tokens_out: number;
  latency_ms: number;
  fallback_occurred: boolean;
  error: string | null;
}

export interface ProviderStats {
  name: string;
  model: string;
  is_free: boolean;
  enabled: boolean;
  active: boolean;
  priority: number;
  total_requests: number;
  total_errors: number;
  error_rate: number;
  avg_latency_ms: number;
  tokens_in: number;
  tokens_out: number;
  consecutive_failures: number;
  last_used: string | null;
  last_error: string | null;
}

// ─── Internal fetch wrapper with timeout + retry ─────────────────────────────

interface FetchOptions {
  method?: "GET" | "POST" | "PUT" | "DELETE";
  body?: unknown;
  formData?: FormData;
  timeoutMs?: number;
  retries?: number;
  retryDelayMs?: number;
}

const DEFAULT_TIMEOUT = 30_000; // 30s
const DEFAULT_RETRIES = 2;
const RETRYABLE_STATUS = new Set([408, 425, 429, 500, 502, 503, 504]);

function isNetworkError(err: unknown): boolean {
  if (err instanceof TypeError) {
    const msg = (err.message || "").toLowerCase();
    return (
      msg.includes("failed to fetch") ||
      msg.includes("networkerror") ||
      msg.includes("load failed")
    );
  }
  return false;
}

function sleep(ms: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms));
}

async function apiFetch<T>(path: string, opts: FetchOptions = {}): Promise<T> {
  const {
    method = "GET",
    body,
    formData,
    timeoutMs = DEFAULT_TIMEOUT,
    retries = DEFAULT_RETRIES,
    retryDelayMs = 1000,
  } = opts;

  const url = `${API_BASE}${path}`;

  let lastErr: unknown;
  for (let attempt = 0; attempt <= retries; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const res = await fetch(url, {
        method,
        headers: formData
          ? undefined
          : { "Content-Type": "application/json", Accept: "application/json" },
        body: formData ?? (body !== undefined ? JSON.stringify(body) : undefined),
        signal: controller.signal,
        credentials: "omit",
        mode: "cors",
      });
      clearTimeout(timer);

      if (res.ok) {
        // 204 No Content
        if (res.status === 204) return undefined as T;
        return (await res.json()) as T;
      }

      // Try to read JSON error
      const errBody = await res
        .json()
        .catch(() => ({ detail: res.statusText || `HTTP ${res.status}` }));
      const errMsg = errBody?.detail || `HTTP ${res.status}`;

      if (RETRYABLE_STATUS.has(res.status) && attempt < retries) {
        log(
          "warn",
          `Retryable ${res.status} on ${path} (attempt ${attempt + 1}/${retries})`,
        );
        await sleep(retryDelayMs * Math.pow(2, attempt));
        continue;
      }
      throw new Error(errMsg);
    } catch (err: any) {
      clearTimeout(timer);
      lastErr = err;
      const retryable =
        isNetworkError(err) || err?.name === "AbortError" || RETRYABLE_STATUS.has(0);
      if (retryable && attempt < retries) {
        log(
          "warn",
          `Retrying ${path} (attempt ${attempt + 1}/${retries}): ${err?.message || err}`,
        );
        await sleep(retryDelayMs * Math.pow(2, attempt));
        continue;
      }
      throw err;
    }
  }
  throw lastErr ?? new Error("Unknown API error");
}

// ─── Public API Functions ────────────────────────────────────────────────────

export async function healthCheck(): Promise<HealthStatus> {
  return apiFetch<HealthStatus>("/api/health", { timeoutMs: 8000, retries: 1 });
}

export async function uploadDiary(file: File): Promise<UploadResult> {
  const formData = new FormData();
  formData.append("file", file);
  return apiFetch<UploadResult>("/api/upload-diary", {
    method: "POST",
    formData,
    timeoutMs: 120_000,
  });
}

export async function uploadFile(file: File): Promise<FullUploadResult> {
  const formData = new FormData();
  formData.append("file", file);
  return apiFetch<FullUploadResult>("/api/upload/", {
    method: "POST",
    formData,
    timeoutMs: 120_000,
  });
}

export async function chatWithAI(
  query: string,
  n_results = 10,
): Promise<ChatResponse> {
  return apiFetch<ChatResponse>("/api/chat/", {
    method: "POST",
    body: { query, n_results, include_philosophy: true },
    timeoutMs: 60_000,
  });
}

export interface IndexedDocument {
  file_id: string;
  filename: string;
  chunks_count: number;
}

export async function getDocuments(): Promise<{ documents: IndexedDocument[]; total: number }> {
  return apiFetch<{ documents: IndexedDocument[]; total: number }>("/api/upload/documents");
}

export async function getDashboard(): Promise<DashboardStats> {
  return apiFetch<DashboardStats>("/api/dashboard/");
}

export async function getPatterns(period = "monthly") {
  return apiFetch<{
    period: string;
    patterns: { type: string; data: Record<string, number> }[];
    emotional_trends: Record<string, unknown>;
    insights: string[];
  }>(`/api/dashboard/patterns?period=${period}`);
}

export async function getProviderStats(): Promise<Record<string, ProviderStats>> {
  return apiFetch<Record<string, ProviderStats>>("/api/chat/providers/stats");
}

export async function getProviderStatus() {
  return apiFetch<{
    providers: { name: string; model: string; enabled: boolean; is_free: boolean; priority: number }[];
    count: number;
    chain_description: string;
  }>("/api/chat/providers/status");
}

export async function getDailyReflection(): Promise<{ prompt: string; model_used: string }> {
  return apiFetch<{ prompt: string; model_used: string }>("/api/chat/reflect", {
    method: "POST",
    body: {},
    timeoutMs: 30_000,
  });
}

export async function getProactiveInsights(): Promise<{
  insight: string;
  has_data: boolean;
  emotions_detected?: string[];
  themes_detected?: string[];
}> {
  return apiFetch("/api/chat/insights", { timeoutMs: 30_000 });
}

export async function deleteDocument(fileId: string): Promise<{
  file_id: string;
  status: string;
  chroma_chunks_removed: number;
  supabase_deleted: boolean;
}> {
  return apiFetch(`/api/upload/${encodeURIComponent(fileId)}`, {
    method: "DELETE",
    timeoutMs: 20_000,
  });
}

// ─── Health probe for frontend status banner ─────────────────────────────────

export interface BackendHealthState {
  online: boolean;
  message: string;
  lastChecked: number;
}

export async function probeBackend(): Promise<BackendHealthState> {
  try {
    const h = await healthCheck();
    return {
      online: h.status === "ok",
      message:
        h.status === "ok"
          ? "AI backend connected"
          : `Backend returned: ${h.status}`,
      lastChecked: Date.now(),
    };
  } catch (err: any) {
    return {
      online: false,
      message:
        "Unable to connect to AI backend. Please make sure the clarity-ai server is running.",
      lastChecked: Date.now(),
    };
  }
}