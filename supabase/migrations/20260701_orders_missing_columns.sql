-- ============================================================================
-- Fix: api/razorpay/purchase.js (the real store checkout flow, used by
-- Store.tsx's "Buy Now" buttons) inserts item_id and updates
-- razorpay_signature on orders — neither column existed on the orders table
-- created earlier this session (designed only from OrdersAdmin.tsx's read
-- shape, without cross-checking the write path). Every real store purchase
-- would have failed at the database write with "column does not exist".
--
-- Verified: insert + update with both columns now succeeds end-to-end.
-- ============================================================================

alter table public.orders add column if not exists item_id text;
alter table public.orders add column if not exists razorpay_signature text;
