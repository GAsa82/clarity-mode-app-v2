import Razorpay from "razorpay";

const razorpay = new Razorpay({
  key_id:     process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

// INR pricing (paise): premium ₹999/mo · annual ₹7399/yr
const AMOUNTS = { premium: 99900, annual: 739900 };

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "POST") return res.status(405).end();

  const { plan, userId } = req.body;
  if (!AMOUNTS[plan]) return res.status(400).json({ error: "Invalid plan" });
  if (!userId)        return res.status(400).json({ error: "userId required" });

  try {
    const order = await razorpay.orders.create({
      amount:   AMOUNTS[plan],
      currency: "INR",
      notes:    { userId, plan },
    });

    return res.json({
      orderId:  order.id,
      amount:   order.amount,
      currency: order.currency,
      keyId:    process.env.RAZORPAY_KEY_ID,
    });
  } catch (err) {
    console.error("[Razorpay order]", err);
    return res.status(500).json({ error: err.message });
  }
}
