import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react";
import type { Session, User } from '@supabase/supabase-js';
import {
  signIn as authSignIn,
  signUp as authSignUp,
  signOut as authSignOut,
  resetPassword,
  updatePassword,
  getCurrentSession,
  getProfile,
  onAuthStateChange,
  getAuthErrorMessage,
} from "@/lib/auth";
import type { Profile } from "@/lib/supabase";
import { isSupabaseReady } from "@/lib/supabase";
import {
  getLocalUser,
  localSignIn,
  localSignUp,
  localSignOut,
  isLocallyConfigured,
} from "@/lib/local-auth";
import type { LocalUser } from "@/lib/local-auth";

interface AuthContextType {
  user: User | LocalUser | null;
  profile: Profile | null;
  session: Session | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, name: string) => Promise<void>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  updatePassword: (password: string) => Promise<void>;
  refreshProfile: () => Promise<void>;
  isAdmin: boolean;
  error: string | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | LocalUser | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProfile = useCallback(async (userId: string) => {
    try {
      const p = await getProfile(userId);
      setProfile(p);
    } catch (err: any) {
      console.error('Failed to fetch profile:', err);
      if (err.code === 'PGRST116') {
        setProfile(null);
      }
    }
  }, []);

  useEffect(() => {
    const init = async () => {
      if (!isSupabaseReady()) {
        // Use local auth
        const localUser = getLocalUser();
        if (localUser) {
          setUser(localUser);
        }
        setLoading(false);
        return;
      }
      try {
        const currentSession = await getCurrentSession();
        if (currentSession) {
          setSession(currentSession);
          setUser(currentSession.user);
          await fetchProfile(currentSession.user.id);
        }
      } catch (err: any) {
        console.error('Auth init error:', err);
      } finally {
        setLoading(false);
      }
    };

    init();

    // Listen for auth changes (Supabase only)
    if (!isSupabaseReady()) return () => {};
    const { data: { subscription } } = onAuthStateChange(async (event, newSession) => {
      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        setSession(newSession);
        setUser(newSession?.user ?? null);
        if (newSession?.user) {
          await fetchProfile(newSession.user.id);
        }
      } else if (event === 'SIGNED_OUT') {
        setSession(null);
        setUser(null);
        setProfile(null);
      } else if (event === 'USER_UPDATED') {
        if (newSession?.user) {
          await fetchProfile(newSession.user.id);
        }
      }
    });

    return () => {
      subscription?.unsubscribe();
    };
  }, [fetchProfile]);

  const refreshProfile = useCallback(async () => {
    if (user) {
      await fetchProfile((user as any).id);
    }
  }, [user, fetchProfile]);

  const signIn = useCallback(async (email: string, password: string) => {
    setError(null);
    try {
      if (isLocallyConfigured()) {
        const localUser = localSignIn(email, password);
        setUser(localUser);
      } else {
        await authSignIn(email, password);
      }
    } catch (err: any) {
      const msg = isLocallyConfigured() ? err.message : getAuthErrorMessage(err);
      setError(msg);
      throw err;
    }
  }, []);

  const signUp = useCallback(async (email: string, password: string, name: string) => {
    setError(null);
    try {
      if (isLocallyConfigured()) {
        const localUser = localSignUp(email, password, name);
        setUser(localUser);
      } else {
        await authSignUp(email, password, name);
      }
    } catch (err: any) {
      const msg = isLocallyConfigured() ? err.message : getAuthErrorMessage(err);
      setError(msg);
      throw err;
    }
  }, []);

  const signOut = useCallback(async () => {
    setError(null);
    try {
      if (isLocallyConfigured()) {
        localSignOut();
        setUser(null);
        setProfile(null);
      } else {
        await authSignOut();
      }
    } catch (err: any) {
      const msg = getAuthErrorMessage(err);
      setError(msg);
    }
  }, []);

  const handleResetPassword = useCallback(async (email: string) => {
    setError(null);
    try {
      await resetPassword(email);
    } catch (err: any) {
      const msg = getAuthErrorMessage(err);
      setError(msg);
      throw err;
    }
  }, []);

  const handleUpdatePassword = useCallback(async (newPassword: string) => {
    setError(null);
    try {
      await updatePassword(newPassword);
    } catch (err: any) {
      const msg = getAuthErrorMessage(err);
      setError(msg);
      throw err;
    }
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        session,
        loading,
        signIn,
        signUp,
        signOut,
        resetPassword: handleResetPassword,
        updatePassword: handleUpdatePassword,
        refreshProfile,
        isAdmin: profile?.role === "admin" || ((user as LocalUser)?.role === "admin"),
        error,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}