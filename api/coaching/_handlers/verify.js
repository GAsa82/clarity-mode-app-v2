import crypto from "crypto";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const ORIGIN    = process.env.VITE_SITE_URL || "https://clarity-mode-app-v2-gq26.vercel.app";
// Only treat the env var as a real link. The old code fell back to a hardcoded
// "your-meeting-link" placeholder, which was then stored in the DB and emailed
// to paying customers as a real (dead) join link. If no real link is configured,
// we store null and tell the customer the link will be sent before the session —
// never a fabricated URL. Self-heals the moment COACHING_MEET_LINK is set.
const MEET_LINK = process.env.COACHING_MEET_LINK || null;

const TEMPLATES = {
  day0: n => `Hi ${n}! 🎉 Your Clarity Breakthrough Session is confirmed.\n\nPrepare 3 things:\n1. Your top challenge\n2. Any context or backstory\n3. What clarity looks like for you\n\nSee you soon! — Clarity Mode`,
  day1: n => `Hi ${n}! 👋 How are you feeling after yesterday's session?\n\nTake your first small action step today — momentum matters.\n\nI'm here if you need to talk through anything. — Gaurav`,
  day3: n => `Hi ${n}! 🌱 Day 3 check-in.\n\nHow's your action plan going? What's one thing you've done differently this week?\n\nReply here anytime. — Clarity Mode`,
  day5: n => `Hi ${n}! ⚡ Accountability check!\n\nWhat's one win from this week, no matter how small?\n\nYou've come further than you think. Keep going. — Gaurav`,
  day7: n => `Hi ${n}! 🏆 This is your final 7-day support message.\n\nYou showed up, you did the work — that matters deeply.\n\nWhenever you're ready for your next breakthrough, I'm at claritymode.com/coaching\n\nThank you for trusting the process. — Gaurav, Clarity Mode`,
};

function buildSessionDatetime(sessionDate, sessionTime) {
  const [year, month, day] = sessionDate.split("-").map(Number);
  const isPM = sessionTime.includes("PM");
  const isAM = sessionTime.includes("AM");
  const timePart = sessionTime.replace(" AM", "").replace(" PM", "");
  let [hour] = timePart.split(":").map(Number);
  if (isPM && hour !== 12) hour += 12;
  if (isAM && hour === 12) hour = 0;
  // Convert IST (UTC+5:30) to UTC
  return new Date(Date.UTC(year, month - 1, day, hour - 5, 30)).toISOString();
}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", ORIGIN);
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "POST") return res.status(405).end();

  const {
    razorpay_order_id, razorpay_payment_id, razorpay_signature,
    clientName, clientEmail, clientPhone, clientChallenge,
    sessionDate, sessionTime,
  } = req.body || {};

  if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature)
    return res.status(400).json({ error: "Missing payment fields" });

  const expected = crypto
    .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
    .update(`${razorpay_order_id}|${razorpay_payment_id}`)
    .digest("hex");

  if (expected !== razorpay_signature)
    return res.status(400).json({ error: "Payment signature invalid" });

  // Check slot still available
  const { data: existing } = await supabase
    .from("coaching_sessions")
    .select("id")
    .eq("session_date", sessionDate)
    .eq("session_time", sessionTime)
    .eq("payment_status", "paid");

  if ((existing || []).length >= 1)
    return res.status(409).json({ error: "This slot was just taken. Please pick another time." });

  try {
    const { data: session, error } = await supabase
      .from("coaching_sessions")
      .insert({
        client_name:        clientName,
        client_email:       clientEmail,
        client_phone:       clientPhone  || null,
        client_challenge:   clientChallenge || null,
        session_date:       sessionDate,
        session_time:       sessionTime,
        session_datetime:   buildSessionDatetime(sessionDate, sessionTime),
        status:             "confirmed",
        payment_status:     "paid",
        amount:             300000,
        currency:           "INR",
        provider:           "razorpay",
        provider_payment_id: razorpay_payment_id,
        provider_order_id:   razorpay_order_id,
        meet_link:          MEET_LINK,
      })
      .select()
      .single();

    if (error) throw error;

    // Seed 7-day follow-up messages
    await supabase.from("coaching_followups").insert(
      [0, 1, 3, 5, 7].map(d => ({
        session_id:      session.id,
        day_number:      d,
        message_type:    "whatsapp",
        message_content: TEMPLATES[`day${d}`](clientName),
        status:          "pending",
      }))
    );

    // Confirmation email via Resend (optional — graceful if key missing)
    if (process.env.RESEND_API_KEY) {
      fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization:  `Bearer ${process.env.RESEND_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from:    "Clarity Mode <noreply@claritymode.com>",
          to:      clientEmail,
          subject: "✅ Breakthrough Session Confirmed — Clarity Mode",
          html: `<div style="font-family:sans-serif;max-width:560px;margin:auto;padding:32px;background:#0f0f1a;color:#e5e7eb;border-radius:16px">
            <h2 style="color:#a78bfa;margin:0 0 8px">Session Confirmed 🎉</h2>
            <p>Hi ${clientName},</p>
            <p>Your <strong>1-on-1 Deep Clarity Breakthrough Session</strong> is booked and paid.</p>
            <div style="background:#1a1030;border-radius:8px;padding:16px;margin:20px 0;border:1px solid #3b1f6e">
              <p style="margin:4px 0"><strong>📅 Date:</strong> ${sessionDate}</p>
              <p style="margin:4px 0"><strong>⏰ Time:</strong> ${sessionTime} IST</p>
              <p style="margin:4px 0"><strong>⏱ Duration:</strong> 120 Minutes</p>
              <p style="margin:4px 0"><strong>🎥 Join Link:</strong> ${MEET_LINK
                ? `<a href="${MEET_LINK}" style="color:#a78bfa">${MEET_LINK}</a>`
                : `You'll receive your private join link by email before the session.`}</p>
              <p style="margin:4px 0"><strong>💰 Paid:</strong> ₹3,000</p>
            </div>
            <p><strong>Prepare 3 things before your session:</strong></p>
            <ol><li>Your top challenge or decision</li><li>Relevant context or background</li><li>What clarity looks like for you</li></ol>
            <p>You'll receive WhatsApp support for 7 days after the session.</p>
            <p>See you soon,<br><strong>Gaurav — Clarity Mode</strong></p>
          </div>`,
        }),
      }).catch(e => console.error("[Email]", e));
    }

    return res.json({ success: true, sessionId: session.id, meetLink: MEET_LINK });
  } catch (err) {
    console.error("[Coaching verify]", err);
    return res.status(500).json({ error: "Failed to save booking" });
  }
}
