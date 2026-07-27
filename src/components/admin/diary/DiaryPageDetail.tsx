import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  X, Save, Trash2, Archive, CheckCircle2, AlertTriangle, History, Loader2, ExternalLink, Clock, Wand2,
} from "lucide-react";
import {
  signDiaryPath, savePageText, setPageStatus, deletePages, getPageVersions, processPage,
  formatBytes, type DiaryPage, type DiaryPageVersion, type DiaryStatus,
} from "@/lib/diary";

const STATUS_STYLE: Record<DiaryStatus, string> = {
  pending: "bg-secondary text-muted-foreground",
  processing: "bg-blue-500/15 text-blue-400",
  needs_review: "bg-amber-500/15 text-amber-400",
  processed: "bg-emerald-500/15 text-emerald-400",
  failed: "bg-destructive/15 text-destructive",
  archived: "bg-slate-500/15 text-slate-400",
};

export function DiaryPageDetail({
  page,
  onClose,
  onChanged,
}: {
  page: DiaryPage;
  onClose: () => void;
  onChanged: () => void;
}) {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [text, setText] = useState(page.corrected_text ?? page.ocr_text ?? "");
  const [summary, setSummary] = useState(page.summary ?? "");
  const [saving, setSaving] = useState(false);
  const [busy, setBusy] = useState(false);
  const [versions, setVersions] = useState<DiaryPageVersion[]>([]);
  const [showVersions, setShowVersions] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    // Private bucket — the full-resolution scan needs a fresh signed URL.
    signDiaryPath(page.image_path).then(setImageUrl);
    getPageVersions(page.id).then(setVersions);
  }, [page.id, page.image_path]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  const dirty = text !== (page.corrected_text ?? page.ocr_text ?? "") || summary !== (page.summary ?? "");

  const save = async () => {
    setSaving(true);
    setError(null);
    try {
      await savePageText(page, { corrected_text: text, summary: summary || null });
      onChanged();
      setVersions(await getPageVersions(page.id));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed.");
    } finally {
      setSaving(false);
    }
  };

  const changeStatus = async (status: DiaryStatus) => {
    setBusy(true);
    setError(null);
    try {
      await setPageStatus([page.id], status);
      onChanged();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Update failed.");
    } finally {
      setBusy(false);
    }
  };

  const runProcessing = async () => {
    setProcessing(true);
    setError(null);
    setNotice(null);
    try {
      const r = await processPage(page.id);
      setNotice(
        r.statusMessage ??
          `Transcribed with ${Math.round(r.confidence * 100)}% confidence.`
      );
      onChanged();
    } catch (e) {
      const err = e as Error & { code?: string };
      setError(
        err.code === "AI_NOT_CONFIGURED"
          ? "Handwriting recognition isn't switched on yet — a GEMINI_API_KEY needs adding to the server environment."
          : err.message
      );
    } finally {
      setProcessing(false);
    }
  };

  const remove = async () => {
    setBusy(true);
    try {
      await deletePages([page]);
      onChanged();
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Delete failed.");
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center overflow-y-auto bg-black/80 backdrop-blur-sm p-4">
      <motion.div
        initial={{ opacity: 0, y: 24, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ type: "spring", stiffness: 320, damping: 30 }}
        className="relative w-full max-w-6xl my-6 rounded-2xl border border-border bg-card shadow-elegant overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between gap-4 px-5 py-3.5 border-b border-border">
          <div className="min-w-0">
            <p className="text-sm font-medium truncate">
              {page.original_filename ?? "Diary page"}
            </p>
            <p className="text-[11px] text-muted-foreground">
              {new Date(page.created_at).toLocaleString()}
              {page.file_size_bytes ? ` · ${formatBytes(page.file_size_bytes)}` : ""}
              {` · v${page.version}`}
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span
              className={`px-2 py-0.5 rounded-full text-[10px] font-medium capitalize ${STATUS_STYLE[page.status]}`}
            >
              {page.status.replace("_", " ")}
            </span>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg hover:bg-secondary transition-colors"
              aria-label="Close"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-0 max-h-[calc(100vh-12rem)] overflow-y-auto">
          {/* Scan */}
          <div className="bg-black/40 p-4 flex flex-col gap-3 border-b lg:border-b-0 lg:border-r border-border">
            {imageUrl ? (
              <>
                <img
                  src={imageUrl}
                  alt={page.original_filename ?? "Diary page scan"}
                  className="w-full rounded-xl object-contain max-h-[60vh] bg-black"
                />
                <a
                  href={imageUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-[11px] text-muted-foreground hover:text-primary transition-colors self-start"
                >
                  <ExternalLink className="w-3 h-3" /> Open full size
                </a>
              </>
            ) : (
              <div className="aspect-[3/4] rounded-xl bg-secondary/40 animate-pulse" />
            )}
          </div>

          {/* Text + metadata */}
          <div className="p-5 space-y-5">
            {page.status === "pending" && (
              <div className="flex items-start gap-2.5 rounded-xl border border-border bg-background/50 p-3">
                <Clock className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  Waiting for processing. Automatic handwriting recognition activates once an AI
                  provider key is configured — until then you can type the page text in manually
                  below and it becomes fully searchable.
                </p>
              </div>
            )}

            {page.confidence !== null && (
              <div className="flex items-center gap-2 text-[11px]">
                <span className="text-muted-foreground">OCR confidence</span>
                <span
                  className={
                    page.confidence >= 0.8
                      ? "text-emerald-400"
                      : page.confidence >= 0.5
                        ? "text-amber-400"
                        : "text-destructive"
                  }
                >
                  {Math.round(page.confidence * 100)}%
                </span>
              </div>
            )}

            <div>
              <label className="block text-[10px] uppercase tracking-widest text-muted-foreground mb-1.5">
                Summary
              </label>
              <input
                value={summary}
                onChange={(e) => setSummary(e.target.value)}
                placeholder="One-line summary of this page"
                className="w-full px-3 py-2 rounded-xl bg-background border border-border text-sm focus:outline-none focus:border-primary/50"
              />
            </div>

            <div>
              <label className="block text-[10px] uppercase tracking-widest text-muted-foreground mb-1.5">
                Page text
              </label>
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                rows={12}
                placeholder="The transcribed contents of this diary page…"
                className="w-full px-3 py-2 rounded-xl bg-background border border-border text-sm leading-relaxed focus:outline-none focus:border-primary/50 resize-y font-mono"
              />
              <p className="text-[10px] text-muted-foreground mt-1">
                {text.length.toLocaleString()} characters
                {page.ocr_text && page.corrected_text && page.ocr_text !== page.corrected_text
                  ? " · edited from the original machine output"
                  : ""}
              </p>
            </div>

            {(page.topics.length > 0 || page.tags.length > 0) && (
              <div className="flex flex-wrap gap-1.5">
                {page.topics.map((t) => (
                  <span key={t} className="px-2 py-0.5 rounded-full bg-primary/10 text-primary text-[10px]">
                    {t}
                  </span>
                ))}
                {page.tags.map((t) => (
                  <span key={t} className="px-2 py-0.5 rounded-full bg-secondary text-muted-foreground text-[10px]">
                    #{t}
                  </span>
                ))}
              </div>
            )}

            {page.status_message && !notice && !error && (
              <p className="text-[11px] text-amber-400 px-3 py-2 rounded-lg bg-amber-500/10 border border-amber-500/20">
                {page.status_message}
              </p>
            )}

            {notice && (
              <p className="text-[11px] text-emerald-400 px-3 py-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                {notice}
              </p>
            )}

            {error && (
              <p className="text-[11px] text-destructive px-3 py-2 rounded-lg bg-destructive/10 border border-destructive/20">
                {error}
              </p>
            )}

            {/* Actions */}
            <div className="flex flex-wrap gap-2 pt-1">
              <button
                onClick={runProcessing}
                disabled={processing || busy}
                title="Read the handwriting and extract topics, lessons and ideas"
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-primary/15 text-primary border border-primary/30 text-xs font-medium hover:bg-primary/25 disabled:opacity-40 transition"
              >
                {processing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Wand2 className="w-3.5 h-3.5" />}
                {processing ? "Reading…" : "Read handwriting"}
              </button>
              <button
                onClick={save}
                disabled={!dirty || saving}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-medium hover:opacity-90 disabled:opacity-40 transition"
              >
                {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                {saving ? "Saving…" : "Save"}
              </button>
              <button
                onClick={() => changeStatus("processed")}
                disabled={busy || page.status === "processed"}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-secondary text-xs font-medium hover:bg-secondary/70 disabled:opacity-40 transition"
              >
                <CheckCircle2 className="w-3.5 h-3.5" /> Approve
              </button>
              <button
                onClick={() => changeStatus("needs_review")}
                disabled={busy || page.status === "needs_review"}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-secondary text-xs font-medium hover:bg-secondary/70 disabled:opacity-40 transition"
              >
                <AlertTriangle className="w-3.5 h-3.5" /> Flag for review
              </button>
              <button
                onClick={() => changeStatus("archived")}
                disabled={busy || page.status === "archived"}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-secondary text-xs font-medium hover:bg-secondary/70 disabled:opacity-40 transition"
              >
                <Archive className="w-3.5 h-3.5" /> Archive
              </button>
              <button
                onClick={() => setConfirmDelete(true)}
                disabled={busy}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-destructive hover:bg-destructive/10 text-xs font-medium disabled:opacity-40 transition ml-auto"
              >
                <Trash2 className="w-3.5 h-3.5" /> Delete
              </button>
            </div>

            {/* Version history */}
            {versions.length > 0 && (
              <div className="pt-2 border-t border-border">
                <button
                  onClick={() => setShowVersions((v) => !v)}
                  className="inline-flex items-center gap-1.5 text-[11px] text-muted-foreground hover:text-foreground transition-colors"
                >
                  <History className="w-3.5 h-3.5" />
                  {showVersions ? "Hide" : "Show"} version history ({versions.length})
                </button>
                {showVersions && (
                  <ul className="mt-3 space-y-2">
                    {versions.map((v) => (
                      <li key={v.id} className="rounded-lg border border-border bg-background/40 p-2.5">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-[10px] font-medium">v{v.version}</span>
                          <span className="text-[10px] text-muted-foreground">
                            {new Date(v.created_at).toLocaleString()}
                          </span>
                        </div>
                        {v.change_note && (
                          <p className="text-[10px] text-muted-foreground mb-1">{v.change_note}</p>
                        )}
                        <p className="text-[10px] text-muted-foreground/80 line-clamp-3 font-mono">
                          {v.corrected_text || <em>empty</em>}
                        </p>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </div>
        </div>

        {confirmDelete && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
            <div className="bg-card border border-border rounded-2xl p-6 w-full max-w-sm">
              <h3 className="font-display text-lg mb-2">Delete this page?</h3>
              <p className="text-muted-foreground text-sm mb-6">
                The scan and all its extracted text will be permanently removed. This cannot be undone.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setConfirmDelete(false)}
                  className="flex-1 px-3 py-2 rounded-xl bg-secondary text-sm hover:bg-secondary/70 transition"
                >
                  Cancel
                </button>
                <button
                  onClick={remove}
                  disabled={busy}
                  className="flex-1 px-3 py-2 rounded-xl bg-destructive text-destructive-foreground text-sm font-medium hover:opacity-90 disabled:opacity-50 transition"
                >
                  {busy ? "Deleting…" : "Delete"}
                </button>
              </div>
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
}
