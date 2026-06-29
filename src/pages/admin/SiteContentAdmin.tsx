import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { getHeroContent, setSetting, getSetting, HERO_DEFAULTS, type HeroContent } from "@/lib/site-settings";
import { useWebsite } from "@/contexts/WebsiteContext";
import { Sparkles, Check, RotateCcw } from "lucide-react";

type Toggle = { key: string; label: string; desc: string };

const TOGGLES: Toggle[] = [
  { key: "testimonials_on_home", label: "Testimonials on Home", desc: "Show the testimonials section on the landing page" },
  { key: "vault_enabled", label: "Vault Storefront", desc: "Show the Breakthrough Protocol Vault storefront" },
  { key: "navigator_enabled", label: "Cross-site Navigator", desc: "Show the navigator panel on all pages" },
  { key: "applications_open", label: "Applications Open", desc: "Accept new applications" },
];

export default function SiteContentAdmin() {
  const { current } = useWebsite();
  const [hero, setHero] = useState<HeroContent>(HERO_DEFAULTS);
  const [toggles, setToggles] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [savingHero, setSavingHero] = useState(false);
  const [savedHero, setSavedHero] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!current) return;
    setLoading(true);
    (async () => {
      setHero(await getHeroContent(current.slug));
      const entries = await Promise.all(
        TOGGLES.map(async (t) => [t.key, (await getSetting<boolean>(`${t.key}:${current.slug}`)) ?? false] as const)
      );
      setToggles(Object.fromEntries(entries));
      setLoading(false);
    })();
  }, [current?.slug]);

  const H = (key: keyof HeroContent, val: string) => setHero((h) => ({ ...h, [key]: val }));

  const saveHero = async () => {
    if (!current) return;
    setSavingHero(true);
    setError(null);
    setSavedHero(false);
    const { error } = await setSetting(`hero:${current.slug}`, hero, `Hero content for ${current.name}`);
    setSavingHero(false);
    if (error) { setError(error.message); return; }
    setSavedHero(true);
    setTimeout(() => setSavedHero(false), 2500);
  };

  const toggle = async (key: string) => {
    if (!current) return;
    const next = !toggles[key];
    setToggles((t) => ({ ...t, [key]: next }));
    const { error } = await setSetting(`${key}:${current.slug}`, next);
    if (error) {
      setError(error.message);
      setToggles((t) => ({ ...t, [key]: !next }));
    }
  };

  if (loading) return <div className="py-12 text-center text-muted-foreground">Loading…</div>;

  return (
    <div className="max-w-3xl">
      <div className="mb-6">
        <h1 className="font-display text-2xl font-light mb-1">Site Content</h1>
        <p className="text-muted-foreground text-sm">Edit the landing page hero and toggle homepage sections — no code required.</p>
      </div>

      {error && (
        <div className="mb-4 px-4 py-3 rounded-xl bg-destructive/10 border border-destructive/30 text-destructive text-sm">
          {error}
        </div>
      )}

      {/* Hero */}
      <section className="rounded-2xl border border-border bg-card p-6 mb-6">
        <div className="flex items-center gap-2 mb-5">
          <Sparkles className="w-4 h-4 text-primary" />
          <h2 className="font-display text-lg">Hero Section</h2>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-xs uppercase tracking-widest text-muted-foreground mb-1.5">Badge Text</label>
            <input value={hero.badge} onChange={(e) => H("badge", e.target.value)} className="w-full px-3 py-2 rounded-xl bg-background border border-border text-sm focus:outline-none focus:border-primary/50" />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs uppercase tracking-widest text-muted-foreground mb-1.5">Title — Line 1</label>
              <input value={hero.titleLine1} onChange={(e) => H("titleLine1", e.target.value)} className="w-full px-3 py-2 rounded-xl bg-background border border-border text-sm focus:outline-none focus:border-primary/50" />
            </div>
            <div>
              <label className="block text-xs uppercase tracking-widest text-muted-foreground mb-1.5">Title — Line 2 (accent)</label>
              <input value={hero.titleLine2} onChange={(e) => H("titleLine2", e.target.value)} className="w-full px-3 py-2 rounded-xl bg-background border border-border text-sm focus:outline-none focus:border-primary/50" />
            </div>
          </div>

          <div>
            <label className="block text-xs uppercase tracking-widest text-muted-foreground mb-1.5">Subtitle</label>
            <textarea value={hero.subtitle} onChange={(e) => H("subtitle", e.target.value)} rows={3} className="w-full px-3 py-2 rounded-xl bg-background border border-border text-sm focus:outline-none focus:border-primary/50 resize-none" />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs uppercase tracking-widest text-muted-foreground mb-1.5">Primary CTA Label</label>
              <input value={hero.primaryCtaLabel} onChange={(e) => H("primaryCtaLabel", e.target.value)} className="w-full px-3 py-2 rounded-xl bg-background border border-border text-sm focus:outline-none focus:border-primary/50" />
            </div>
            <div>
              <label className="block text-xs uppercase tracking-widest text-muted-foreground mb-1.5">Secondary CTA Label</label>
              <input value={hero.secondaryCtaLabel} onChange={(e) => H("secondaryCtaLabel", e.target.value)} className="w-full px-3 py-2 rounded-xl bg-background border border-border text-sm focus:outline-none focus:border-primary/50" />
            </div>
          </div>

          {/* Live preview */}
          <div className="rounded-xl border border-border bg-background/60 p-5 mt-2">
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-3">Live Preview</p>
            <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-xs text-muted-foreground mb-3">{hero.badge}</span>
            <h3 className="font-display text-2xl md:text-3xl font-light leading-tight">
              {hero.titleLine1}<br />
              <span className="text-gradient italic">{hero.titleLine2}</span>
            </h3>
            <p className="text-sm text-muted-foreground mt-2 line-clamp-2">{hero.subtitle}</p>
          </div>

          <div className="flex items-center gap-3 pt-1">
            <Button variant="hero" size="sm" onClick={saveHero} disabled={savingHero} className="gap-1.5">
              {savedHero ? <><Check className="w-4 h-4" /> Saved</> : savingHero ? "Saving…" : "Save Hero"}
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setHero(HERO_DEFAULTS)} className="gap-1.5 text-muted-foreground">
              <RotateCcw className="w-3.5 h-3.5" /> Reset to defaults
            </Button>
          </div>
        </div>
      </section>

      {/* Section toggles */}
      <section className="rounded-2xl border border-border bg-card p-6">
        <h2 className="font-display text-lg mb-5">Homepage Sections</h2>
        <div className="space-y-3">
          {TOGGLES.map((t) => (
            <div key={t.key} className="flex items-center justify-between gap-4 py-2">
              <div>
                <p className="text-sm font-medium">{t.label}</p>
                <p className="text-xs text-muted-foreground">{t.desc}</p>
              </div>
              <button
                onClick={() => toggle(t.key)}
                className={`relative w-11 h-6 rounded-full transition-colors shrink-0 ${toggles[t.key] ? "bg-primary" : "bg-secondary"}`}
                aria-pressed={toggles[t.key]}
              >
                <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white transition-transform ${toggles[t.key] ? "translate-x-5" : ""}`} />
              </button>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
