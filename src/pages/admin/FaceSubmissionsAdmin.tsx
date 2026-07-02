import { useEffect, useState, useCallback, useRef } from "react";
import {
  Check, X, Trash2, Crown, Clock, RefreshCw, IndianRupee, Save,
  ClipboardCheck, Loader2, ShieldCheck, AlertTriangle,
} from "lucide-react";
import { toast } from "sonner";
import {
  getPendingFaces,
  getReviewedFaces,
  reviewFace,
  deleteFace,
  getQueuedFaceSubmissionCount,
  getFacePaymentConfig,
  saveFacePaymentConfig,
  getFacePayments,
  runFaceVerificationReport,
  FACE_PAYMENT_DEFAULTS,
  type FaceSubmission,
  type FacePaymentConfig,
  type FacePaymentRecord,
  type FaceVerificationReport,
} from "@/lib/face-submissions";

const AUTO_REFRESH_MS = 20000;

const PAYMENT_BADGE: Record<string, string> = {
  paid: "bg-emerald-500/15 text-emerald-400 border-emerald-500/20",
  pending_payment: "bg-amber-500/15 text-amber-400 border-amber-500/20",
  free: "bg-secondary text-muted-foreground border-border",
  refunded: "bg-blue-500/15 text-blue-400 border-blue-500/20",
};

