ALTER TABLE public.sales_orders
  ADD COLUMN IF NOT EXISTS is_demo boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS source text;

CREATE OR REPLACE FUNCTION public.admin_bulk_demo_commission_shopee(_commission numeric, _note text DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
declare
  _user record;
  _prod public.user_products%rowtype;
  _success int := 0;
  _errors int := 0;
  _customer_names text[] := array['Ana Silva','Carlos Souza','Mariana Oliveira','João Pereira','Beatriz Santos','Rafael Lima','Camila Costa','Diego Almeida'];
  _customer_cities text[] := array['São Paulo, SP','Rio de Janeiro, RJ','Belo Horizonte, MG','Curitiba, PR','Porto Alegre, RS','Salvador, BA','Recife, PE','Fortaleza, CE'];
  _idx int;
begin
  if not public.has_role(auth.uid(), 'admin') then
    raise exception 'Não autorizado';
  end if;
  if _commission is null or _commission <= 0 then
    raise exception 'Valor de comissão inválido';
  end if;

  for _user in
    select distinct p.user_id
    from public.profiles p
    join public.user_marketplace_connections c on c.user_id = p.user_id
    where p.approval_status = 'approved'
      and c.marketplace = 'shopee'
      and c.status = 'approved'
  loop
    begin
      _idx := 1 + floor(random() * 8)::int;
      select * into _prod
        from public.user_products
        where user_id = _user.user_id
          and validation_status = 'approved'
        order by created_at desc
        limit 1;

      if found then
        insert into public.sales_orders (
          user_id, product_row_id, product_local_id, product_remote_id,
          product_name, product_image, marketplace,
          supplier_name, supplier_location,
          sale_price, supplier_cost, marketplace_fee, operational_cost,
          commission, customer_name, customer_email_masked,
          customer_phone_masked, customer_location, status,
          is_demo, source
        ) values (
          _user.user_id, _prod.id, _prod.local_id, _prod.id::text,
          _prod.name, _prod.image, 'shopee',
          _prod.supplier_name, _prod.supplier_location,
          coalesce(_prod.recommended_price, 0), coalesce(_prod.supplier_cost, 0), 0, 0,
          round(_commission::numeric, 2),
          _customer_names[_idx], 'a***@***',
          '(**) *****-****', _customer_cities[_idx],
          'Preparando produto', true, 'bulk_admin_demo_commission'
        );
      else
        insert into public.sales_orders (
          user_id, product_name, product_image, marketplace,
          sale_price, supplier_cost, commission,
          customer_name, customer_email_masked,
          customer_phone_masked, customer_location, status,
          is_demo, source
        ) values (
          _user.user_id, 'Produto demonstrativo ShopeSync',
          '/brands/shopee-bag.svg', 'shopee',
          0, 0, round(_commission::numeric, 2),
          _customer_names[_idx], 'a***@***',
          '(**) *****-****', _customer_cities[_idx],
          'Preparando produto', true, 'bulk_admin_demo_commission'
        );
      end if;
      _success := _success + 1;
    exception when others then
      _errors := _errors + 1;
    end;
  end loop;

  return jsonb_build_object('success', _success, 'errors', _errors);
end
$$;