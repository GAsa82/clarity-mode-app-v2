import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  X, Video, Music, FileText, Grid3X3, Shield, BookMarked, BookOpen,
  ArrowLeft, ArrowRight, Loader2, Check,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useWebsite } from "@/contexts/WebsiteContext";
import { MediaUploadField } from "@/components/admin/MediaUploadField";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

/**
 * Unified Content Creator — one adaptive "single upload experience" over the
 * whole content_items family (session / audio / pdf / framework / protocol /
 * template). Reuses the exact insert shape ContentItemsAdmin writes, so records
 * are identical to the per-type admins. Research Papers & Old Books live in
 * their own tables, so those tiles route to their specialized create forms.
 *
 * Flow: choose type → one adaptive form (drag-drop uploads via MediaUploadField)
 * → writes to content_items for the active website.
 */

type MediaKind = "video" | "audio" | "file";
type TypeOption = { key: string; label: string; icon: React.ElementType; desc: string; media: MediaKind };

const TYPES: TypeOption[] = [
  { key: "session", label: "Video Session", icon: Video, desc: "Netflix-style video shown in browse", media: "video" },
  { key: "audio", label: "Audio", icon: Music, desc: "Ambient, meditation, or spoken audio", media: "audio" },
  { key: "pdf", label: "PDF / Document", icon: FileText, desc: "Guide, workbook, or downloadable PDF", media: "file" },
  { key: "framework", label: "Framework", icon: Grid3X3, desc: "A mental model or framework", media: "file" },
  { key: "protocol", label: "Protocol", icon: Shield, desc: "A step-by-step protocol", media: "file" },
  { key: "template", label: "Template", icon: FileText, desc: "A fillable template", media: "file" },
];

const ROUTE_OUT = [
  { label: "Research Paper", icon: BookMarked, to: "/admin/research-papers?new=1", desc: "Separate research library" },
  { label: "Old Book", icon: BookOpen, to: "/admin/old-books?new=1", desc: "Marketplace listing" },
];

type Form = {
  title: string; description: string; category: string;
  price: number; visibility: string; status: string;
  cover_url: string; file_url: string; preview_url: string;
  audio_url: string; video_url: string;
  duration_sec: number | null; tags: string[];
};

const EMPTY: Form = {
  title: "", description: "", category: "general",
  price: 0, visibility: "premium", status: "draft",
  cover_url: "", file_url: "", preview_url: "",
  audio_url: "", video_url: "", duration_sec: null, tags: [],
};

