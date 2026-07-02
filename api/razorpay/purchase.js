import Razorpay from "razorpay";
import crypto from "crypto";
import { getVerifiedUserId } from "../_auth.js";
import { serviceClient as supabase, anonClient, serviceKeyOk } from "../_supabase.js";

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

const ORIGIN = process.env.VITE_SITE_URL || "https://clarity-mode-app-v2-gq26.vercel.app";

// Digital products sold on the site (paise). Must match src/components/Store.tsx.
const PRODUCT_CATALOG = {
  "30-days-mental-clarity": 249900,
  "overthinking-reset":     199900,
  "confidence-blueprint":   289900,
  "focus-like-a-machine":   229900,
};

/**
 * Global ₹1 payment test mode (site_settings.payment_test_mode).
 * When enabled, EVERY paid flow charges the test amount so the complete
 * pipeline can be verified with real transactions at minimal cost.
 * Returns the override amount in paise, or null when test mode is off.
 */
export async function getPaymentTestOverride() {
  // Public-read setting — use the anon client so a broken service key can
  // never silently disable test mode (which would charge FULL price mid-test).
  const { data, error } = await anonClient
    .from("site_settings").select("value").eq("key", "payment_test_mode").maybeSingle();
  if (error) console.error("[payments] payment_test_mode read failed:", error.message);
  const cfg = data?.value;
  if (!cfg?.enabled) return null;
  return Math.max(100, Math.round(Number(cfg.amountPaise) || 100)); // Razorpay min ₹1
}

/** Resolve the authoritative price (paise) for an item, or null if unknown. */
async function resolveItemPrice(itemType, itemId) {
  if (itemType === "product") return PRODUCT_CATALOG[itemId] ?? null;
  // Catalog data below is public-read; the anon client keeps price resolution
  // independent of the service key (a failed read here once surfaced to
  // users as a bogus "Unknown item").
  if (itemType === "old_book") {
    const { data, error } = await anonClient
      .from("old_books").select("price").eq("id", itemId).maybeSingle();
    if (error) console.error("[payments] old_books price read failed:", error.message);
    return data?.price > 0 ? Math.round(data.price * 100) : null; // rupees → paise
  }
  if (itemType === "face_of_clarity") {
    // Member of the Day fee — admin-configurable in site_settings, so the
    // temporary ₹2 verification fee can be tuned/disabled from the CMS.
    const { data, error } = await anonClient
      .from("site_settings").select("value").eq("key", "face_payment_config").maybeSingle();
    if (error) console.error("[payments] face_payment_config read failed:", error.message);
    const cfg = data?.value;
    if (!cfg?.enabled) return null; // payments disabled → reject order creation
    const paise = Math.round(Number(cfg.amountPaise));
    return paise >= 100 ? paise : null; // Razorpay minimum ₹1
  }
  return null;
}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", ORIGIN);
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "POST") return res.status(405).end();

  // Unauthenticated config self-check (booleans only, no secrets) so a broken
  // deployment is diagnosable in seconds instead of guessing from UI errors.
  if (req.body?.action === "health") {
    const [svcOk, cfgRead] = await Promise.all([
      serviceKeyOk(),
      anonClient.from("site_settings").select("key").eq("key", "face_payment_config").maybeSingle(),
    ]);
    // Shape only — never key material. Distinguishes "env var never updated"
    // from "value present but rejected by the database".
    const raw = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
    return res.json({
      razorpayKeysPresent: Boolean(process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET),
      databaseServiceKeyOk: svcOk,
      publicConfigReadable: Boolean(cfgRead.data),
      serviceKeyShape: {
        present: raw.length > 0,
        jwtShaped: raw.split(".").length === 3,
        newStyleSecret: raw.startsWith("sb_secret_"),
        placeholderish: /your|here|xxx|changeme|placeholder/i.test(raw),
        lengthBucket: raw.length === 0 ? "empty" : raw.length < 30 ? "short" : raw.length < 80 ? "medium" : "long",
      },
    });
  }

  const userId = await getVerifiedUserId(req);
  if (!userId) return res.status(401).json({ error: "Unauthorized" });

  const { action } = req.body;

  // ── CREATE ORDER ──────────────────────────────────────────
  if (action === "create") {
    const { item_type, item_id, item_title, couponCode } = req.body;
    if (!item_type || !item_id)
      return res.status(400).json({ error: "item_type and item_id are required" });

    // SECURITY: prices are resolved server-side — never trusted from the
    // client, or anyone could buy any item for ₹1.
    const priced = await resolveItemPrice(item_type, item_id);
    if (!priced) return res.status(400).json({ error: "Unknown item" });

    // Payment writes (order record now, verification later) need the
    // privileged key. Refusing here beats taking money we can't record.
    if (!(await serviceKeyOk())) {
      return res.status(503).json({
        error: "Payments are temporarily offline for maintenance — please try again soon.",
      });
    }

    // Admin-controlled ₹1 test mode overrides every price (still server-side).
    const testAmount = await getPaymentTestOverride();

    let finalAmount = testAmount ?? priced;
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
        notes: {
          userId, item_type, item_id, item_title: item_title ?? "",
          coupon: appliedCoupon ?? "",
          testMode: testAmount != null ? "true" : "",
        },
      });

      const { error: insertError } = await supabase.from("orders").insert({
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
      if (insertError) {
        // Without this row, verification can't link the payment to anything.
        // Abort BEFORE the user pays — never take money we can't record.
        console.error("[Razorpay purchase create] order insert failed:", insertError);
        return res.status(500).json({ error: "Couldn't start the payment. Please try again." });
      }

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
      .select("id, coupon_code, item_type, item_id, amount")
      .maybeSingle();

    if (error) {
      console.error("[Razorpay purchase verify]", error);
      return res.status(500).json({ error: "Failed to record payment" });
    }
    if (!updatedOrder) {
      // Signature is valid but no matching order row exists for this user —
      // returning success here would strand a real payment with no record.
      console.error(
        `[Razorpay purchase verify] no order row matched ${razorpay_order_id} for user ${userId} — payment ${razorpay_payment_id} needs reconciliation`
      );
      return res.status(500).json({ error: "Payment received but not yet recorded — it will be reconciled." });
    }

    // Member of the Day: the payment is confirmed by the gateway signature,
    // so mark the linked submission paid server-side — it enters the review
    // queue with a verifiable order reference (never client-claimed).
    if (updatedOrder?.item_type === "face_of_clarity" && updatedOrder.item_id) {
      const { error: faceErr } = await supabase
        .from("face_submissions")
        .update({
          payment_status: "paid",
          order_id: updatedOrder.id,
          amount_paise: updatedOrder.amount,
        })
        .eq("id", updatedOrder.item_id);
      if (faceErr) console.error("[Face payment] submission link failed:", faceErr);
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
