const API_BASE = import.meta.env.VITE_API_URL || '/api';

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
  providers: Record<string, {
    enabled: boolean;
    model: string;
    free: boolean;
    priority: number;
  }>;
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

// ─── API Functions ───────────────────────────────────────────────────────────

export async function healthCheck(): Promise<HealthStatus> {
  const res = await fetch(`${API_BASE}/health`);
  if (!res.ok) throw new Error(`Backend offline: ${res.status}`);
  return res.json();
}

export async function uploadDiary(file: File): Promise<UploadResult> {
  const formData = new FormData();
  formData.append('file', file);
  const res = await fetch(`${API_BASE}/upload-diary`, {
    method: 'POST',
    body: formData,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || `Upload failed: ${res.status}`);
  }
  return res.json();
}

export async function uploadFile(file: File): Promise<FullUploadResult> {
  const formData = new FormData();
  formData.append('file', file);
  const res = await fetch(`${API_BASE}/upload/`, {
    method: 'POST',
    body: formData,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || `Upload failed: ${res.status}`);
  }
  return res.json();
}

export async function chatWithAI(
  query: string,
  n_results = 10
): Promise<ChatResponse> {
  const res = await fetch(`${API_BASE}/chat/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, n_results, include_philosophy: true }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || `Chat failed: ${res.status}`);
  }
  return res.json();
}

export async function getDashboard(): Promise<DashboardStats> {
  const res = await fetch(`${API_BASE}/dashboard/`);
  if (!res.ok) throw new Error(`Dashboard fetch failed: ${res.status}`);
  return res.json();
}

export async function getPatterns(period = 'monthly'): Promise<{
  period: string;
  patterns: { type: string; data: Record<string, number> }[];
  emotional_trends: Record<string, unknown>;
  insights: string[];
}> {
  const res = await fetch(`${API_BASE}/dashboard/patterns?period=${period}`);
  if (!res.ok) throw new Error(`Patterns fetch failed: ${res.status}`);
  return res.json();
}

export async function getProviderStats(): Promise<Record<string, ProviderStats>> {
  const res = await fetch(`${API_BASE}/chat/providers/stats`);
  if (!res.ok) throw new Error(`Provider stats fetch failed: ${res.status}`);
  return res.json();
}

export async function getProviderStatus(): Promise<{
  providers: { name: string; model: string; enabled: boolean; is_free: boolean; priority: number }[];
  count: number;
  chain_description: string;
}> {
  const res = await fetch(`${API_BASE}/chat/providers/status`);
  if (!res.ok) throw new Error(`Provider status fetch failed: ${res.status}`);
  return res.json();
}