export default function FaceSubmissionsAdmin() {
  const [pending, setPending] = useState<FaceSubmission[]>([]);
  const [reviewed, setReviewed] = useState<FaceSubmission[]>([]);
  const [queuedCount, setQueuedCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const isFirstLoad = useRef(true);

  // Payment config + audit
  const [payCfg, setPayCfg] = useState<FacePaymentConfig>(FACE_PAYMENT_DEFAULTS);
  const [savingCfg, setSavingCfg] = useState(false);
  const [payments, setPayments] = useState<FacePaymentRecord[]>([]);
  const [report, setReport] = useState<FaceVerificationReport | null>(null);
  const [runningReport, setRunningReport] = useState(false);

  const load = useCallback(async () => {
    if (isFirstLoad.current) setLoading(true);
    else setRefreshing(true);
    try {
      const [p, r, q, tx] = await Promise.all([
        getPendingFaces(),
        getReviewedFaces(),
        getQueuedFaceSubmissionCount(),
        getFacePayments().catch(() => [] as FacePaymentRecord[]),
      ]);
      setPending(p);
      setReviewed(r);
      setQueuedCount(q);
      setPayments(tx);
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

  useEffect(() => {
    getFacePaymentConfig().then(setPayCfg).catch(() => {});
  }, []);

  const saveCfg = async () => {
    setSavingCfg(true);
    const { error } = await saveFacePaymentConfig(payCfg);
    setSavingCfg(false);
    if (error) toast.error(`Couldn't save: ${error.message}`);
    else toast.success(payCfg.enabled ? `Fee active: ₹${(payCfg.amountPaise / 100).toFixed(0)}` : "Payments disabled — submissions are free again");
  };

  const runReport = async () => {
    setRunningReport(true);
    try {
      setReport(await runFaceVerificationReport());
    } catch (e) {
      toast.error("Verification report failed — check the orders table is reachable.");
    } finally {
      setRunningReport(false);
    }
  };

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

      {/* ── Payment config (temporary testing fee) ── */}
      <section className="mb-8 rounded-2xl border border-border bg-card/60 p-5">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-1">
          <div className="flex items-center gap-2">
            <IndianRupee className="w-4 h-4 text-primary" />
            <h2 className="text-sm font-medium">Featuring fee</h2>
            {payCfg.testingMode && (
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-400/15 text-amber-400 border border-amber-400/20">
                TEMPORARY TESTING FEE
              </span>
            )}
          </div>
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 text-xs cursor-pointer">
              <input
                type="checkbox"
                checked={payCfg.enabled}
                onChange={(e) => setPayCfg((c) => ({ ...c, enabled: e.target.checked }))}
                className="accent-primary w-4 h-4"
              />
              {payCfg.enabled ? "Payments ON" : "Payments OFF (free submissions)"}
            </label>
            <div className="flex items-center gap-1">
              <span className="text-xs text-muted-foreground">₹</span>
              <input
                type="number"
                min={1}
                max={25000}
                value={Math.round(payCfg.amountPaise / 100)}
                onChange={(e) => {
                  const rupees = Math.max(1, Math.min(25000, Number(e.target.value) || 1));
                  setPayCfg((c) => ({ ...c, amountPaise: rupees * 100 }));
                }}
                className="w-20 px-2 py-1.5 rounded-lg bg-background border border-border text-sm focus:outline-none focus:border-primary/50"
              />
            </div>
            <label className="flex items-center gap-1.5 text-[11px] text-muted-foreground cursor-pointer">
              <input
                type="checkbox"
                checked={payCfg.testingMode}
                onChange={(e) => setPayCfg((c) => ({ ...c, testingMode: e.target.checked }))}
                className="accent-amber-400 w-3.5 h-3.5"
              />
              testing mode
            </label>
            <button
              onClick={saveCfg}
              disabled={savingCfg}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:opacity-90 disabled:opacity-50 transition"
            >
              <Save className="w-3.5 h-3.5" /> {savingCfg ? "Saving…" : "Save"}
            </button>
          </div>
        </div>
        <p className="text-[11px] text-muted-foreground">
          Price is enforced server-side. Turn payments OFF after the ₹{(payCfg.amountPaise / 100).toFixed(0)} end-to-end
          verification is complete — existing paid entries keep their transaction records.
        </p>
      </section>

      {/* ── Payments & verification ── */}
      <section className="mb-10 rounded-2xl border border-border bg-card/60 p-5">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-primary" />
            <h2 className="text-sm font-medium">Payments & end-to-end verification</h2>
            <span className="text-xs px-2 py-0.5 rounded-full bg-secondary text-muted-foreground border border-border">
              {payments.length} transaction{payments.length !== 1 ? "s" : ""}
            </span>
          </div>
          <button
            onClick={runReport}
            disabled={runningReport}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-secondary hover:bg-secondary/70 text-xs font-medium disabled:opacity-60 transition"
          >
            {runningReport ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ClipboardCheck className="w-3.5 h-3.5" />}
            Run verification report
          </button>
        </div>

        {report && (
          <div className="mb-5 rounded-xl border border-border bg-background/50 p-4">
            <p className="text-[11px] text-muted-foreground mb-3">
              Report ran {new Date(report.ranAt).toLocaleString()} · {report.completedOrders}/{report.totalOrders} orders
              completed · ₹{(report.totalRevenuePaise / 100).toLocaleString("en-IN")} verified revenue
            </p>
            <div className="space-y-2">
              {report.checks.map((c) => (
                <div key={c.label} className="flex items-start gap-2">
                  {c.pass
                    ? <Check className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    : <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />}
                  <div>
                    <p className={`text-xs font-medium ${c.pass ? "" : "text-amber-400"}`}>{c.label}</p>
                    <p className="text-[11px] text-muted-foreground">{c.detail}</p>
                  </div>
                </div>
              ))}
            </div>
            <p className="text-[10px] text-muted-foreground/70 mt-3">
              Funds settlement to the merchant account is confirmed in the Razorpay Dashboard → Settlements
              (see docs/FACE_PAYMENT_TEST.md for the full checklist).
            </p>
          </div>
        )}

        {payments.length === 0 ? (
          <p className="text-xs text-muted-foreground">No transactions yet. Complete a test payment on the homepage widget.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-left text-[10px] uppercase tracking-wider text-muted-foreground border-b border-border">
                  <th className="py-2 pr-4">User</th>
                  <th className="py-2 pr-4">Email</th>
                  <th className="py-2 pr-4">Amount</th>
                  <th className="py-2 pr-4">Transaction ID</th>
                  <th className="py-2 pr-4">Gateway ref</th>
                  <th className="py-2 pr-4">Date & time</th>
                  <th className="py-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {payments.map((p) => (
                  <tr key={p.order_id} className="border-b border-border/50">
                    <td className="py-2.5 pr-4 font-medium">@{p.username}</td>
                    <td className="py-2.5 pr-4 text-muted-foreground">{p.email ?? "—"}</td>
                    <td className="py-2.5 pr-4 tabular-nums">₹{(p.amount_paise / 100).toFixed(0)}</td>
                    <td className="py-2.5 pr-4 font-mono text-[10px]">{p.razorpay_payment_id ?? "—"}</td>
                    <td className="py-2.5 pr-4 font-mono text-[10px]">{p.razorpay_order_id ?? "—"}</td>
                    <td className="py-2.5 pr-4 whitespace-nowrap">{new Date(p.created_at).toLocaleString()}</td>
                    <td className="py-2.5">
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-medium capitalize border ${
                        p.status === "completed"
                          ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/20"
                          : "bg-amber-500/15 text-amber-400 border-amber-500/20"
                      }`}>
                        {p.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

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
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-medium truncate">@{s.username}</p>
                    <span className={`shrink-0 text-[10px] px-2 py-0.5 rounded-full border ${PAYMENT_BADGE[s.payment_status ?? "free"] ?? PAYMENT_BADGE.free}`}>
                      {s.payment_status === "paid"
                        ? `Paid ₹${((s.amount_paise ?? 0) / 100).toFixed(0)}`
                        : s.payment_status === "pending_payment"
                          ? "Awaiting payment"
                          : "Free"}
                    </span>
                  </div>
                  {s.email && <p className="text-[10px] text-muted-foreground truncate">{s.email}</p>}
                  <p className="text-[11px] text-muted-foreground mb-3">{fmt(s.created_at)}</p>
                  <div className="flex gap-2">
                    <button
                      disabled={busy === s.id || s.payment_status === "pending_payment"}
                      title={s.payment_status === "pending_payment" ? "Blocked until the featuring fee is paid" : undefined}
                      onClick={() => act(s.id, () => reviewFace(s.id, "approved"), "Approved — now live")}
                      className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:opacity-90 disabled:opacity-50 transition"
                    >
                      <Check className="w-3.5 h-3.5" />
                      {s.payment_status === "pending_payment" ? "Unpaid" : "Approve"}
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
