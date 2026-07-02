-- Member of the Day: enforce payment at the DATABASE layer.
-- Client-side checks alone let free submissions in via stale app bundles,
-- the config-loading race, or direct REST calls. With this policy, while
-- payments are enabled the ONLY insertable submission is a signed-in user's
-- own 'pending_payment' row — the server flips it to 'paid' after gateway
-- signature verification.

create or replace function public.face_payment_required()
returns boolean
language sql stable security definer set search_path = public
as $$
  select coalesce((value->>'enabled')::boolean, false)
  from public.site_settings
  where key = 'face_payment_config'
$$;

drop policy if exists "anyone submits pending face" on public.face_submissions;
create policy "anyone submits pending face"
  on public.face_submissions for insert
  to anon, authenticated
  with check (
    status = 'pending'
    and (user_id is null or user_id = auth.uid())
    and (
      -- Payments OFF → classic free flow.
      (not public.face_payment_required()
        and coalesce(payment_status, 'free') = 'free')
      or
      -- Payments ON → must be a signed-in user's own pending_payment row.
      (public.face_payment_required()
        and payment_status = 'pending_payment'
        and auth.uid() is not null
        and user_id = auth.uid())
    )
  );

-- Clients must never self-mark rows as paid; only the service role (server
-- verify step) and admins may update. Existing update policy is admin-only,
-- so no change needed — asserted here for the audit trail.
