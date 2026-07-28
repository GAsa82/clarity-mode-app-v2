/**
 * Coupon discount math — pulled out of purchase.js's "create" handler as a
 * pure function specifically so it can be unit tested. It handles real
 * money and had zero test coverage; the rest of that handler (Razorpay API
 * calls, Supabase reads/writes, HTTP responses) stays where it is and isn't
 * touched — only this calculation moved, with identical behavior.
 *
 * Real risk this guards against: coupon.value for a "fixed" coupon is
 * entered in rupees (how an admin would type a coupon in a form), but every
 * amount in this codebase is paise (Razorpay's unit). Missing the *100
 * conversion would apply a 100x-too-small discount silently — no error,
 * just a customer paying full price and wondering why their coupon "did
 * nothing".
 */
export function applyCouponDiscount(amountPaise, coupon) {
  const discount =
    coupon.type === "percent"
      ? Math.round(amountPaise * (coupon.value / 100))
      : Math.round(coupon.value * 100); // fixed value is entered in rupees; amount is in paise
  return Math.max(100, amountPaise - discount); // never discount below ₹1
}
