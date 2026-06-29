import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { useWebsite } from "@/contexts/WebsiteContext";
import { Globe, Palette, ArrowRight, Check } from "lucide-react";

const COLORS = [
  { label: "Indigo",  brand: "#6366f1", accent: "#8b5cf6" },
  { label: "Violet",  brand: "#7c3aed", accent: "#a78bfa" },
  { label: "Rose",    brand: "#e11d48", accent: "#fb7185" },
  { label: "Cyan",    brand: "#0891b2", accent: "#22d3ee" },
  { label: "Emerald", brand: "#059669", accent: "#34d399" },
  { label: "Amber",   brand: "#d97706", accent: "#fbbf24" },
];

export default function CreateWebsiteAdmin() {
  const navigate = useNavigate();
  const { refresh } = useWebsite();
  const [form, setForm] = useState({
    name: "",
    slug: "",
    description: "",
    domain: "",
    brand_color: COLORS[0].brand,
    accent_color: COLORS[0].accent,
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const F = (key: string, val: string) => setForm((f) => ({ ...f, [key]: val }));

  const autoSlug = (name: string) =>
    name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

  const handleNameChange = (name: string) => {
    setForm((f) => ({ ...f, name, slug: autoSlug(name) }));
  };

  const save = async () => {
    if (!form.name.trim() || !form.slug.trim()) return;
    setSaving(true);
    setError(null);
    const { error } = await supabase.from("websites").insert({
      name: form.name.trim(),
      slug: form.slug.trim(),
      description: form.description || null,
      domain: form.domain || null,
      brand_color: form.brand_color,
      accent_color: form.accent_color,
      active: true,
      sort: 99,
    });
    setSaving(false);
    if (error) { setError(error.message); return; }
    await refresh();
    navigate("/admin");
  };

  return (
    <div className="max-w-xl">
      <div className="mb-8">
        <h1 className="font-display text-2xl font-light mb-1 text-white">Add Website</h1>
        <p className="text-white/40 text-sm">Register a new website to manage from this CMS.</p>
      </div>

      {error && (
        <div className="mb-4 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
          {error}
        </div>
      )}

      <div
        className="rounded-2xl p-6 space-y-5"
        style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}
      >
        {/* Name */}
        <div>
          <label className="block text-xs uppercase tracking-widest text-white/30 mb-1.5">Website Name *</label>
          <input
            value={form.name}
            onChange={(e) => handleNameChange(e.target.value)}
            placeholder="e.g. My New Project"
            className="w-full px-3 py-2.5 rounded-xl text-sm text-white placeholder-white/20 focus:outline-none focus:border-primary/50 transition-colors"
            style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)" }}
          />
        </div>

        {/* Slug */}
        <div>
          <label className="block text-xs uppercase tracking-widest text-white/30 mb-1.5">
            URL Slug * <span className="normal-case text-white/20">(auto-generated, lowercase-hyphen)</span>
          </label>
          <div className="flex items-center gap-2">
            <Globe className="w-4 h-4 text-white/20 shrink-0" />
            <input
              value={form.slug}
              onChange={(e) => F("slug", autoSlug(e.target.value))}
              placeholder="my-new-project"
              className="flex-1 px-3 py-2.5 rounded-xl text-sm text-white placeholder-white/20 focus:outline-none focus:border-primary/50 transition-colors"
              style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)" }}
            />
          </div>
        </div>

        {/* Domain */}
        <div>
          <label className="block text-xs uppercase tracking-widest text-white/30 mb-1.5">Domain</label>
          <input
            value={form.domain}
            onChange={(e) => F("domain", e.target.value)}
            placeholder="mysite.com"
            className="w-full px-3 py-2.5 rounded-xl text-sm text-white placeholder-white/20 focus:outline-none focus:border-primary/50 transition-colors"
            style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)" }}
          />
        </div>

        {/* Description */}
        <div>
          <label className="block text-xs uppercase tracking-widest text-white/30 mb-1.5">Description</label>
          <textarea
            value={form.description}
            onChange={(e) => F("description", e.target.value)}
            rows={2}
            placeholder="What this website is about…"
            className="w-full px-3 py-2.5 rounded-xl text-sm text-white placeholder-white/20 focus:outline-none focus:border-primary/50 transition-colors resize-none"
            style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)" }}
          />
        </div>

        {/* Brand color */}
        <div>
          <label className="block text-xs uppercase tracking-widest text-white/30 mb-2">
            <Palette className="inline w-3 h-3 mr-1" />
            Brand Color
          </label>
          <div className="flex flex-wrap gap-2">
            {COLORS.map((c) => (
              <button
                key={c.brand}
                onClick={() => setForm((f) => ({ ...f, brand_color: c.brand, accent_color: c.accent }))}
                className="relative w-8 h-8 rounded-full transition-transform hover:scale-110"
                style={{ background: c.brand }}
                title={c.label}
              >
                {form.brand_color === c.brand && (
                  <Check className="absolute inset-0 m-auto w-4 h-4 text-white" />
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Preview */}
        {form.name && (
          <div
            className="rounded-xl p-4 text-sm"
            style={{
              background: `${form.brand_color}10`,
              border: `1px solid ${form.brand_color}30`,
            }}
          >
            <p className="text-white/40 text-[10px] uppercase tracking-widest mb-1">Preview</p>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full" style={{ background: form.brand_color }} />
              <span className="font-medium" style={{ color: form.brand_color }}>{form.name || "Website name"}</span>
            </div>
            {form.domain && <p className="text-white/30 text-xs mt-1">{form.domain}</p>}
          </div>
        )}
      </div>

      <div className="flex gap-3 mt-6">
        <Button
          variant="ghost"
          onClick={() => navigate("/admin")}
          className="text-white/40 hover:text-white"
        >
          Cancel
        </Button>
        <Button
          onClick={save}
          disabled={saving || !form.name.trim() || !form.slug.trim()}
          className="gap-2"
          style={{
            background: form.brand_color,
            color: "white",
          }}
        >
          {saving ? "Creating…" : "Create Website"}
          <ArrowRight className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}
