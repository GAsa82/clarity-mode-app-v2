import { supabase } from "@/lib/supabase";

export type HeroContent = {
  badge: string;
  titleLine1: string;
  titleLine2: string; // rendered italic / gradient
  subtitle: string;
  primaryCtaLabel: string;
  secondaryCtaLabel: string;
};

export const HERO_DEFAULTS: HeroContent = {
  badge: "Premium Knowledge Library",
  titleLine1: "The library your",
  titleLine2: "best mind needs.",
  subtitle:
    "Access premium research papers, frameworks, protocols, templates, and mental clarity resources designed to improve decision-making, focus, productivity, and personal growth.",
  primaryCtaLabel: "Explore Research Papers",
  secondaryCtaLabel: "Browse clarity sessions →",
};

/** Read a single jsonb setting by key. Returns null if missing. */
export async function getSetting<T>(key: string): Promise<T | null> {
  const { data, error } = await supabase
    .from("site_settings")
    .select("value")
    .eq("key", key)
    .maybeSingle();
  if (error || !data) return null;
  return data.value as T;
}

/** Upsert a single jsonb setting. Requires admin RLS. */
export async function setSetting(key: string, value: unknown, description?: string) {
  const row: Record<string, unknown> = { key, value };
  if (description) row.description = description;
  return supabase.from("site_settings").upsert(row, { onConflict: "key" });
}

/** Hero content merged with defaults — pass a site slug for per-site keys, or omit for legacy key "hero". */
export async function getHeroContent(siteSlug?: string): Promise<HeroContent> {
  const key = siteSlug ? `hero:${siteSlug}` : "hero";
  const stored = await getSetting<Partial<HeroContent>>(key);
  return { ...HERO_DEFAULTS, ...(stored ?? {}) };
}

/** Module-level cache so live-site components only hit DB once per page load. */
const _websiteIdCache: Record<string, string> = {};

/** Returns the Supabase ID for a website by slug. Used by public pages to filter content. */
export async function getWebsiteIdBySlug(slug: string): Promise<string | null> {
  if (_websiteIdCache[slug]) return _websiteIdCache[slug];
  const { data } = await supabase.from("websites").select("id").eq("slug", slug).maybeSingle();
  if (data?.id) _websiteIdCache[slug] = data.id;
  return data?.id ?? null;
}
