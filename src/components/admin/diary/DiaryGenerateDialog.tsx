import { useState } from "react";
import { motion } from "framer-motion";
import {
  X, FileText, Headphones, ClipboardList, Lightbulb, BookMarked, Newspaper, Loader2, Wand2, AlertTriangle,
} from "lucide-react";
import { generateAsset, type DiaryAssetKind, type DiaryPage } from "@/lib/diary";

const KINDS: { kind: DiaryAssetKind; label: string; blurb: string; icon: React.ElementType }[] = [
  { kind: "pdf", label: "PDF document", blurb: "Cover, contents and structured sections", icon: FileText },
  { kind: "audio", label: "Audio episode", blurb: "Narration script, description, takeaways", icon: Headphones },
  { kind: "template", label: "Template", blurb: "A worksheet or checklist you can reuse", icon: ClipboardList },
  { kind: "insight", label: "Insight report", blurb: "Observations, patterns, recommendations", icon: Lightbulb },
  { kind: "research_paper", label: "Research paper", blurb: "Abstract, findings, open questions", icon: BookMarked },
  { kind: "article", label: "Article", blurb: "Hook, body and conclusion, ready to publish", icon: Newspaper },
];

export function DiaryGenerateDialog({
  pages,
  onClose,
  onGenerated,
}: {
  pages: DiaryPage[];
  onClose: () => void;
  onGenerated: () => void;
}) {
  const [kind, setKind] = useState<DiaryAssetKind>("insight");
  const [instruction, setInstruction] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);

  // Generation reads the page text, so pages that have none can't contribute.
  const withText = pages.filter((p) => (p.corrected_text ?? p.ocr_text ?? "").trim().length > 0);
  const withoutText = pages.length - withText.length;

  const run = async () => {
    setBusy(true);
    setError(null);
    setDone(null);
    try {
      const { asset } = await generateAsset(kind, pages.map((p) => p.id), instruction.trim() || undefined);
      setDone(asset.title);
      onGenerated();
    } catch (e) {
      const err = e as Error & { code?: string };
      setError(
        err.code === "AI_NOT_CONFIGURED"
          ? "The AI provider isn't configured on the server yet."
          : err.code === "NO_TEXT"
            ? "None of these pages have any text yet — read the handwriting first, or type it in."
            : err.code === "INSUFFICIENT_MATERIAL"
              ? `${err.message} Try selecting more pages.`
              : err.message
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[110] flex items-start justify-center overflow-y-auto bg-black/80 backdrop-blur-sm p-4">
      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ type: "spring", stiffness: 320, damping: 30 }}
        className="relative w-full max-w-2xl my-8 rounded-2xl border border-border bg-card shadow-elegant overflow-hidden"
      >
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-border">
          <div>
            <h2 className="font-display text-lg">Generate from your diary</h2>
            <p className="text-[11px] text-muted-foreground">
              Using {pages.length} selected page{pages.length === 1 ? "" : "s"}
            </p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-secondary transition-colors" aria-label="Close">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-5">
          {withText.length === 0 ? (
            <div className="flex items-start gap-2.5 rounded-xl border border-amber-500/20 bg-amber-500/10 p-3">
              <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <p className="text-[11px] text-amber-400 leading-relaxed">
                None of the selected pages have text yet. Open a page and use{" "}
                <strong>Read handwriting</strong> first, or type the transcription in yourself —
                generation only ever builds on real page text.
              </p>
            </div>
          ) : (
            withoutText > 0 && (
              <p className="text-[11px] text-muted-foreground">
                {withoutText} of the selected pages have no text yet and will be skipped.
              </p>
            )
          )}

          <div>
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-2">What to make</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {KINDS.map(({ kind: k, label, blurb, icon: Icon }) => (
                <button
                  key={k}
                  onClick={() => setKind(k)}
                  className={`flex items-start gap-2.5 p-3 rounded-xl border text-left transition-all ${
                    kind === k
                      ? "border-primary bg-primary/10"
                      : "border-border bg-background/40 hover:border-primary/40"
                  }`}
                >
                  <Icon className={`w-4 h-4 shrink-0 mt-0.5 ${kind === k ? "text-primary" : "text-muted-foreground/60"}`} />
                  <span className="min-w-0">
                    <span className="block text-xs font-medium">{label}</span>
                    <span className="block text-[10px] text-muted-foreground leading-snug">{blurb}</span>
                  </span>
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-[10px] uppercase tracking-widest text-muted-foreground mb-1.5">
              Direction (optional)
            </label>
            <input
              value={instruction}
              onChange={(e) => setInstruction(e.target.value)}
              placeholder="e.g. aim it at founders, keep it under 800 words"
              className="w-full px-3 py-2 rounded-xl bg-background border border-border text-sm focus:outline-none focus:border-primary/50"
            />
          </div>

          {error && (
            <p className="text-[11px] text-destructive px-3 py-2 rounded-lg bg-destructive/10 border border-destructive/20">
              {error}
            </p>
          )}

          {done && (
            <p className="text-[11px] text-emerald-400 px-3 py-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
              Created “{done}” — find it under the Assets tab as a draft.
            </p>
          )}

          <p className="text-[10px] text-muted-foreground/70 leading-relaxed">
            Everything is written from your own diary text and cited back to the pages it came from.
            Nothing outside your diary is added. If there isn't enough material, it will say so rather
            than invent any.
          </p>
        </div>

        <div className="flex gap-3 px-5 py-4 border-t border-border">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-secondary text-xs font-medium hover:bg-secondary/70 transition"
          >
            {done ? "Close" : "Cancel"}
          </button>
          <button
            onClick={run}
            disabled={busy || withText.length === 0}
            className="flex-1 inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-medium hover:opacity-90 disabled:opacity-40 transition"
          >
            {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Wand2 className="w-3.5 h-3.5" />}
            {busy ? "Writing… this can take up to a minute" : done ? "Generate another" : "Generate"}
          </button>
        </div>
      </motion.div>
    </div>
  );
}
