import { supabase, type Profile } from './supabase';

// ─── Auth API ─────────────────────────────────────────────────────────────────

export async function signIn(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email: email.trim().toLowerCase(),
    password,
  });

  if (error) throw error;
  return data;
}

export async function signUp(email: string, password: string, name: string) {
  const { data, error } = await supabase.auth.signUp({
    email: email.trim().toLowerCase(),
    password,
    options: {
      data: { name: name.trim() },
    },
  });

  if (error) throw error;

  // When the email is already registered, Supabase does NOT return an error —
  // it returns a decoy user with an empty `identities` array (to avoid leaking
  // which emails exist). Without this guard the UI shows a fake "signed up"
  // success, then login fails with "Invalid login credentials" because the new
  // password was never saved. Surface a clear message instead.
  if (data.user && Array.isArray(data.user.identities) && data.user.identities.length === 0) {
    throw new Error("An account with this email already exists. Please sign in instead.");
  }

  return data;
}

export async function signOut() {
  // scope: 'local' signs out ONLY this browser's session for THIS app. The
  // default 'global' scope would revoke every refresh token for the user across
  // all their devices on Clarity's Supabase project (vajenjgxaznftlvribzl) — an
  // aggressive "log me out everywhere" that a normal logout button shouldn't do.
  // NOTE: Breakthrough Protocol runs on a SEPARATE Supabase project
  // (llflerfeiwhicrmunqzw), so neither scope here affects a BP session at all —
  // the two apps have entirely independent auth. (An earlier comment here
  // incorrectly claimed a shared project.)
  const { error } = await supabase.auth.signOut({ scope: 'local' });
  if (error) throw error;
}

export async function resetPassword(email: string) {
  const { data, error } = await supabase.auth.resetPasswordForEmail(
    email.trim().toLowerCase(),
    {
      redirectTo: `${window.location.origin}/reset-password`,
    }
  );

  if (error) throw error;
  return data;
}

export async function updatePassword(newPassword: string) {
  const { data, error } = await supabase.auth.updateUser({
    password: newPassword,
  });

  if (error) throw error;
  return data;
}

// ─── Session ──────────────────────────────────────────────────────────────────

export async function getCurrentSession() {
  const { data, error } = await supabase.auth.getSession();
  if (error) throw error;
  return data.session;
}

export async function getCurrentUser() {
  const { data, error } = await supabase.auth.getUser();
  if (error) throw error;
  return data.user;
}

export function onAuthStateChange(callback: (event: string, session: any) => void) {
  return supabase.auth.onAuthStateChange((event, session) => {
    callback(event, session);
  });
}

// ─── Profile API ──────────────────────────────────────────────────────────────

export async function getProfile(userId: string): Promise<Profile | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null; // not found
    throw error;
  }
  return data;
}

export async function updateProfile(userId: string, updates: Partial<Profile>) {
  const { data, error } = await supabase
    .from('profiles')
    .update(updates)
    .eq('id', userId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

// ─── Auth Error Helpers ───────────────────────────────────────────────────────

export function getAuthErrorMessage(error: any): string {
  if (!error) return 'An unexpected error occurred';

  const message = error.message || error.error_description || String(error);

  // Supabase common error messages
  if (message.includes('Invalid login credentials')) {
    return 'Invalid email or password. Please try again.';
  }
  if (message.includes('Email not confirmed')) {
    return 'Please confirm your email address before signing in. Check your inbox.';
  }
  if (message.includes('User already registered')) {
    return 'An account with this email already exists. Try signing in instead.';
  }
  if (message.includes('Password should be at least 6 characters')) {
    return 'Password must be at least 6 characters long.';
  }
  if (message.includes('rate limit')) {
    return 'Too many attempts. Please wait a moment and try again.';
  }
  if (message.includes('Email link is invalid or has expired')) {
    return 'This link is invalid or has expired. Please request a new one.';
  }

  return message;
}

// ─── Role Helpers ─────────────────────────────────────────────────────────────

const ADMIN_EMAIL_PATTERNS = ['admin@', 'gaurav@'];

export function isAdminEmail(email: string): boolean {
  const lower = email.toLowerCase();
  return ADMIN_EMAIL_PATTERNS.some(pattern => lower.startsWith(pattern));
}

export function inferRole(email: string): 'admin' | 'user' {
  return isAdminEmail(email) ? 'admin' : 'user';
}