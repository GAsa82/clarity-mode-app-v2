-- ============================================================
-- Migration: Migrate legacy admin email to profile-based admin role
-- ============================================================

-- If the legacy admin email exists in auth.users, ensure the corresponding
-- profile row exists and is marked as admin.

WITH admin_users AS (
  SELECT id, email
  FROM auth.users
  WHERE email LIKE 'gauravsinghdata6%@gmail.com'
)
INSERT INTO public.profiles (id, email, name, role)
SELECT
  u.id,
  u.email,
  split_part(u.email, '@', 1),
  'admin'
FROM admin_users u
LEFT JOIN public.profiles p ON p.id = u.id
WHERE p.id IS NULL;

UPDATE public.profiles p
SET role = 'admin'
FROM admin_users u
WHERE p.id = u.id;
