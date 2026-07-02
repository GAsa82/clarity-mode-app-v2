import Razorpay from "razorpay";

const razorpay = new Razorpay({
  key_id:     process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

const ORIGIN = process.env.VITE_SITE_URL || "https://clarity-mode-app-v2-gq26.vercel.app";

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", ORIGIN);
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "POST") return res.status(405).end();

  const { clientName, clientEmail, sessionDate, sessionTime } = req.body || {};
  if (!clientName || !clientEmail || !sessionDate || !sessionTime)
    return res.status(400).json({ error: "Missing required booking fields" });

  try {
    const order = await razorpay.orders.create({
      amount:   300000, // ₹3,000 in paise
      currency: "INR",
      notes:    { clientName, clientEmail, sessionDate, sessionTime, service: "coaching" },
    });
    return res.json({ orderId: order.id, amount: order.amount, currency: order.currency });
  } catch (err) {
    console.error("[Coaching checkout]", err);
    return res.status(500).json({ error: "Failed to create payment order" });
  }
}
