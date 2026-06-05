import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey && supabaseUrl.startsWith('http'));

// One-time migration: clear stale PKCE auth state left from when the app used flowType:'pkce'.
// Stale state causes GoTrueClient._initialize() to cache a rejected promise, blocking all auth
// calls with "Invalid path specified in request URL" — even after a successful server response.
// This runs once per browser (flag stored in localStorage) before the client is created.
if (typeof window !== 'undefined') {
  const MIGRATION_FLAG = 'cm-auth-implicit-v1';
  if (!localStorage.getItem(MIGRATION_FLAG)) {
    Object.keys(localStorage)
      .filter(k => k.startsWith('sb-') && k.includes('-auth'))
      .forEach(k => localStorage.removeItem(k));
    localStorage.setItem(MIGRATION_FLAG, '1');
  }
}

if (!isSupabaseConfigured) {
  console.warn(
    '[Clarity] Supabase not configured. Auth will not work.\n' +
    'Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your .env file.\n' +
    'The app will still work — login/auth features will be disabled.'
  );
}

// Create a safe client — if env vars are empty, pass a dummy URL to prevent crashes
export const supabase: SupabaseClient = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder-key',
  {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true,
      flowType: 'implicit',
    },
  }
);

// Export a helper to check if Supabase is actually configured
export const isSupabaseReady = () => isSupabaseConfigured;

export type Profile = {
  id: string;
  email: string;
  name: string | null;
  avatar_url: string | null;
  role: 'user' | 'admin';
  created_at: string;
  updated_at: string;
};

export type Diary = {
  id: string;
  user_id: string;
  file_id: string;
  filename: string;
  file_size_bytes: number | null;
  status: 'pending' | 'processing' | 'completed' | 'error';
  error_message: string | null;
  extracted_text: string | null;
  text_length: number | null;
  chunks_count: number | null;
  chunk_ids: string[];
  entities: Record<string, string[]>;
  language: string;
  word_count: number | null;
  sentiment_score: number | null;
  uploaded_at: string;
  processed_at: string | null;
  updated_at: string;
};

export type UploadHistoryEntry = {
  id: string;
  user_id: string;
  diary_id: string | null;
  filename: string;
  file_size_bytes: number;
  file_type: string | null;
  status: 'uploading' | 'processing' | 'completed' | 'failed';
  status_message: string | null;
  chunks_created: number;
  ocr_success: boolean;
  embedding_success: boolean;
  started_at: string;
  completed_at: string | null;
  updated_at: string;
};