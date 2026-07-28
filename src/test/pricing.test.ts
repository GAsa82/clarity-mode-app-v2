import { describe, it, expect } from "vitest";
// @ts-expect-error — plain JS file, no type declarations, imported directly
// so this test covers the exact code the live payment endpoint runs.
import { applyCouponDiscount } from "../../api/razorpay/_pricing.js";

describe("applyCouponDiscount (real money — api/razorpay/purchase.js)", () => {
  it("applies a percent discount", () => {
    // ₹999 (99900 paise), 20% off -> ₹799.20 -> rounds to 79920 paise
    expect(applyCouponDiscount(99900, { type: "percent", value: 20 })).toBe(79920);
  });

  it("applies a fixed-rupee discount, converting rupees to paise", () => {
    // This is the real bug risk this file's comment calls out: coupon.value
    // for a fixed coupon is entered in RUPEES, everything else is PAISE.
    // A missing *100 here would silently apply a discount 100x too small.
    expect(applyCouponDiscount(99900, { type: "fixed", value: 100 })).toBe(89900);
  });

  it("never discounts below the ₹1 (100 paise) Razorpay minimum", () => {
    expect(applyCouponDiscount(99900, { type: "fixed", value: 10000 })).toBe(100);
    expect(applyCouponDiscount(150, { type: "percent", value: 100 })).toBe(100);
  });

  it("rounds a percent discount to the nearest paise rather than leaving fractional paise", () => {
    // 33% of 100 paise = 33 paise exactly, but a value chosen to force a
    // fractional intermediate result should still come out as an integer.
    const result = applyCouponDiscount(10001, { type: "percent", value: 33 });
    expect(Number.isInteger(result)).toBe(true);
  });

  it("a 0% coupon changes nothing", () => {
    expect(applyCouponDiscount(50000, { type: "percent", value: 0 })).toBe(50000);
  });

  it("a fixed discount larger than the amount clamps to the minimum, not a negative amount", () => {
    expect(applyCouponDiscount(500, { type: "fixed", value: 50 })).toBe(100);
  });
});
