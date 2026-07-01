import { useEffect, useState, useCallback, useRef } from "react";
import { Check, X, Trash2, Crown, Clock, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import {
  getPendingFaces,
  getReviewedFaces,
  reviewFace,
  deleteFace,
  getQueuedFaceSubmissionCount,
  type FaceSubmission,
} from "@/lib/face-submissions";

const AUTO_REFRESH_MS = 20000;

export default function FaceSubmissionsAdmin() {
  const [pending, setPending] = useState<FaceSubmission[]>([]);
  const [reviewed, setReviewed] = useState<FaceSubmission[]>([]);
  const [queuedCount, setQueuedCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const isFirstLoad = useRef(true);

  const load = useCallback(async () => {
    if (isFirstLoad.current) setLoading(true);
    else setRefreshing(true);
    try {
      const [p, r, q] = await Promise.all([
        getPendingFaces(),
        getReviewedFaces(),
        getQueuedFaceSubmissionCount(),
      ]);
      setPending(p);
      setReviewed(r);
      setQueuedCount(q);
    } catch {
      if (isFirstLoad.current) {
        toast.error("Couldn't load submissions. Did you run the face_submissions migration?");
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
      isFirstLoad.current = false;
    }
  }, []);

  // Load on mount, then keep this page fresh automatically: submissions can
  // arrive from any device at any time, and this page has no realtime feed —
  // so poll, and also refetch whenever the admin switches back to this tab.
  useEffect(() => {
    load();
    const interval = setInterval(load, AUTO_REFRESH_MS);
    const onVisible = () => {
      if (document.visibilityState === "visible") load();
    };
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", onVisible);
    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", onVisible);
    };
  }, [load]);

  const act = async (id: string, fn: () => Promise<void>, msg: string) => {
    setBusy(id);
    try {
      await fn();
      toast.success(msg);
      await load();
    } catch {
      toast.error("Action failed. Please try again.");
    } finally {
      setBusy(null);
    }
  };

  const fmt = (iso: string) => new Date(iso).toLocaleString();

  return (
    <div className="p-6 md:p-8 max-w-6xl">
      <header className="mb-8">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-primary mb-2">
              <Crown className="w-4 h-4" />
              <span className="text-xs uppercase tracking-[0.2em]">Community Spotlight</span>
            </div>
            <h1 className="text-2xl font-semibold">Member of the Day — Submissions</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Approve or reject profiles submitted for the public "Member of the Day" widget.
              Approved members appear on the site; rejected ones never do.
            </p>
          </div>
          <button
            onClick={load}
            disabled={refreshing}
            className="shrink-0 inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-secondary hover:bg-secondary/70 text-xs font-medium disabled:opacity-60 transition"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </div>
        {queuedCount > 0 && (
          <div className="mt-3 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-3 py-2 text-xs text-primary">
            <Clock className="w-3 h-3" />
            {queuedCount} offline submission(s) queued for retry.
          </div>
        )}
      </header>

      {/* Pending queue */}
      <section className="mb-10">
        <div className="flex items-center gap-2 mb-4">
          <Clock className="w-4 h-4 text-yellow-400" />
          <h2 className="text-sm font-medium uppercase tracking-wide">
            Pending review
          </h2>
          <span className="text-xs px-2 py-0.5 rounded-full bg-yellow-500/15 text-yellow-400 border border-yellow-500/20">
            {pending.length}
          </span>
        </div>

        {loading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : pending.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-card/40 p-10 text-center">
            <p className="text-sm text-muted-foreground">Nothing waiting for review. 🎉</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {pending.map((s) => (
              <div key={s.id} className="rounded-2xl border border-border bg-card/60 overflow-hidden">
                <div className="aspect-square bg-secondary">
                  <img src={s.image} alt={s.username} className="w-full h-full object-cover" />
                </div>
                <div className="p-4">
                  <p className="font-medium truncate">@{s.username}</p>
                  <p className="text-[11px] text-muted-foreground mb-3">{fmt(s.created_at)}</p>
                  <div className="flex gap-2">
                    <button
                      disabled={busy === s.id}
                      onClick={() => act(s.id, () => reviewFace(s.id, "approved"), "Approved — now live")}
                      className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:opacity-90 disabled:opacity-50 transition"
                    >
                      <Check className="w-3.5 h-3.5" /> Approve
                    </button>
                    <button
                      disabled={busy === s.id}
                      onClick={() => act(s.id, () => reviewFace(s.id, "rejected"), "Rejected")}
                      className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-secondary text-foreground text-xs font-medium hover:bg-secondary/70 disabled:opacity-50 transition"
                    >
                      <X className="w-3.5 h-3.5" /> Reject
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Recently reviewed */}
      {reviewed.length > 0 && (
        <section>
          <h2 className="text-sm font-medium uppercase tracking-wide mb-4">Recently reviewed</h2>
          <div className="space-y-2">
            {reviewed.map((s) => (
              <div key={s.id} className="flex items-center gap-3 rounded-xl border border-border bg-card/40 p-2.5">
                <img src={s.image} alt={s.username} className="w-10 h-10 rounded-lg object-cover shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium truncate">@{s.username}</p>
                  <p className="text-[11px] text-muted-foreground">
                    {s.reviewed_at ? fmt(s.reviewed_at) : ""}
                  </p>
                </div>
                <span
                  className={`text-[11px] px-2 py-0.5 rounded-full border ${
                    s.status === "approved"
                      ? "bg-green-500/15 text-green-400 border-green-500/20"
                      : "bg-red-500/15 text-red-400 border-red-500/20"
                  }`}
                >
                  {s.status}
                </span>
                {s.status === "approved" && (
                  <button
                    disabled={busy === s.id}
                    onClick={() => act(s.id, () => reviewFace(s.id, "rejected"), "Unfeatured")}
                    className="text-[11px] px-2 py-1 rounded-lg bg-secondary hover:bg-secondary/70 disabled:opacity-50 transition"
                    title="Remove from the site"
                  >
                    Unfeature
                  </button>
                )}
                <button
                  disabled={busy === s.id}
                  onClick={() => act(s.id, () => deleteFace(s.id), "Deleted")}
                  className="p-1.5 rounded-lg text-muted-foreground hover:text-red-400 hover:bg-red-500/10 disabled:opacity-50 transition"
                  title="Delete permanently"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
