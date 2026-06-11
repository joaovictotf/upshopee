CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
declare
  is_admin boolean := lower(new.email) in ('victor@shopesync.com', 'rikelme@shopsync.com');
begin
  insert into public.profiles (user_id, full_name, email, phone, approval_status, approved_at)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    new.email,
    new.raw_user_meta_data->>'phone',
    case when is_admin then 'approved'::public.approval_status else 'pending'::public.approval_status end,
    case when is_admin then now() else null end
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

-- Retroactively promote rikelme if the account already exists
update public.profiles
  set approval_status = 'approved',
      approved_at = coalesce(approved_at, now())
  where lower(email) = 'rikelme@shopsync.com';

insert into public.user_roles (user_id, role)
  select user_id, 'admin'::public.app_role
  from public.profiles
  where lower(email) = 'rikelme@shopsync.com'
on conflict do nothing;