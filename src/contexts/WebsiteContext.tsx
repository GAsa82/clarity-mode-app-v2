import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react";
import { supabase } from "@/lib/supabase";

export type Website = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  logo_url: string | null;
  domain: string | null;
  brand_color: string;
  accent_color: string;
  active: boolean;
  sort: number;
};

type WebsiteContextType = {
  websites: Website[];
  current: Website | null;
  loading: boolean;
  switchWebsite: (site: Website) => void;
  refresh: () => Promise<void>;
};

const WebsiteContext = createContext<WebsiteContextType | undefined>(undefined);

const STORAGE_KEY = "admin_selected_website_slug";

export function WebsiteProvider({ children }: { children: ReactNode }) {
  const [websites, setWebsites] = useState<Website[]>([]);
  const [current, setCurrent] = useState<Website | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const { data, error } = await supabase
      .from("websites")
      .select("*")
      .eq("active", true)
      .order("sort", { ascending: true });

    if (error) {
      console.error("[WebsiteContext] Failed to load websites:", error.message, error.code, error.details);
    }

    // Hardcoded fallback so the admin never shows blank if DB read fails.
    // Clarity Mode and Breakthrough Protocol are separate products on separate
    // Supabase projects with no shared infrastructure — this CMS manages only
    // Clarity Mode's own content.
    const FALLBACK: Website[] = [
      { id: "4b0f921b-85b9-4c25-9a1f-e954900af418", slug: "clarity-mode", name: "Clarity Mode", description: null, logo_url: null, domain: "clarity-mode-app-v2-gq26.vercel.app", brand_color: "#6366f1", accent_color: "#8b5cf6", active: true, sort: 1 },
    ];

    const sites = (data && data.length > 0 ? data : FALLBACK) as Website[];
    setWebsites(sites);

    if (sites.length > 0) {
      const saved = localStorage.getItem(STORAGE_KEY);
      const match = sites.find((s) => s.slug === saved) ?? sites[0];
      setCurrent(match);
    }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const switchWebsite = useCallback((site: Website) => {
    setCurrent(site);
    localStorage.setItem(STORAGE_KEY, site.slug);
  }, []);

  return (
    <WebsiteContext.Provider value={{ websites, current, loading, switchWebsite, refresh: load }}>
      {children}
    </WebsiteContext.Provider>
  );
}

export function useWebsite() {
  const ctx = useContext(WebsiteContext);
  if (!ctx) throw new Error("useWebsite must be used inside WebsiteProvider");
  return ctx;
}
