ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS is_demo boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS demo_expires_at timestamptz;

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
    'approved'::public.approval_status,
    now(),
    case when is_admin then false else true end,
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