export default function UnifiedContentCreator({
  open, onClose, onCreated,
}: { open: boolean; onClose: () => void; onCreated?: () => void }) {
  const { current } = useWebsite();
  const navigate = useNavigate();
  const [picked, setPicked] = useState<TypeOption | null>(null);
  const [form, setForm] = useState<Form>(EMPTY);
  const [tagInput, setTagInput] = useState("");
  const [saving, setSaving] = useState(false);

  // Reset whenever the modal is (re)opened.
  useEffect(() => {
    if (open) { setPicked(null); setForm(EMPTY); setTagInput(""); setSaving(false); }
  }, [open]);

  if (!open) return null;

  const F = (key: keyof Form, val: unknown) => setForm((f) => ({ ...f, [key]: val }));

  const addTag = () => {
    const t = tagInput.trim().toLowerCase();
    if (t && !form.tags.includes(t)) setForm((f) => ({ ...f, tags: [...f.tags, t] }));
    setTagInput("");
  };

  const save = async () => {
    if (!picked || !form.title.trim()) return;
    if (!current) { toast.error("Pick an active website first."); return; }
    setSaving(true);
    const payload = {
      type: picked.key,
      title: form.title.trim(),
      description: form.description || null,
      category: form.category || "general",
      cover_url: form.cover_url || null,
      file_url: form.file_url || null,
      preview_url: form.preview_url || null,
      audio_url: form.audio_url || null,
      video_url: form.video_url || null,
      price: Number(form.price) || 0,
      visibility: form.visibility,
      status: form.status,
      tags: form.tags,
      duration_sec: form.duration_sec,
      website_id: current.id,
    };
    const { error } = await supabase.from("content_items").insert(payload);
    setSaving(false);
    if (error) { toast.error(`Could not create: ${error.message}`); return; }
    toast.success(`${picked.label} created${form.status === "published" ? " & published" : " as draft"}.`);
    onCreated?.();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-card border border-border rounded-2xl w-full max-w-2xl my-8">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <div className="flex items-center gap-2">
            {picked && (
              <button onClick={() => setPicked(null)} className="p-1.5 -ml-1.5 rounded-lg hover:bg-secondary transition-colors" title="Back">
                <ArrowLeft className="w-4 h-4" />
              </button>
            )}
            <h2 className="font-display text-lg">
              {picked ? `New ${picked.label}` : "Create content"}
            </h2>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-secondary transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Step 1 — type chooser */}
        {!picked && (
          <div className="px-6 py-5">
            <p className="text-xs uppercase tracking-widest text-muted-foreground mb-3">What are you adding?</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {TYPES.map((t) => {
                const Icon = t.icon;
                return (
                  <button key={t.key} onClick={() => setPicked(t)}
                    className="group flex items-start gap-3 p-4 rounded-xl bg-background border border-border hover:border-primary/40 hover:bg-primary/5 text-left transition-all">
                    <div className="p-2 rounded-lg bg-primary/10 text-primary shrink-0"><Icon className="w-4 h-4" /></div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium">{t.label}</p>
                      <p className="text-xs text-muted-foreground leading-snug">{t.desc}</p>
                    </div>
                    <ArrowRight className="w-4 h-4 text-muted-foreground/40 group-hover:text-primary ml-auto shrink-0 mt-1" />
                  </button>
                );
              })}
            </div>

            <p className="text-xs uppercase tracking-widest text-muted-foreground mt-6 mb-3">Specialized</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {ROUTE_OUT.map((r) => {
                const Icon = r.icon;
                return (
                  <button key={r.to} onClick={() => { onClose(); navigate(r.to); }}
                    className="group flex items-start gap-3 p-4 rounded-xl bg-background border border-border hover:border-primary/40 text-left transition-all">
                    <div className="p-2 rounded-lg bg-secondary text-muted-foreground shrink-0"><Icon className="w-4 h-4" /></div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium">{r.label}</p>
                      <p className="text-xs text-muted-foreground leading-snug">{r.desc}</p>
                    </div>
                    <ArrowRight className="w-4 h-4 text-muted-foreground/40 group-hover:text-primary ml-auto shrink-0 mt-1" />
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Step 2 — adaptive form */}
        {picked && (
          <>
            <div className="px-6 py-5 space-y-4">
              <div>
                <label className="block text-xs uppercase tracking-widest text-muted-foreground mb-1.5">Title *</label>
                <input autoFocus value={form.title} onChange={(e) => F("title", e.target.value)}
                  placeholder={`${picked.label} title`}
                  className="w-full px-3 py-2 rounded-xl bg-background border border-border text-sm focus:outline-none focus:border-primary/50" />
              </div>

              <div>
                <label className="block text-xs uppercase tracking-widest text-muted-foreground mb-1.5">Description</label>
                <textarea value={form.description} onChange={(e) => F("description", e.target.value)} rows={3}
                  placeholder="Brief description"
                  className="w-full px-3 py-2 rounded-xl bg-background border border-border text-sm focus:outline-none focus:border-primary/50 resize-none" />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs uppercase tracking-widest text-muted-foreground mb-1.5">Category</label>
                  <input value={form.category} onChange={(e) => F("category", e.target.value)} placeholder="e.g. focus"
                    className="w-full px-3 py-2 rounded-xl bg-background border border-border text-sm focus:outline-none focus:border-primary/50" />
                </div>
                <div>
                  <label className="block text-xs uppercase tracking-widest text-muted-foreground mb-1.5">Price (₹)</label>
                  <input type="number" min="0" value={form.price === 0 ? "" : form.price / 100}
                    onChange={(e) => F("price", e.target.value ? Math.round(Number(e.target.value) * 100) : 0)}
                    placeholder="0 = free"
                    className="w-full px-3 py-2 rounded-xl bg-background border border-border text-sm focus:outline-none focus:border-primary/50" />
                </div>
                <div>
                  <label className="block text-xs uppercase tracking-widest text-muted-foreground mb-1.5">Visibility</label>
                  <select value={form.visibility} onChange={(e) => F("visibility", e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-background border border-border text-sm focus:outline-none focus:border-primary/50">
                    <option value="public">Public</option>
                    <option value="premium">Premium</option>
                    <option value="private">Private</option>
                  </select>
                </div>
              </div>

              <MediaUploadField label="Cover Image" value={form.cover_url} onChange={(url) => F("cover_url", url)}
                folder="covers" accept="image/*" maxSizeMB={10} />

              {picked.media === "video" && (
                <MediaUploadField label="Video" value={form.video_url} onChange={(url) => F("video_url", url)}
                  folder="video" accept="video/*" maxSizeMB={2048} placeholder="https://… (mp4) or upload a file" />
              )}
              {picked.media === "audio" && (
                <MediaUploadField label="Audio File" value={form.audio_url} onChange={(url) => F("audio_url", url)}
                  folder="audio" accept="audio/*" placeholder="https://…mp3 or upload a file" />
              )}
              {picked.media === "file" && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <MediaUploadField label="File" value={form.file_url} onChange={(url) => F("file_url", url)}
                    folder="files" accept=".pdf,.doc,.docx,.zip" />
                  <MediaUploadField label="Preview" value={form.preview_url} onChange={(url) => F("preview_url", url)}
                    folder="previews" accept=".pdf,image/*" />
                </div>
              )}

              {(picked.media === "video" || picked.media === "audio") && (
                <div>
                  <label className="block text-xs uppercase tracking-widest text-muted-foreground mb-1.5">Duration (minutes)</label>
                  <input type="number" min="0" value={form.duration_sec ? form.duration_sec / 60 : ""}
                    onChange={(e) => F("duration_sec", e.target.value ? Math.round(Number(e.target.value) * 60) : null)}
                    placeholder="24"
                    className="w-full px-3 py-2 rounded-xl bg-background border border-border text-sm focus:outline-none focus:border-primary/50" />
                </div>
              )}

              {/* Tags */}
              <div>
                <label className="block text-xs uppercase tracking-widest text-muted-foreground mb-1.5">Tags</label>
                {form.tags.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-2">
                    {form.tags.map((t) => (
                      <span key={t} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary/10 text-primary text-xs">
                        {t}
                        <button onClick={() => F("tags", form.tags.filter((x) => x !== t))} className="hover:text-destructive"><X className="w-2.5 h-2.5" /></button>
                      </span>
                    ))}
                  </div>
                )}
                <div className="flex gap-2">
                  <input value={tagInput} onChange={(e) => setTagInput(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addTag(); } }}
                    placeholder="Add tag…"
                    className="flex-1 px-3 py-2 rounded-xl bg-background border border-border text-sm focus:outline-none focus:border-primary/50" />
                  <Button variant="outline" size="sm" onClick={addTag}>Add</Button>
                </div>
              </div>

              {/* Status */}
              <div>
                <label className="block text-xs uppercase tracking-widest text-muted-foreground mb-1.5">Status</label>
                <div className="flex gap-2">
                  {["draft", "published", "archived"].map((s) => (
                    <button key={s} onClick={() => F("status", s)}
                      className={`flex-1 py-2 rounded-xl text-xs font-medium capitalize transition-all border ${form.status === s ? "bg-primary/10 border-primary/30 text-primary" : "bg-background border-border text-muted-foreground hover:text-foreground"}`}>
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex gap-3 px-6 py-4 border-t border-border">
              <Button variant="outline" size="sm" className="flex-1" onClick={() => setPicked(null)}>Back</Button>
              <Button variant="hero" size="sm" className="flex-1 gap-1.5" onClick={save} disabled={saving || !form.title.trim()}>
                {saving ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving…</> : <><Check className="w-4 h-4" /> Create {picked.label}</>}
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
