/**
 * useFaceSubmit — THE single code path for "Become the Face of Clarity"
 * submissions (free or paid, per the admin's CMS config).
 *
 * History note: the payment flow was originally wired into the unused
 * FaceOfClarity component while the live homepage rendered
 * LibraryWidgetsRail's own copy of the old free flow — so users never saw
 * the fee. Both components now share this hook; there is no second path.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";
import {
  getFacePaymentConfig,
  submitFace,
  submitFaceForPayment,
  FACE_PAYMENT_DEFAULTS,
  type FacePaymentConfig,
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

export function useFaceSubmit() {
  const { user } = useAuth();
  const [payCfg, setPayCfg] = useState<FacePaymentConfig>(FACE_PAYMENT_DEFAULTS);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [queueStatus, setQueueStatus] = useState<string | null>(null);
  const [paidTxnId, setPaidTxnId] = useState<string | null>(null);
  // Survives cancelled/failed attempts so retries reuse the same submission.
  const submissionIdRef = useRef<string | null>(null);

  useEffect(() => {
    getFacePaymentConfig().then(setPayCfg).catch(() => {});
  }, []);

  const reset = useCallback(() => {
    setSubmitted(false);
    setSubmitError(null);
    setQueueStatus(null);
    setPaidTxnId(null);
  }, []);

  const verifyPayment = async (token: string, resp: Record<string, string>): Promise<boolean> => {
    const res = await fetch("/api/razorpay/purchase", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ action: "verify", ...resp }),
    });
    return res.ok;
  };

  const paidSubmit = async (username: string, image: string, cfg: FacePaymentConfig) => {
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

      // One active application per user; reuse unpaid drafts.
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
      if (unpaidDraft) {
        submissionIdRef.current = unpaidDraft.id;
        // Retries reuse the draft (one-application rule) — refresh it so the
        // payment attaches to the user's LATEST name/photo, not their first
        // attempt's. RLS restricts this to own, still-unpaid drafts.
        await supabase
          .from("face_submissions")
          .update({
            username: username.trim(),
            image,
            email: user.email ?? "",
            amount_paise: cfg.amountPaise,
          })
          .eq("id", unpaidDraft.id);
      }

      if (!submissionIdRef.current) {
        try {
          submissionIdRef.current = await submitFaceForPayment(
            username, image, user.id, user.email ?? "", cfg.amountPaise
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
          // Retry verification once — a captured payment must not be stranded
          // by one flaky request.
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
      // The Razorpay modal is full-screen; the handler/dismiss/failed
      // callbacks manage the final state.
      setSubmitting(false);
    }
  };

  const submit = useCallback(async (username: string, image: string | null) => {
    setSubmitError(null);
    setQueueStatus(null);

    if (!username.trim()) { setSubmitError("Please enter a username."); return; }
    if (!image) { setSubmitError("Please upload a profile picture."); return; }

    // Re-check the fee config at submit time — never rely on possibly-stale
    // mount-time state. (The database blocks free inserts while payments are
    // on regardless; this routes the user to the right flow.)
    let cfg = payCfg;
    try {
      cfg = await getFacePaymentConfig();
      setPayCfg(cfg);
    } catch { /* offline — DB enforcement still applies */ }

    if (cfg.enabled) {
      await paidSubmit(username, image, cfg);
      return;
    }

    setSubmitting(true);
    try {
      const result = await submitFace(username, image);
      setSubmitted(true);
      setQueueStatus(
        result.queued
          ? "Your submission is saved locally and will retry automatically once connectivity returns."
          : null
      );
    } catch (error) {
      // Supabase errors are plain objects (PostgrestError), not Error
      // instances — read .message structurally.
      const msg = (error as { message?: string })?.message ?? "";
      setSubmitError(
        /row-level security|violates/i.test(msg)
          ? `A ₹${(cfg.amountPaise / 100).toFixed(0)} featuring fee is now required — refresh the page, sign in, and try again.`
          : msg || "Couldn't submit right now. Please try again."
      );
    } finally {
      setSubmitting(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [payCfg, user]);

  return { user, payCfg, submitting, submitted, submitError, queueStatus, paidTxnId, submit, reset };
}
