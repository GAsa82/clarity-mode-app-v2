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
    const { data } = await supabase
      .from("websites")
      .select("*")
      .eq("active", true)
      .order("sort", { ascending: true });

    const sites = (data ?? []) as Website[];
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
