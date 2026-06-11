
-- Marketplace connection validation
create type public.connection_status as enum ('pending_validation', 'approved', 'rejected');

create table public.user_marketplace_connections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  marketplace text not null check (marketplace in ('shopee','mercadolivre','shein')),
  status public.connection_status not null default 'pending_validation',
  requested_at timestamptz not null default now(),
  validated_at timestamptz,
  validated_by uuid,
  rejected_at timestamptz,
  rejection_reason text,
  unique (user_id, marketplace)
);

alter table public.user_marketplace_connections enable row level security;

create policy "user reads own connections"
  on public.user_marketplace_connections for select
  to authenticated
  using (auth.uid() = user_id);

create policy "user inserts own connection"
  on public.user_marketplace_connections for insert
  to authenticated
  with check (auth.uid() = user_id and status = 'pending_validation');

create policy "user updates own pending connection"
  on public.user_marketplace_connections for update
  to authenticated
  using (auth.uid() = user_id and status = 'pending_validation');

create policy "admin reads all connections"
  on public.user_marketplace_connections for select
  to authenticated
  using (public.has_role(auth.uid(), 'admin'));

create policy "admin updates connections"
  on public.user_marketplace_connections for update
  to authenticated
  using (public.has_role(auth.uid(), 'admin'));

create index idx_umc_user on public.user_marketplace_connections(user_id);

-- Admin RPCs
create or replace function public.validate_marketplace_connection(_user_id uuid, _marketplace text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.has_role(auth.uid(), 'admin') then
    raise exception 'Não autorizado';
  end if;
  update public.user_marketplace_connections
    set status = 'approved',
        validated_at = now(),
        validated_by = auth.uid(),
        rejected_at = null,
        rejection_reason = null
    where user_id = _user_id and marketplace = _marketplace;
end$$;

create or replace function public.reject_marketplace_connection(_user_id uuid, _marketplace text, _reason text default null)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.has_role(auth.uid(), 'admin') then
    raise exception 'Não autorizado';
  end if;
  update public.user_marketplace_connections
    set status = 'rejected',
        rejected_at = now(),
        validated_at = null,
        validated_by = null,
        rejection_reason = _reason
    where user_id = _user_id and marketplace = _marketplace;
end$$;

-- Realtime
alter publication supabase_realtime add table public.user_marketplace_connections;
