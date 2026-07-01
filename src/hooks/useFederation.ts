import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

/**
 * Reads the cross-project federation gateway (`/api/federation/metrics`), which
 * returns normalized metrics for every business the console operates — even the
 * ones in a separate Supabase project (Breakthrough Protocol).
 *
 * `available` is false when the serverless gateway isn't reachable (e.g. running
 * the Vite dev server without `vercel dev`), so the UI can stay quiet instead of
 * showing an error.
 */

export type FederatedProject = {
  key: string;
  name: string;
  configured: boolean;
  users?: number | null;
  content?: number | null;
  revenue?: number | null;
};

type State = { projects: FederatedProject[]; loading: boolean; available: boolean };

export function useFederation() {
  const [state, setState] = useState<State>({ projects: [], loading: true, available: true });

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const token = session?.access_token;
        const res = await fetch("/api/federation/metrics", {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        const ct = res.headers.get("content-type") || "";
        if (!ct.includes("application/json")) {
          if (alive) setState({ projects: [], loading: false, available: false });
          return;
        }
        const json = await res.json();
        if (alive) setState({ projects: json.projects ?? [], loading: false, available: true });
      } catch {
        if (alive) setState({ projects: [], loading: false, available: false });
      }
    })();
    return () => { alive = false; };
  }, []);

  return state;
}
