import Razorpay from "razorpay";
import { getVerifiedUserId } from "../_auth.js";
import { getPaymentTestOverride } from "./purchase.js";

const razorpay = new Razorpay({
  key_id:     process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

// INR pricing (paise): premium ₹999/mo · annual ₹7399/yr
const AMOUNTS = { premium: 99900, annual: 739900 };

const ORIGIN = process.env.VITE_SITE_URL || "https://clarity-mode-app-v2-gq26.vercel.app";

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", ORIGIN);
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "POST") return res.status(405).end();

  const userId = await getVerifiedUserId(req);
  if (!userId) return res.status(401).json({ error: "Unauthorized" });

  const { plan } = req.body;
  if (!AMOUNTS[plan]) return res.status(400).json({ error: "Invalid plan" });

  // Admin-controlled ₹1 test mode (site_settings.payment_test_mode) —
  // recorded in the order notes so verify.js accepts the test amount.
  const testAmount = await getPaymentTestOverride().catch(() => null);

  try {
    const order = await razorpay.orders.create({
      amount:   testAmount ?? AMOUNTS[plan],
      currency: "INR",
      notes:    { userId, plan, testMode: testAmount != null ? "true" : "" },
    });

    return res.json({
      orderId:  order.id,
      amount:   order.amount,
      currency: order.currency,
    });
  } catch (err) {
    // Razorpay SDK errors carry the real reason in err.error (e.g. auth
    // failure from missing/invalid keys) — log it fully so Vercel's function
    // logs show the actual cause instead of just "Order creation failed".
    console.error("[Razorpay order] failed:", err?.error ?? err?.message ?? err);
    if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
      console.error("[Razorpay order] RAZORPAY_KEY_ID/RAZORPAY_KEY_SECRET is missing from this environment.");
    }
    return res.status(500).json({ error: "Order creation failed" });
  }
}
