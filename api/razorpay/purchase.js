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
    const { item_type, item_id, item_title, amount } = req.body;
    if (!item_type || !item_id || !amount || amount <= 0)
      return res.status(400).json({ error: "item_type, item_id, and amount are required" });

    try {
      const order = await razorpay.orders.create({
        amount: Math.round(Number(amount)),
        currency: "INR",
        notes: { userId, item_type, item_id, item_title: item_title ?? "" },
      });

      await supabase.from("orders").insert({
        user_id: userId,
        item_type,
        item_id,
        item_title: item_title ?? null,
        amount: Math.round(Number(amount)),
        currency: "INR",
        razorpay_order_id: order.id,
        status: "pending",
      });

      return res.json({ orderId: order.id, amount: order.amount, currency: order.currency });
    } catch (err) {
      console.error("[Razorpay purchase create]", err);
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

    const { error } = await supabase
      .from("orders")
      .update({ razorpay_payment_id, razorpay_signature, status: "completed" })
      .eq("razorpay_order_id", razorpay_order_id)
      .eq("user_id", userId);

    if (error) {
      console.error("[Razorpay purchase verify]", error);
      return res.status(500).json({ error: "Failed to record payment" });
    }

    return res.json({ success: true });
  }

  return res.status(400).json({ error: "Invalid action. Use 'create' or 'verify'." });
}
