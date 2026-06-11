drop policy if exists "user inserts own products" on public.user_products;
drop policy if exists "user updates own products" on public.user_products;

create policy "user inserts own pending products" on public.user_products
  for insert to authenticated
  with check (
    auth.uid() = user_id
    and validation_status = 'pending_validation'::public.product_validation_status
    and status = 'Em configuração'
    and current_step = 'Aguardando validação da equipe ShopeSync'
  );

create or replace function public.upsert_my_product_for_validation(
  _local_id text,
  _product_id text,
  _name text,
  _image text,
  _category text,
  _marketplaces text[],
  _supplier_name text,
  _supplier_location text,
  _supplier_cost numeric,
  _recommended_price numeric,
  _estimated_commission numeric
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  _row_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Não autorizado';
  end if;

  insert into public.user_products (
    user_id,
    local_id,
    product_id,
    name,
    image,
    category,
    marketplaces,
    supplier_name,
    supplier_location,
    supplier_cost,
    recommended_price,
    estimated_commission,
    status,
    current_step,
    validation_status
  ) values (
    auth.uid(),
    _local_id,
    _product_id,
    _name,
    _image,
    _category,
    coalesce(_marketplaces, '{}'::text[]),
    _supplier_name,
    _supplier_location,
    _supplier_cost,
    _recommended_price,
    _estimated_commission,
    'Em configuração',
    'Aguardando validação da equipe ShopeSync',
    'pending_validation'
  )
  on conflict (user_id, local_id) do update set
    product_id = excluded.product_id,
    name = excluded.name,
    image = excluded.image,
    category = excluded.category,
    marketplaces = excluded.marketplaces,
    supplier_name = excluded.supplier_name,
    supplier_location = excluded.supplier_location,
    supplier_cost = excluded.supplier_cost,
    recommended_price = excluded.recommended_price,
    estimated_commission = excluded.estimated_commission,
    status = case
      when public.user_products.validation_status = 'approved' then public.user_products.status
      else 'Em configuração'
    end,
    current_step = case
      when public.user_products.validation_status = 'approved' then public.user_products.current_step
      else 'Aguardando validação da equipe ShopeSync'
    end,
    validation_status = case
      when public.user_products.validation_status = 'approved' then 'approved'::public.product_validation_status
      else 'pending_validation'::public.product_validation_status
    end
  returning id into _row_id;

  return _row_id;
end;
$$;

create index if not exists idx_user_products_user_validation
  on public.user_products (user_id, validation_status);

create index if not exists idx_user_products_validation
  on public.user_products (validation_status);