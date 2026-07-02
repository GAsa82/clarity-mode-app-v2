import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const ALL_TIMES = ["10:00 AM", "2:00 PM", "5:00 PM", "8:00 PM"];

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  if (req.method !== "GET") return res.status(405).end();

  // Generate next 21 days, skip Sundays, take first 14 valid days
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const dates = [];
  for (let i = 1; i <= 28; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    if (d.getDay() !== 0) {
      dates.push(d.toISOString().split("T")[0]);
      if (dates.length >= 14) break;
    }
  }

  const { data: booked } = await supabase
    .from("coaching_sessions")
    .select("session_date, session_time")
    .in("session_date", dates)
    .eq("payment_status", "paid");

  const taken = {};
  (booked || []).forEach(b => {
    const key = `${b.session_date}__${b.session_time}`;
    taken[key] = (taken[key] || 0) + 1;
  });

  const slots = {};
  dates.forEach(date => {
    const available = ALL_TIMES.filter(time => (taken[`${date}__${time}`] || 0) < 1);
    if (available.length > 0) slots[date] = available;
  });

  return res.json({ slots });
}
