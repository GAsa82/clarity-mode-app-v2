import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";
import { getVerifiedUserId } from "../_auth.js";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
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

  const { data: sub } = await supabase
    .from("subscriptions")
    .select("provider_customer_id")
    .eq("user_id", userId)
    .single();

  if (!sub?.provider_customer_id)
    return res.status(404).json({ error: "No Stripe subscription found" });

  try {
    const session = await stripe.billingPortal.sessions.create({
      customer:   sub.provider_customer_id,
      return_url: `${ORIGIN}/account`,
    });

    return res.json({ url: session.url });
  } catch (err) {
    console.error("[Stripe portal]", err);
    return res.status(500).json({ error: "Portal failed" });
  }
}
