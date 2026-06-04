import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";
import { getVerifiedUserId } from "../_auth.js";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const PRICES = {
  premium: process.env.STRIPE_PRICE_MONTHLY,
  annual:  process.env.STRIPE_PRICE_ANNUAL,
};

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
  if (!PRICES[plan]) return res.status(400).json({ error: "Invalid plan" });

  const { data: profile } = await supabase
    .from("profiles")
    .select("email")
    .eq("id", userId)
    .single();

  const siteUrl = ORIGIN;

  try {
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      payment_method_types: ["card"],
      line_items: [{ price: PRICES[plan], quantity: 1 }],
      success_url: `${siteUrl}/payment/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url:  `${siteUrl}/pricing`,
      customer_email: profile?.email,
      metadata: { userId, plan },
      subscription_data: { metadata: { userId, plan } },
    });

    return res.status(200).json({ url: session.url, sessionId: session.id });
  } catch (err) {
    console.error("[Stripe checkout]", err);
    return res.status(500).json({ error: "Checkout failed" });
  }
}
