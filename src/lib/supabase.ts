import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey && supabaseUrl.startsWith('http'));

// NOTE: we deliberately do NOT bulk-clear `sb-*-auth` localStorage keys here.
// BadlyTalks now uses a private `storageKey` (see below), so it never reads the
// old default key and stale state can't affect it. Wiping every `sb-*` key would
// also destroy a co-hosted app's (e.g. Breakthrough Protocol) session — the exact
// cross-app logout we're fixing.

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
      // Private, app-scoped storage key. By default supabase-js stores the
      // session under `sb-<project-ref>-auth-token`; if another Supabase app
      // (e.g. Breakthrough Protocol) shares this origin or project, it would use
      // the SAME key and clobber our session (and vice-versa). A unique key gives
      // BadlyTalks its own localStorage namespace so the two apps stay logged in
      // independently — no cross-app logout.
      storageKey: 'badlytalks-auth',
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

