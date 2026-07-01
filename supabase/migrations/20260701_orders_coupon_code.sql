-- ============================================================================
-- Coupons admin page existed but had zero connection to any real checkout —
-- an admin could create discount codes ("SAVE20", etc.) that no customer
-- could ever actually use. Adds traceability for coupon-code purchases.
--
-- Server-side validation (api/razorpay/purchase.js) checks active/expiry/
-- max_uses, applies the discount, and increments used_count on successful
-- payment. Verified end-to-end: lookup query, percent-discount math, and
-- used_count increment all confirmed against the real coupons table.
-- ============================================================================

alter table public.orders add column if not exists coupon_code text;
