import { useState } from "react";
import { motion } from "framer-motion";
import { X, CheckCircle2, Archive, Trash2, Copy, Check, Loader2 } from "lucide-react";
import { setAssetStatus, deleteAssets, type DiaryAsset, type DiaryAssetStatus } from "@/lib/diary";

const STATUS_STYLE: Record<DiaryAssetStatus, string> = {
  draft: "bg-secondary text-muted-foreground",
  review: "bg-amber-500/15 text-amber-400",
  approved: "bg-blue-500/15 text-blue-400",
  published: "bg-emerald-500/15 text-emerald-400",
  rejected: "bg-destructive/15 text-destructive",
  archived: "bg-slate-500/15 text-slate-400",
};

type Section = { heading?: string; body?: string };

export function DiaryAssetView({
  asset,
  onClose,
  onChanged,
}: {
  asset: DiaryAsset;
  onClose: () => void;
  onChanged: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const c = asset.content as Record<string, unknown>;
  const str = (k: string) => (typeof c[k] === "string" ? (c[k] as string) : null);
  const list = (k: string) => (Array.isArray(c[k]) ? (c[k] as unknown[]).filter((x) => typeof x === "string") as string[] : []);
  const sections = Array.isArray(c.sections) ? (c.sections as Section[]) : [];

  /** Flatten the structured asset into plain text for pasting elsewhere. */
  const asPlainText = () => {
    const out: string[] = [asset.title];
    if (asset.subtitle) out.push(asset.subtitle);
    if (str("abstract")) out.push("", str("abstract")!);
    if (str("description")) out.push("", str("description")!);
    for (const s of sections) out.push("", s.heading ?? "", s.body ?? "");
    if (str("script")) out.push("", "SCRIPT", str("script")!);
    for (const [label, key] of [["Key points", "key_points"], ["Action steps", "action_steps"], ["Open questions", "open_questions"]] as const) {
      const items = list(key);
      if (items.length) out.push("", label.toUpperCase(), ...items.map((i) => `• ${i}`));
    }
    return out.join("\n");
  };

  const copy = async () => {
    await navigator.clipboard.writeText(asPlainText());
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  const act = async (fn: () => Promise<void>, close = false) => {
    setBusy(true);
    setError(null);
    try {
      await fn();
      onChanged();
      if (close) onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Action failed.");
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
        className="relative w-full max-w-3xl my-8 rounded-2xl border border-border bg-card shadow-elegant overflow-hidden"
      >
        <div className="flex items-start justify-between gap-4 px-5 py-3.5 border-b border-border">
          <div className="min-w-0">
            <h2 className="font-display text-lg leading-tight">{asset.title}</h2>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              <span className="capitalize">{asset.kind.replace("_", " ")}</span>
              {" · "}built from {asset.source_page_ids.length} diary page
              {asset.source_page_ids.length === 1 ? "" : "s"}
              {asset.duration_sec ? ` · ~${Math.round(asset.duration_sec / 60)} min` : ""}
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium capitalize ${STATUS_STYLE[asset.status]}`}>
              {asset.status}
            </span>
            <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-secondary transition-colors" aria-label="Close">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="px-6 py-5 space-y-5 max-h-[calc(100vh-16rem)] overflow-y-auto">
          {asset.subtitle && <p className="text-sm text-muted-foreground italic">{asset.subtitle}</p>}

          {str("abstract") && (
            <Block label="Abstract">
              <p className="text-sm leading-relaxed">{str("abstract")}</p>
            </Block>
          )}
          {str("description") && (
            <Block label="Description">
              <p className="text-sm leading-relaxed">{str("description")}</p>
            </Block>
          )}

          {list("table_of_contents").length > 0 && (
            <Block label="Contents">
              <ol className="text-sm space-y-1 list-decimal list-inside text-muted-foreground">
                {list("table_of_contents").map((t, i) => <li key={i}>{t}</li>)}
              </ol>
            </Block>
          )}

          {sections.map((s, i) => (
            <div key={i}>
              {s.heading && <h3 className="font-display text-base mb-1.5">{s.heading}</h3>}
              {s.body && <p className="text-sm leading-relaxed whitespace-pre-wrap text-muted-foreground">{s.body}</p>}
            </div>
          ))}

          {str("script") && (
            <Block label="Narration script">
              <p className="text-sm leading-relaxed whitespace-pre-wrap font-mono text-muted-foreground">
                {str("script")}
              </p>
            </Block>
          )}

          {([["Key points", "key_points"], ["Action steps", "action_steps"], ["Open questions", "open_questions"]] as const).map(
            ([label, key]) =>
              list(key).length > 0 && (
                <Block key={key} label={label}>
                  <ul className="text-sm space-y-1.5">
                    {list(key).map((item, i) => (
                      <li key={i} className="flex gap-2 text-muted-foreground">
                        <span className="text-primary shrink-0">•</span>
                        {item}
                      </li>
                    ))}
                  </ul>
                </Block>
              )
          )}

          {error && (
            <p className="text-[11px] text-destructive px-3 py-2 rounded-lg bg-destructive/10 border border-destructive/20">
              {error}
            </p>
          )}
        </div>

        <div className="flex flex-wrap gap-2 px-5 py-4 border-t border-border">
          <button
            onClick={copy}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-secondary text-xs font-medium hover:bg-secondary/70 transition"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            {copied ? "Copied" : "Copy text"}
          </button>
          <button
            onClick={() => act(() => setAssetStatus([asset.id], "approved"))}
            disabled={busy || asset.status === "approved"}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-secondary text-xs font-medium hover:bg-secondary/70 disabled:opacity-40 transition"
          >
            <CheckCircle2 className="w-3.5 h-3.5" /> Approve
          </button>
          <button
            onClick={() => act(() => setAssetStatus([asset.id], "archived"))}
            disabled={busy || asset.status === "archived"}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-secondary text-xs font-medium hover:bg-secondary/70 disabled:opacity-40 transition"
          >
            <Archive className="w-3.5 h-3.5" /> Archive
          </button>
          <button
            onClick={() => act(() => deleteAssets([asset]), true)}
            disabled={busy}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-destructive hover:bg-destructive/10 text-xs font-medium disabled:opacity-40 transition ml-auto"
          >
            {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
            Delete
          </button>
        </div>
      </motion.div>
    </div>
  );
}

function Block({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1.5">{label}</p>
      {children}
    </div>
  );
}
