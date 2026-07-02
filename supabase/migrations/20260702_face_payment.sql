-- Member of the Day — payment verification test (temporary ₹2 fee).
-- Links face_submissions to the orders/payments pipeline so a real payment
-- can be traced end-to-end: order → gateway → verify → submission → queue.

alter table public.face_submissions
  add column if not exists user_id uuid references auth.users(id) on delete set null,
  add column if not exists email text,
  add column if not exists payment_status text not null default 'free'
    check (payment_status in ('free','pending_payment','paid','refunded')),
  add column if not exists order_id uuid,
  add column if not exists amount_paise integer not null default 0;

create index if not exists face_submissions_payment_idx
  on public.face_submissions (payment_status, created_at desc);

-- Temporary testing fee: ₹2, admin-configurable from the CMS, off-switchable.
insert into public.site_settings (key, value, description)
values (
  'face_payment_config',
  '{"enabled": true, "amountPaise": 200, "testingMode": true}'::jsonb,
  'Member of the Day payment config (TEMPORARY ₹2 testing fee — disable after verification)'
)
on conflict (key) do nothing;

-- Paid flow RLS: users read back their own submission id after insert,
-- and may only attach their own user_id.
drop policy if exists "users read own face submissions" on public.face_submissions;
create policy "users read own face submissions"
  on public.face_submissions for select
  to authenticated
  using (user_id = auth.uid());

drop policy if exists "anyone submits pending face" on public.face_submissions;
create policy "anyone submits pending face"
  on public.face_submissions for insert
  to anon, authenticated
  with check (
    status = 'pending'
    and (user_id is null or user_id = auth.uid())
  );
