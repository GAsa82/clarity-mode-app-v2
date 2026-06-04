import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "POST") return res.status(405).end();

  const { userId } = req.body;
  if (!userId) return res.status(400).json({ error: "userId required" });

  const { data: sub } = await supabase
    .from("subscriptions")
    .select("provider_customer_id")
    .eq("user_id", userId)
    .single();

  if (!sub?.provider_customer_id)
    return res.status(404).json({ error: "No Stripe subscription found" });

  const siteUrl = process.env.VITE_SITE_URL || "https://clarity-mode-app-v2-gq26.vercel.app";

  const session = await stripe.billingPortal.sessions.create({
    customer:   sub.provider_customer_id,
    return_url: `${siteUrl}/account`,
  });

  return res.json({ url: session.url });
}
