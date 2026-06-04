// Supabase Edge Function: razorpay-verify
// Deploy: supabase functions deploy razorpay-verify

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { crypto } from "https://deno.land/std@0.168.0/crypto/mod.ts";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

const CORS = {
  "Access-Control-Allow-Origin":  "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

const AMOUNTS: Record<string, number> = { premium: 99900, annual: 739900 };

async function hmacSha256(secret: string, message: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(message));
  return Array.from(new Uint8Array(sig)).map(b => b.toString(16).padStart(2, "0")).join("");
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: CORS });
  if (req.method !== "POST")   return new Response("Method not allowed", { status: 405 });

  let body: any;
  try { body = await req.json(); }
  catch { return new Response("Invalid JSON", { status: 400 }); }

  const { razorpay_order_id, razorpay_payment_id, razorpay_signature, userId, plan } = body;

  if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature || !userId || !plan) {
    return new Response(JSON.stringify({ error: "Missing required fields" }), {
      status: 400, headers: { ...CORS, "Content-Type": "application/json" },
    });
  }

  // Verify HMAC signature
  const expected = await hmacSha256(
    Deno.env.get("RAZORPAY_KEY_SECRET")!,
    `${razorpay_order_id}|${razorpay_payment_id}`
  );

  if (expected !== razorpay_signature) {
    return new Response(JSON.stringify({ error: "Signature verification failed" }), {
      status: 400, headers: { ...CORS, "Content-Type": "application/json" },
    });
  }

  const now      = new Date();
  const days     = plan === "annual" ? 365 : 30;
  const periodEnd = new Date(now.getTime() + days * 86400_000);

  try {
    await supabase.rpc("upsert_subscription", {
      p_user_id:                  userId,
      p_plan:                     plan,
      p_status:                   "active",
      p_provider:                 "razorpay",
      p_provider_subscription_id: razorpay_payment_id,
      p_period_start:             now.toISOString(),
      p_period_end:               periodEnd.toISOString(),
    });

    await supabase.rpc("record_payment", {
      p_user_id:             userId,
      p_amount:              AMOUNTS[plan] ?? 0,
      p_currency:            "INR",
      p_provider:            "razorpay",
      p_provider_payment_id: razorpay_payment_id,
      p_provider_order_id:   razorpay_order_id,
      p_status:              "succeeded",
      p_metadata:            { plan },
    });

    return new Response(JSON.stringify({ success: true }), {
      status: 200, headers: { ...CORS, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    console.error("[razorpay-verify] db error:", err);
    return new Response(JSON.stringify({ error: "Database error" }), {
      status: 500, headers: { ...CORS, "Content-Type": "application/json" },
    });
  }
});
