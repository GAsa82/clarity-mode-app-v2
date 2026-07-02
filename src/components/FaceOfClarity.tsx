import { useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import { Upload, Star, Crown, Check, X, AlertTriangle, IndianRupee, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";
import {
  downscaleImage,
  submitFace,
  submitFaceForPayment,
  getApprovedFaces,
  getFacePaymentConfig,
  flushQueuedFaceSubmissions,
  getQueuedFaceSubmissionCount,
  FACE_PAYMENT_DEFAULTS,
  type FacePaymentConfig,
  type FaceSubmission,
} from "@/lib/face-submissions";

declare global {
  interface Window { Razorpay: any }
}

function loadRazorpayScript(): Promise<boolean> {
  return new Promise((resolve) => {
    if (window.Razorpay) return resolve(true);
    const s = document.createElement("script");
    s.src = "https://checkout.razorpay.com/v1/checkout.js";
    s.onload = () => resolve(true);
    s.onerror = () => resolve(false);
    document.body.appendChild(s);
  });
}

const rules = [
  "No explicit or sexual content",
  "No hateful or abusive images",
  "No spam or illegal content",
  "Keep submissions respectful",
];

export const FaceOfClarity = () => {
  const { user } = useAuth();
  const [showForm, setShowForm] = useState(false);
  const [username, setUsername] = useState("");
  const [image, setImage] = useState<string | null>(null);
  const [imageError, setImageError] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [queueStatus, setQueueStatus] = useState<string | null>(null);
  const [queuedCount, setQueuedCount] = useState(0);
  const [approved, setApproved] = useState<FaceSubmission[]>([]);
  const [showRules, setShowRules] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  // Payment (temporary testing fee — configured by admin in the CMS)
  const [payCfg, setPayCfg] = useState<FacePaymentConfig>(FACE_PAYMENT_DEFAULTS);
  const [paidTxnId, setPaidTxnId] = useState<string | null>(null);
  // Survives cancelled/failed attempts so a retry reuses the same submission
  // instead of creating duplicates.
  const submissionIdRef = useRef<string | null>(null);

  useEffect(() => {
    getApprovedFaces().then(setApproved);
    getFacePaymentConfig().then(setPayCfg).catch(() => {});

    const refreshQueue = async () => {
      await flushQueuedFaceSubmissions().catch(() => {});
      setQueuedCount(getQueuedFaceSubmissionCount());
    };

    refreshQueue();
    const handleOnline = () => {
      refreshQueue();
    };
    window.addEventListener("online", handleOnline);
    return () => window.removeEventListener("online", handleOnline);
  }, []);

  const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/") || file.size > 5 * 1024 * 1024) {
      setImageError(true);
      return;
    }

    setImageError(false);
    try {
      // Downscale to a small JPEG before storing/submitting.
      setImage(await downscaleImage(file));
    } catch {
      setImageError(true);
    }
  };

  // ─── Paid flow: submission → order → Razorpay → server verify ─────────────

  const verifyPayment = async (token: string, resp: Record<string, string>): Promise<boolean> => {
    const res = await fetch("/api/razorpay/purchase", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ action: "verify", ...resp }),
    });
    return res.ok;
  };

  const handlePaidSubmit = async () => {
    if (!user) {
      setSubmitError("Please sign in first — the payment needs to be linked to your account.");
      return;
    }
    setSubmitting(true);
    try {
      if (!(await loadRazorpayScript())) {
        setSubmitError("Payment couldn't load. Check your connection and try again.");
        return;
      }
      const token = (await supabase.auth.getSession()).data.session?.access_token;
      if (!token) {
        setSubmitError("Session expired — please sign in again.");
        return;
      }

      // One active application per user: block if they already have one under
      // review or live; reuse an unpaid draft from an earlier attempt.
      const { data: mine } = await supabase
        .from("face_submissions")
        .select("id, status, payment_status")
        .eq("user_id", user.id)
        .in("status", ["pending", "approved"]);
      const activeApp = (mine ?? []).find(
        (m) => m.status === "approved" || m.payment_status !== "pending_payment"
      );
      if (activeApp) {
        setSubmitError(
          activeApp.status === "approved"
            ? "You're already featured as a Clarity Member! One active application per member — a new one can be submitted after the current feature ends."
            : "You already have an application under review. Hang tight — you can submit a new one after it's reviewed."
        );
        return;
      }
      const unpaidDraft = (mine ?? []).find((m) => m.payment_status === "pending_payment");
      if (unpaidDraft) submissionIdRef.current = unpaidDraft.id;

      // Reuse the submission from a cancelled/failed attempt; never duplicate.
      if (!submissionIdRef.current) {
        try {
          submissionIdRef.current = await submitFaceForPayment(
            username, image!, user.id, user.email ?? "", payCfg.amountPaise
          );
        } catch (e) {
          if ((e as { code?: string })?.code === "23505") {
            setSubmitError("You already have an active application. One per member!");
            return;
          }
          throw e;
        }
      }
      const submissionId = submissionIdRef.current;

      const orderRes = await fetch("/api/razorpay/purchase", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          action: "create",
          item_type: "face_of_clarity",
          item_id: submissionId,
          item_title: `Face of Clarity — ${username.trim()}`,
        }),
      });
      const order = await orderRes.json();
      if (!orderRes.ok) {
        setSubmitError(order?.error ?? "Couldn't start the payment. Try again.");
        return;
      }

      const rzp = new window.Razorpay({
        key: import.meta.env.VITE_RAZORPAY_KEY_ID,
        amount: order.amount,
        currency: order.currency,
        order_id: order.orderId,
        name: "badly talks",
        description: `Member of the Day — @${username.trim()}`,
        prefill: { email: user.email },
        theme: { color: "#6366f1" },
        modal: {
          ondismiss: () => {
            setSubmitting(false);
            setSubmitError("Payment cancelled — your entry is saved. Tap the button to try again.");
          },
        },
        handler: async (resp: Record<string, string>) => {
          // Network hiccups on verify shouldn't strand a captured payment —
          // retry once before asking the user to contact support.
          let verified = false;
          try { verified = await verifyPayment(token, resp); } catch { /* retry below */ }
          if (!verified) {
            await new Promise((r) => setTimeout(r, 2000));
            try { verified = await verifyPayment(token, resp); } catch { /* handled below */ }
          }
          setSubmitting(false);
          if (verified) {
            setPaidTxnId(resp.razorpay_payment_id);
            setSubmitted(true);
            setShowForm(false);
            setQueueStatus(null);
            submissionIdRef.current = null;
          } else {
            setSubmitError(
              `Payment received (ID ${resp.razorpay_payment_id}) but confirmation is pending. ` +
              "It will be reconciled — or contact support with this ID."
            );
          }
        },
      });
      rzp.on("payment.failed", (resp: any) => {
        setSubmitting(false);
        setSubmitError(
          `Payment failed: ${resp?.error?.description ?? "the bank declined the transaction"}. You can try again.`
        );
      });
      rzp.open();
    } catch (error) {
      const msg = (error as { message?: string })?.message;
      setSubmitError(msg || "Couldn't start the payment. Please try again.");
    } finally {
      // The Razorpay modal is full-screen, so releasing the button here is
      // safe; the handler/dismiss/failed callbacks manage the final state.
      setSubmitting(false);
    }
  };

  const handleSubmit = async () => {
    setSubmitError(null);
    setQueueStatus(null);

    if (!username.trim()) {
      setSubmitError("Please enter a username.");
      return;
    }
    if (!image) {
      setSubmitError("Please upload a profile picture.");
      return;
    }

    // Re-check the fee config at submit time — the mount-time fetch can lose
    // the race with a fast submit, and payment enforcement must never depend
    // on stale state. (The database blocks free inserts anyway while
    // payments are on; this just routes the user to the right flow.)
    let cfg = payCfg;
    try {
      cfg = await getFacePaymentConfig();
      setPayCfg(cfg);
    } catch { /* offline — DB enforcement still applies */ }

    // Paid flow when the admin has enabled the (temporary) fee.
    if (cfg.enabled) {
      await handlePaidSubmit();
      return;
    }

    setSubmitting(true);
    try {
      const result = await submitFace(username, image);
      setSubmitted(true);
      setShowForm(false);
      if (result.queued) {
        setQueueStatus(
          "Your submission is saved locally and will retry automatically once connectivity returns."
        );
      } else {
        setQueueStatus(null);
      }
    } catch (error) {
      // Supabase errors are plain objects (PostgrestError), NOT Error
      // instances — read .message structurally or the mapping never fires.
      const msg = (error as { message?: string })?.message ?? "";
      setSubmitError(
        /row-level security|violates/i.test(msg)
          ? "A ₹" + (payCfg.amountPaise / 100).toFixed(0) + " featuring fee is now required — refresh the page, sign in, and try again."
          : msg || "Couldn't submit right now. Please try again."
      );
    } finally {
      setSubmitting(false);
      setQueuedCount(getQueuedFaceSubmissionCount());
    }
  };

  const todayMember = approved.length > 0 ? approved[0] : null;
  const allMembers = approved;

  return (
    <section className="py-24 md:py-32 relative">
      <div className="container">
        <div className="max-w-2xl mb-12">
          <p className="text-xs uppercase tracking-[0.25em] text-primary mb-4 flex items-center gap-2">
            <Crown className="w-3.5 h-3.5" />
            Community Spotlight
          </p>
          <h2 className="font-display text-4xl md:text-5xl font-light leading-tight">
            Become the <span className="text-silver italic">Face of Clarity</span> for a day.
          </h2>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_320px] gap-6 items-start">
          {/* Left column — Upload section */}
          <div>
            {/* Upload section */}
            {!showForm ? (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: 0.1 }}
              >
                {submitted ? (
                  <div className="relative rounded-2xl bg-card-elevated border border-border p-8 text-center">
                    <Check className="w-10 h-10 text-primary mx-auto mb-4" />
                    <p className="font-display text-xl font-light text-gradient mb-2">
                      {paidTxnId ? "Payment confirmed — you're in the queue!" : "Submission received!"}
                    </p>
                    {paidTxnId && (
                      <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-400/10 border border-emerald-400/20 mb-3">
                        <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                        <span className="text-[11px] text-emerald-400">
                          ₹{(payCfg.amountPaise / 100).toFixed(0)} paid · Txn {paidTxnId}
                        </span>
                      </div>
                    )}
                    <p className="text-sm text-muted-foreground">
                      {queueStatus ?? "Your profile is under review. Selected members appear here for 24 hours."}
                    </p>
                    {queuedCount > 0 && !queueStatus ? (
                      <p className="text-xs text-muted-foreground/70 mt-2">
                        {queuedCount} pending submission(s) remain in the offline retry queue.
                      </p>
                    ) : null}
                  </div>
                ) : (
                  <div className="relative rounded-2xl bg-card-elevated border border-border p-8 md:p-10">
                    <p className="font-display text-2xl font-light mb-3">
                      Upload your profile picture & username
                    </p>
                    <p className="text-sm text-muted-foreground leading-relaxed mb-4">
                      Selected users become <span className="text-primary font-medium">"Clarity Member Of The Day"</span> — featured on our homepage for 24 hours.
                    </p>

                    <div className="flex flex-wrap gap-3 mb-6">
                      <Button variant="hero" onClick={() => setShowForm(true)}>
                        <Upload className="w-4 h-4 mr-2" />
                        Upload now
                      </Button>
                      <Button
                        variant="glass"
                        size="sm"
                        onClick={() => setShowRules(!showRules)}
                      >
                        <AlertTriangle className="w-3.5 h-3.5 mr-1.5" />
                        Community rules
                      </Button>
                    </div>

                    {showRules && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        className="overflow-hidden"
                      >
                        <div className="rounded-xl border border-border bg-background/50 p-4 mb-4">
                          <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground mb-3">
                            Community Upload Rules
                          </p>
                          <ul className="space-y-2">
                            {rules.map((rule, i) => (
                              <li key={i} className="flex items-start gap-2 text-xs text-muted-foreground">
                                <span className="text-primary mt-0.5">•</span>
                                {rule}
                              </li>
                            ))}
                          </ul>
                          <p className="mt-3 text-[10px] text-muted-foreground/60">
                            Uploads violating rules will be removed and accounts may be restricted. <span className="text-primary">Admin Approval Required.</span>
                          </p>
                        </div>
                      </motion.div>
                    )}

                    <p className="text-xs text-muted-foreground/60 italic">
                      Join the movement against digital burnout.
                    </p>
                  </div>
                )}
              </motion.div>
            ) : (
              /* Upload form */
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="relative rounded-2xl bg-card-elevated border border-border p-8 md:p-10"
              >
                <div className="flex flex-col md:flex-row gap-8">
                  <div className="flex flex-col items-center gap-4 shrink-0">
                    <div
                      className="w-28 h-28 rounded-full bg-secondary border-2 border-dashed border-border hover:border-primary/50 transition-colors overflow-hidden cursor-pointer flex items-center justify-center"
                      onClick={() => fileRef.current?.click()}
                    >
                      {image ? (
                        <img src={image} alt="Preview" className="w-full h-full object-cover" />
                      ) : (
                        <Upload className="w-8 h-8 text-muted-foreground/50" />
                      )}
                    </div>
                    <input
                      ref={fileRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleImageSelect}
                    />
                    <Button variant="glass" size="sm" onClick={() => fileRef.current?.click()}>
                      {image ? "Change photo" : "Choose photo"}
                    </Button>
                    <p className="text-[10px] text-muted-foreground/60 text-center">Max 5MB</p>
                    {imageError && (
                      <p className="text-[10px] text-destructive">Invalid file. Use an image under 5MB.</p>
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground mb-2">
                      Your username
                    </p>
                    <input
                      type="text"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      placeholder="e.g. clarity_seeker"
                      maxLength={30}
                      className="w-full px-5 py-3.5 rounded-full bg-background/60 border border-border focus:border-primary outline-none text-sm transition-colors mb-4"
                    />

                    <div className="rounded-xl border border-border bg-background/40 p-4 mb-6">
                      <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground mb-2">
                        Rules
                      </p>
                      <ul className="space-y-1">
                        {rules.map((rule, i) => (
                          <li key={i} className="text-[11px] text-muted-foreground flex items-start gap-2">
                            <span className="text-primary">•</span>
                            {rule}
                          </li>
                        ))}
                      </ul>
                      <p className="mt-2 text-[10px] text-muted-foreground/60">
                        <span className="text-primary">Admin Approval Required.</span> Violations will be removed.
                      </p>
                    </div>

                    {payCfg.enabled && (
                      <div className="rounded-xl border border-primary/20 bg-primary/5 p-3 mb-4">
                        <p className="text-[11px] text-foreground/90 flex items-center gap-1.5">
                          <IndianRupee className="w-3 h-3 text-primary" />
                          Featuring fee: <span className="font-medium text-primary">₹{(payCfg.amountPaise / 100).toFixed(0)}</span>
                          {payCfg.testingMode && (
                            <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-amber-400/15 text-amber-400 border border-amber-400/20">
                              temporary testing fee
                            </span>
                          )}
                        </p>
                        {!user && (
                          <p className="text-[10px] text-muted-foreground mt-1.5">
                            Sign in first so the payment links to your account.
                          </p>
                        )}
                      </div>
                    )}

                    {submitError && (
                      <p className="text-xs text-destructive mb-4">{submitError}</p>
                    )}

                    <div className="flex gap-3">
                      <Button variant="glass" onClick={() => setShowForm(false)}>
                        <X className="w-3.5 h-3.5 mr-1.5" />
                        Cancel
                      </Button>
                      <Button variant="hero" onClick={handleSubmit} disabled={submitting}>
                        <Check className="w-3.5 h-3.5 mr-1.5" />
                        {submitting
                          ? "Processing…"
                          : payCfg.enabled
                            ? `Pay ₹${(payCfg.amountPaise / 100).toFixed(0)} & submit`
                            : "Submit for review"}
                      </Button>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </div>

          {/* Right sidebar — Clarity Member of the Day */}
          <div className="flex flex-col gap-4 lg:sticky lg:top-28">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="relative rounded-2xl bg-card-elevated border border-border overflow-hidden"
            >
              <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,hsl(215_90%_30%/0.15),transparent_60%)] pointer-events-none" />
              <div className="relative p-6 text-center">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full glass mb-5">
                  <Star className="w-2.5 h-2.5 text-primary fill-primary" />
                  <span className="text-[9px] uppercase tracking-[0.2em] text-primary font-medium">
                    Member of the Day
                  </span>
                </div>

                {todayMember ? (
                  <div className="flex flex-col items-center">
                    <div className="w-16 h-16 rounded-full overflow-hidden ring-2 ring-primary/40 ring-offset-2 ring-offset-background mb-3">
                      <img
                        src={todayMember.image}
                        alt={todayMember.username}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <p className="font-display text-lg font-light text-gradient">
                      @{todayMember.username}
                    </p>
                    <p className="text-[10px] text-muted-foreground mt-1">
                      Featured today
                    </p>
                  </div>
                ) : (
                  <div className="flex flex-col items-center">
                    <div className="w-16 h-16 rounded-full bg-secondary flex items-center justify-center mb-3">
                      <Crown className="w-6 h-6 text-muted-foreground/50" />
                    </div>
                    <p className="font-display text-base font-light text-muted-foreground">
                      No member featured yet
                    </p>
                    <p className="text-[10px] text-muted-foreground mt-1">
                      Be the first to upload.
                    </p>
                  </div>
                )}
              </div>
            </motion.div>

            {/* Clarity Members list */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="relative rounded-2xl bg-card-elevated border border-border p-4 overflow-hidden"
            >
              <div className="relative">
                <div className="flex items-center gap-2 mb-3">
                  <Crown className="w-3.5 h-3.5 text-primary" />
                  <p className="text-[10px] uppercase tracking-[0.2em] text-primary font-medium">
                    Clarity Members
                  </p>
                </div>
                <div className="space-y-3">
                  {allMembers.length === 0 ? (
                    <p className="text-[11px] text-muted-foreground/70 py-2">
                      No members featured yet. Approved members appear here.
                    </p>
                  ) : (
                    allMembers.slice(0, 5).map((m) => (
                      <div key={m.id} className="flex items-center gap-3 rounded-xl px-2 py-1.5 hover:bg-primary/10 transition-colors group">
                        <div className="w-8 h-8 rounded-full overflow-hidden bg-primary/10 shrink-0">
                          <img src={m.image} alt={m.username} className="w-full h-full object-cover" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-medium text-foreground truncate group-hover:text-primary transition-colors">
                            @{m.username}
                          </p>
                          <p className="text-[10px] text-muted-foreground truncate">
                            Clarity Member
                          </p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </section>
  );
};