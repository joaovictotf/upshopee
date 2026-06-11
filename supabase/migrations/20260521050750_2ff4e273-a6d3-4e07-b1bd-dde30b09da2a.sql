
create type public.product_validation_status as enum ('pending_validation', 'approved', 'rejected');

create table public.user_products (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  local_id text not null,
  product_id text,
  name text not null,
  image text,
  category text,
  marketplaces text[] not null default '{}',
  supplier_name text,
  supplier_location text,
  supplier_cost numeric,
  recommended_price numeric,
  estimated_commission numeric,
  status text not null default 'Em configuração',
  current_step text not null default 'Aguardando validação da equipe ShopeSync',
  validation_status public.product_validation_status not null default 'pending_validation',
  created_at timestamptz not null default now(),
  validated_at timestamptz,
  validated_by uuid,
  unique (user_id, local_id)
);

alter table public.user_products enable row level security;

create policy "user reads own products" on public.user_products
  for select to authenticated using (auth.uid() = user_id);
create policy "user inserts own products" on public.user_products
  for insert to authenticated with check (auth.uid() = user_id);
create policy "user updates own products" on public.user_products
  for update to authenticated using (auth.uid() = user_id);
create policy "admin reads all products" on public.user_products
  for select to authenticated using (public.has_role(auth.uid(), 'admin'));
create policy "admin updates products" on public.user_products
  for update to authenticated using (public.has_role(auth.uid(), 'admin'));

create or replace function public.validate_user_product(_product_id uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.has_role(auth.uid(), 'admin') then raise exception 'Não autorizado'; end if;
  update public.user_products
    set validation_status = 'approved',
        status = 'Pronto para venda',
        current_step = 'Produto disponível na loja',
        validated_at = now(),
        validated_by = auth.uid()
    where id = _product_id;
end$$;

create or replace function public.validate_all_pending_products()
returns integer language plpgsql security definer set search_path = public as $$
declare n integer;
begin
  if not public.has_role(auth.uid(), 'admin') then raise exception 'Não autorizado'; end if;
  with upd as (
    update public.user_products
      set validation_status = 'approved',
          status = 'Pronto para venda',
          current_step = 'Produto disponível na loja',
          validated_at = now(),
          validated_by = auth.uid()
      where validation_status = 'pending_validation'
      returning 1
  )
  select count(*)::int into n from upd;
  return coalesce(n, 0);
end$$;

create or replace function public.validate_user_pending_products(_user_id uuid)
returns integer language plpgsql security definer set search_path = public as $$
declare n integer;
begin
  if not public.has_role(auth.uid(), 'admin') then raise exception 'Não autorizado'; end if;
  with upd as (
    update public.user_products
      set validation_status = 'approved',
          status = 'Pronto para venda',
          current_step = 'Produto disponível na loja',
          validated_at = now(),
          validated_by = auth.uid()
      where validation_status = 'pending_validation' and user_id = _user_id
      returning 1
  )
  select count(*)::int into n from upd;
  return coalesce(n, 0);
end$$;

create or replace function public.validate_all_pending_connections()
returns integer language plpgsql security definer set search_path = public as $$
declare n integer;
begin
  if not public.has_role(auth.uid(), 'admin') then raise exception 'Não autorizado'; end if;
  with upd as (
    update public.user_marketplace_connections
      set status = 'approved',
          validated_at = now(),
          validated_by = auth.uid(),
          rejected_at = null,
          rejection_reason = null
      where status = 'pending_validation'
      returning 1
  )
  select count(*)::int into n from upd;
  return coalesce(n, 0);
end$$;

create or replace function public.validate_user_pending_connections(_user_id uuid)
returns integer language plpgsql security definer set search_path = public as $$
declare n integer;
begin
  if not public.has_role(auth.uid(), 'admin') then raise exception 'Não autorizado'; end if;
  with upd as (
    update public.user_marketplace_connections
      set status = 'approved',
          validated_at = now(),
          validated_by = auth.uid(),
          rejected_at = null,
          rejection_reason = null
      where status = 'pending_validation' and user_id = _user_id
      returning 1
  )
  select count(*)::int into n from upd;
  return coalesce(n, 0);
end$$;

alter publication supabase_realtime add table public.user_products;
