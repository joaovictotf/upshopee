
-- Enums
create type public.approval_status as enum ('pending', 'approved', 'rejected');
create type public.app_role as enum ('admin', 'user');

-- Profiles
create table public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  email text not null,
  phone text,
  approval_status public.approval_status not null default 'pending',
  created_at timestamptz not null default now(),
  approved_at timestamptz,
  approved_by uuid
);
create unique index profiles_email_lower_idx on public.profiles (lower(email));

-- Roles
create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.app_role not null,
  unique (user_id, role)
);

alter table public.profiles enable row level security;
alter table public.user_roles enable row level security;

-- has_role (security definer to avoid recursion)
create or replace function public.has_role(_user_id uuid, _role public.app_role)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.user_roles where user_id = _user_id and role = _role)
$$;

-- RLS profiles
create policy "Users read own profile"
  on public.profiles for select to authenticated
  using (auth.uid() = user_id);

create policy "Admins read all profiles"
  on public.profiles for select to authenticated
  using (public.has_role(auth.uid(), 'admin'));

create policy "Admins update profiles"
  on public.profiles for update to authenticated
  using (public.has_role(auth.uid(), 'admin'));

-- RLS user_roles
create policy "Users read own roles"
  on public.user_roles for select to authenticated
  using (auth.uid() = user_id);

create policy "Admins read all roles"
  on public.user_roles for select to authenticated
  using (public.has_role(auth.uid(), 'admin'));

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  is_admin boolean := lower(new.email) = 'victor@shopesync.com';
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
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Admin approval RPCs (callable from client, RLS-checked internally)
create or replace function public.approve_user(_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.has_role(auth.uid(), 'admin') then
    raise exception 'Não autorizado';
  end if;
  update public.profiles
    set approval_status = 'approved',
        approved_at = now(),
        approved_by = auth.uid()
    where user_id = _user_id;
end
$$;

create or replace function public.reject_user(_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.has_role(auth.uid(), 'admin') then
    raise exception 'Não autorizado';
  end if;
  update public.profiles
    set approval_status = 'rejected'
    where user_id = _user_id;
end
$$;

-- Realtime
alter publication supabase_realtime add table public.profiles;
