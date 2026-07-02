-- ₹1 payment test mode + Member of the Day anti-duplication.

-- 1. Global test-mode setting (admin card in Admin → Orders). While enabled,
--    every paid flow charges amountPaise instead of list price — enforced
--    server-side in the Razorpay endpoints. Seeded ON at ₹1 for the current
--    end-to-end verification run; turn OFF in the CMS before real sales.
insert into public.site_settings (key, value, description)
values (
  'payment_test_mode',
  '{"enabled": true, "amountPaise": 100}'::jsonb,
  'Global payment test mode — overrides ALL prices (TEMPORARY, disable before real sales)'
)
on conflict (key) do nothing;

-- 2. One active Member of the Day application per user: while a user has a
--    pending or approved submission, the database refuses a second one.
--    (Legacy anonymous rows have user_id null and are not constrained.)
create unique index if not exists face_submissions_one_active_per_user
  on public.face_submissions (user_id)
  where user_id is not null and status in ('pending', 'approved');
