/**
 * Local demo auth — works without Supabase for development.
 * Remove this file and switch to real Supabase auth in production.
 */
import { isSupabaseReady } from "./supabase";

export interface LocalUser {
  id: string;
  email: string;
  name: string;
  role: "admin" | "user";
  created_at: string;
}

const LOCAL_USERS_KEY = "clarity_local_users";
const LOCAL_SESSION_KEY = "clarity_local_session";
const ADMIN_PATTERNS = ["admin@", "gaurav@"];

function isAdminEmail(email: string): boolean {
  const lower = email.toLowerCase();
  return ADMIN_PATTERNS.some(p => lower.startsWith(p));
}

function getLocalUsers(): LocalUser[] {
  try {
    return JSON.parse(localStorage.getItem(LOCAL_USERS_KEY) || "[]");
  } catch {
    return [];
  }
}

function saveLocalUsers(users: LocalUser[]) {
  localStorage.setItem(LOCAL_USERS_KEY, JSON.stringify(users));
}

export function getLocalSession(): { user: LocalUser } | null {
  if (isSupabaseReady()) return null;
  try {
    const raw = localStorage.getItem(LOCAL_SESSION_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function getLocalUser(): LocalUser | null {
  return getLocalSession()?.user || null;
}

export function localSignIn(email: string, password: string): LocalUser {
  if (isSupabaseReady()) throw new Error("Use Supabase auth");
  const users = getLocalUsers();
  const user = users.find(u => u.email === email.toLowerCase().trim());
  if (!user) throw new Error("Invalid login credentials");
  // In local mode, password is just for demo — accept any non-empty
  if (!password) throw new Error("Password required");
  localStorage.setItem(LOCAL_SESSION_KEY, JSON.stringify({ user }));
  return user;
}

export function localSignUp(email: string, password: string, name: string): LocalUser {
  if (isSupabaseReady()) throw new Error("Use Supabase auth");
  const emailClean = email.toLowerCase().trim();
  const users = getLocalUsers();
  if (users.find(u => u.email === emailClean)) {
    throw new Error("User already registered");
  }
  if (!password || password.length < 6) {
    throw new Error("Password should be at least 6 characters");
  }
  const newUser: LocalUser = {
    id: `local_${Date.now()}`,
    email: emailClean,
    name: name.trim(),
    role: isAdminEmail(emailClean) ? "admin" : "user",
    created_at: new Date().toISOString(),
  };
  users.push(newUser);
  saveLocalUsers(users);
  localStorage.setItem(LOCAL_SESSION_KEY, JSON.stringify({ user: newUser }));
  return newUser;
}

export function localSignOut() {
  localStorage.removeItem(LOCAL_SESSION_KEY);
}

export function isLocallyConfigured(): boolean {
  return !isSupabaseReady();
}