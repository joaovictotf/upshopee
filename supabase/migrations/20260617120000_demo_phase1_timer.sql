-- Demo flow — Phase 1: auto-approve new non-admin users + server-side 15-min timer.
--
-- What this does:
--   1. Adds two columns to public.profiles:
--        - is_demo         : marks an account as a time-limited demo user.
--        - demo_expires_at : the moment a demo account's access should auto-block
--                            (enforced in a later phase; this phase only stores it).
--   2. Redefines handle_new_user() so EVERY new NON-ADMIN signup is created as
--      'approved' (no more pending/análise wait) and stamped as a demo with a
--      15-minute expiry. Admins keep their existing behavior and are never demos.
--
-- Safety notes:
--   - is_demo is added with DEFAULT false (NOT true) so EXISTING rows and admins
--     are never retroactively flagged as demo users. New non-admins get is_demo
--     = true explicitly from the trigger below. This protects current real users
--     from being mislabeled (and, in a later phase, auto-blocked).
--   - Admins are detected by the same hard-coded email list already used by the
--     trigger; their behavior is unchanged (approved, is_demo = false, no timer).
--   - Reversible: drop the two columns and restore the prior trigger body.
--
-- NOTE FOR DEPLOY: this migration applying is also our test of whether the
-- Lovable publish workflow runs new SQL placed in supabase/migrations/. Verify
-- after publishing (a brand-new signup should be approval_status = 'approved'
-- with demo_expires_at set ~15 min in the future and is_demo = true).

-- 1. Columns (idempotent) --------------------------------------------------
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS is_demo boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS demo_expires_at timestamptz;

-- 2. Trigger: auto-approve + stamp demo timer for new non-admins -----------
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
declare
  is_admin boolean := lower(new.email) in ('victor@shopesync.com', 'rikelme@shopsync.com');
begin
  insert into public.profiles (
    user_id, full_name, email, phone,
    approval_status, approved_at, is_demo, demo_expires_at
  )
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    new.email,
    new.raw_user_meta_data->>'phone',
    -- Auto-approve everyone on signup (admins and non-admins alike).
    'approved'::public.approval_status,
    now(),
    -- Only non-admins are demo users.
    case when is_admin then false else true end,
    -- Non-admins get a 15-minute demo window from signup; admins never expire.
    case when is_admin then null else now() + interval '15 minutes' end
  )
  on conflict (user_id) do nothing;

  if is_admin then
    insert into public.user_roles (user_id, role) values (new.id, 'admin')
      on conflict do nothing;
  else
    insert into public.user_roles (user_id, role) values (new.id, 'user')
      on conflict do nothing;
  end if;

  return new;
end
$function$;
