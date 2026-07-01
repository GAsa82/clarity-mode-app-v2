import Razorpay from "razorpay";
import crypto from "crypto";
import { getVerifiedUserId } from "../_auth.js";
import { createClient } from "@supabase/supabase-js";

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const ORIGIN = process.env.VITE_SITE_URL || "https://clarity-mode-app-v2-gq26.vercel.app";

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", ORIGIN);
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "POST") return res.status(405).end();

  const userId = await getVerifiedUserId(req);
  if (!userId) return res.status(401).json({ error: "Unauthorized" });

  const { action } = req.body;

  // ── CREATE ORDER ──────────────────────────────────────────
  if (action === "create") {
    const { item_type, item_id, item_title, amount, couponCode } = req.body;
    if (!item_type || !item_id || !amount || amount <= 0)
      return res.status(400).json({ error: "item_type, item_id, and amount are required" });

    let finalAmount = Math.round(Number(amount));
    let appliedCoupon = null;

    if (couponCode && couponCode.trim()) {
      const code = couponCode.trim().toUpperCase();
      const { data: coupon } = await supabase
        .from("coupons")
        .select("*")
        .eq("code", code)
        .eq("active", true)
        .maybeSingle();

      if (!coupon) {
        return res.status(400).json({ error: "Invalid or inactive coupon code" });
      }
      if (coupon.expires_at && new Date(coupon.expires_at) < new Date()) {
        return res.status(400).json({ error: "This coupon has expired" });
      }
      if (coupon.max_uses != null && coupon.used_count >= coupon.max_uses) {
        return res.status(400).json({ error: "This coupon has reached its usage limit" });
      }

      const discount =
        coupon.type === "percent"
          ? Math.round(finalAmount * (coupon.value / 100))
          : Math.round(coupon.value * 100); // fixed value is entered in rupees; amount is in paise
      finalAmount = Math.max(100, finalAmount - discount); // never discount below ₹1
      appliedCoupon = code;
    }

    try {
      const order = await razorpay.orders.create({
        amount: finalAmount,
        currency: "INR",
        notes: { userId, item_type, item_id, item_title: item_title ?? "", coupon: appliedCoupon ?? "" },
      });

      await supabase.from("orders").insert({
        user_id: userId,
        item_type,
        item_id,
        item_title: item_title ?? null,
        amount: finalAmount,
        currency: "INR",
        razorpay_order_id: order.id,
        coupon_code: appliedCoupon,
        status: "pending",
      });

      return res.json({ orderId: order.id, amount: order.amount, currency: order.currency });
    } catch (err) {
      console.error("[Razorpay purchase create] failed:", err?.error ?? err?.message ?? err);
      if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
        console.error("[Razorpay purchase create] RAZORPAY_KEY_ID/RAZORPAY_KEY_SECRET is missing from this environment.");
      }
      return res.status(500).json({ error: "Failed to create order" });
    }
  }

  // ── VERIFY PAYMENT ────────────────────────────────────────
  if (action === "verify") {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;
    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature)
      return res.status(400).json({ error: "Missing payment fields" });

    const expected = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest("hex");

    if (expected !== razorpay_signature)
      return res.status(400).json({ error: "Invalid signature" });

    const { data: updatedOrder, error } = await supabase
      .from("orders")
      .update({ razorpay_payment_id, razorpay_signature, status: "completed" })
      .eq("razorpay_order_id", razorpay_order_id)
      .eq("user_id", userId)
      .select("coupon_code")
      .maybeSingle();

    if (error) {
      console.error("[Razorpay purchase verify]", error);
      return res.status(500).json({ error: "Failed to record payment" });
    }

    if (updatedOrder?.coupon_code) {
      const { data: coupon } = await supabase
        .from("coupons")
        .select("used_count")
        .eq("code", updatedOrder.coupon_code)
        .maybeSingle();
      if (coupon) {
        await supabase
          .from("coupons")
          .update({ used_count: coupon.used_count + 1 })
          .eq("code", updatedOrder.coupon_code);
      }
    }

    return res.json({ success: true });
  }

  return res.status(400).json({ error: "Invalid action. Use 'create' or 'verify'." });
}
