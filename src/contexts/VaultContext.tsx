import { createContext, useCallback, useContext, useState, type ReactNode } from "react";
import { AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase, isSupabaseReady } from "@/lib/supabase";
import { VAULT_CONFIGURED, VAULT_PATHS, type VaultPath } from "@/lib/vault-config";
import { VaultTransition } from "@/components/VaultTransition";

type VaultStatus = "idle" | "transitioning";

interface VaultContextValue {
  openVault: (path?: VaultPath) => void;
  status: VaultStatus;
}

const VaultContext = createContext<VaultContextValue>({
  openVault: () => {},
  status: "idle",
});

function trackVault(
  event: string,
  props?: Record<string, unknown>,
) {
  const ph = (window as any).posthog;
  ph?.capture?.(event, { platform: "clarity-mode", ...props });
}

export function VaultProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<VaultStatus>("idle");
  const navigate = useNavigate();
  const { user, isAdmin } = useAuth();

  const openVault = useCallback(
    async (path: VaultPath = "home") => {
      if (!VAULT_CONFIGURED) {
        trackVault("vault_navigation_error", {
          reason: "not_configured",
          destination: path,
        });
        navigate("/vault-unavailable?reason=not-configured");
        return;
      }

      const role = isAdmin ? "admin" : user ? "user" : "guest";
      trackVault("vault_navigation_started", { destination: path, role });

      setStatus("transitioning");

      let targetUrl: string = VAULT_PATHS[path];

      // Pass session tokens in URL fragment so the Vault's Supabase client
      // (detectSessionInUrl: true) can auto-detect and restore the session.
      // Hash fragments are never sent to the server and are client-only.
      if (user && isSupabaseReady()) {
        try {
          const {
            data: { session },
          } = await supabase.auth.getSession();
          if (session) {
            const hash = new URLSearchParams({
              access_token: session.access_token,
              refresh_token: session.refresh_token,
              token_type: "bearer",
              expires_in: String(session.expires_in ?? 3600),
            }).toString();
            targetUrl = `${targetUrl}#${hash}`;
          }
        } catch {
          // navigate without token — Vault shows appropriate gate
        }
      }

      // Admin skips waiting; regular users see the full transition
      const delay = isAdmin ? 1000 : 1800;

      setTimeout(() => {
        trackVault("vault_navigation_completed", { destination: path, role });
        window.location.href = targetUrl;
      }, delay);
    },
    [user, isAdmin, navigate],
  );

  return (
    <VaultContext.Provider value={{ openVault, status }}>
      {children}
      <AnimatePresence>
        {status === "transitioning" && <VaultTransition isAdmin={isAdmin} />}
      </AnimatePresence>
    </VaultContext.Provider>
  );
}

export function useVault() {
  return useContext(VaultContext);
}
