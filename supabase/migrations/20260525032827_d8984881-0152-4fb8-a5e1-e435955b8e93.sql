
create table if not exists public.sales_orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  product_row_id uuid,
  product_local_id text,
  product_remote_id text,
  product_name text not null,
  product_image text,
  marketplace text not null,
  supplier_name text,
  supplier_location text,
  sale_price numeric not null default 0,
  supplier_cost numeric not null default 0,
  marketplace_fee numeric not null default 0,
  operational_cost numeric not null default 0,
  commission numeric not null default 0,
  customer_name text,
  customer_email_masked text,
  customer_phone_masked text,
  customer_location text,
  status text not null default 'Preparando produto',
  created_at timestamptz not null default now()
);

create index if not exists sales_orders_user_id_created_at_idx
  on public.sales_orders (user_id, created_at desc);

alter table public.sales_orders enable row level security;

drop policy if exists "user reads own sales orders" on public.sales_orders;
create policy "user reads own sales orders"
  on public.sales_orders for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "admin reads all sales orders" on public.sales_orders;
create policy "admin reads all sales orders"
  on public.sales_orders for select
  to authenticated
  using (public.has_role(auth.uid(), 'admin'));

-- No insert/update/delete policies: writes only via security definer function.

create or replace function public.admin_create_demo_sale_order(
  _user_id uuid,
  _product_row_id uuid,
  _marketplace text,
  _commission numeric,
  _customer_name text,
  _customer_email_masked text,
  _customer_phone_masked text,
  _customer_location text
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  _prod public.user_products%rowtype;
  _new_id uuid;
begin
  if not public.has_role(auth.uid(), 'admin') then
    raise exception 'Não autorizado';
  end if;
  if _commission is null or _commission <= 0 or _commission >= 30 then
    raise exception 'Valor de comissão inválido';
  end if;

  select * into _prod
    from public.user_products
    where id = _product_row_id and user_id = _user_id;

  if not found then
    raise exception 'Produto não encontrado para este usuário';
  end if;

  insert into public.sales_orders (
    user_id, product_row_id, product_local_id, product_remote_id,
    product_name, product_image, marketplace,
    supplier_name, supplier_location,
    sale_price, supplier_cost, marketplace_fee, operational_cost,
    commission, customer_name, customer_email_masked,
    customer_phone_masked, customer_location, status
  ) values (
    _user_id, _prod.id, _prod.local_id, _prod.id::text,
    _prod.name, _prod.image, _marketplace,
    _prod.supplier_name, _prod.supplier_location,
    coalesce(_prod.recommended_price, 0), coalesce(_prod.supplier_cost, 0), 0, 0,
    round(_commission::numeric, 2),
    _customer_name, _customer_email_masked,
    _customer_phone_masked, _customer_location,
    'Preparando produto'
  ) returning id into _new_id;

  return _new_id;
end
$$;

alter publication supabase_realtime add table public.sales_orders;
