-- Automatic demo sales: value cap, faster cadence, and product-state repair.
--
-- ORDER INSIDE THIS FILE IS A SAFETY REQUIREMENT.
-- Every CREATE OR REPLACE comes first; the data UPDATE that makes existing
-- accounts eligible is the LAST statement. The whole file applies in one
-- transaction, so the capped function is guaranteed to be in place before a
-- single product row becomes sellable. Reversing this order would release
-- uncapped sales to every existing account at once.
--
-- 1) release_automatic_demo_sales — R$ 230,00/day cap BY VALUE (was: 4 sales),
--    60-minute spacing (was 90), commission R$ 30-60 (was R$ 12-30), and the
--    3-day post-approval wait removed so the trial demonstrates the product
--    from day one.
-- 2) upsert_my_product_for_validation — writes 'approved' / 'Pronto para venda'
--    so the database agrees with what the client has shown since commit 1200556.
-- 3) reset_today_sales — restricted to admins. It deletes today's sales_orders,
--    which is the cap's own denominator; any authenticated user calling it
--    directly earned another R$ 230,00 the same day.


-- ═══════════════════════════════════════════════════════════════════════════
-- 1. release_automatic_demo_sales — capped by value, not by count
-- ═══════════════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.release_automatic_demo_sales(_user_id uuid DEFAULT NULL)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _scope uuid;
  _status text;
  _day_start timestamptz;
  _today_total numeric;
  _remaining numeric;
  _last_auto timestamptz;
  _prod public.user_products%rowtype;
  _comm numeric;
  _customer_names text[] := array['Ana Silva','Carlos Souza','Mariana Oliveira','João Pereira','Beatriz Santos','Rafael Lima','Camila Costa','Diego Almeida'];
  _customer_cities text[] := array['São Paulo, SP','Rio de Janeiro, RJ','Belo Horizonte, MG','Curitiba, PR','Porto Alegre, RS','Salvador, BA','Recife, PE','Fortaleza, CE'];
  _idx int;
  -- Daily ceiling for the total commission visible to the user.
  _daily_cap constant numeric := 230.00;
  _comm_min  constant numeric := 30.00;
  _comm_max  constant numeric := 60.00;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Não autorizado'; END IF;

  -- Caller scope: self by default, another user only for admins.
  IF _user_id IS NULL THEN
    _scope := auth.uid();
  ELSE
    IF _user_id <> auth.uid() AND NOT public.has_role(auth.uid(),'admin') THEN
      RAISE EXCEPTION 'Não autorizado';
    END IF;
    _scope := _user_id;
  END IF;

  -- Account must be approved. The former "approved more than 3 days ago" wait
  -- is intentionally gone: the feature exists to demonstrate the product during
  -- the trial, and three empty days defeated that.
  SELECT approval_status::text INTO _status
    FROM public.profiles WHERE user_id = _scope;
  IF _status IS DISTINCT FROM 'approved' THEN RETURN 0; END IF;

  -- Serialize per user BEFORE reading the daily sum. Under READ COMMITTED two
  -- tabs would otherwise both read the pre-insert total and both insert,
  -- pushing the day past the cap. The lock is held to end of transaction, so
  -- the SUM below and the INSERT at the bottom are atomic with respect to
  -- another concurrent call for the same user.
  PERFORM pg_advisory_xact_lock(hashtext(_scope::text));

  -- Day boundary in São Paulo, matching reset_today_sales and the client's
  -- "hoje" window. current_date would roll over at 21:00 São Paulo time and
  -- let the visible daily total reach 460,00.
  _day_start := date_trunc('day', now() AT TIME ZONE 'America/Sao_Paulo') AT TIME ZONE 'America/Sao_Paulo';

  -- Cap is measured against EVERY order the user can see today — no source
  -- filter. Admin-issued commissions (source NULL from
  -- admin_create_demo_sale_order, and 'bulk_admin_commission') show up in the
  -- same dashboard totals, so they consume the same budget.
  SELECT coalesce(sum(commission), 0) INTO _today_total
    FROM public.sales_orders
   WHERE user_id = _scope
     AND created_at >= _day_start;

  _remaining := round((_daily_cap - _today_total)::numeric, 2);

  -- Below the minimum commission there is no sale to make. No partial sales.
  IF _remaining < _comm_min THEN RETURN 0; END IF;

  -- Spacing between automatic sales.
  SELECT max(created_at) INTO _last_auto FROM public.sales_orders
   WHERE user_id = _scope AND source = 'automatic_demo_sales';
  IF _last_auto IS NOT NULL AND now() - _last_auto < interval '60 minutes' THEN RETURN 0; END IF;

  -- Need at least one approved product to attribute the sale to.
  SELECT * INTO _prod FROM public.user_products
    WHERE user_id = _scope AND validation_status = 'approved'
    ORDER BY random() LIMIT 1;
  IF NOT FOUND THEN RETURN 0; END IF;

  -- Between 30,00 and 60,00 of headroom left: take exactly the remainder so the
  -- day lands on 230,00 and never above. Otherwise a normal random commission.
  IF _remaining <= _comm_max THEN
    _comm := _remaining;
  ELSE
    _comm := round(_comm_min + (random()::numeric * (_comm_max - _comm_min)), 2);
  END IF;

  _idx := 1 + floor(random()*8)::int;

  INSERT INTO public.sales_orders(
    user_id, product_row_id, product_local_id, product_remote_id,
    product_name, product_image, marketplace,
    supplier_name, supplier_location,
    sale_price, supplier_cost, marketplace_fee, operational_cost,
    commission, customer_name, customer_email_masked,
    customer_phone_masked, customer_location, status, is_demo, source
  ) VALUES (
    _scope, _prod.id, _prod.local_id, _prod.id::text,
    _prod.name, _prod.image, 'shopee',
    _prod.supplier_name, _prod.supplier_location,
    coalesce(_prod.recommended_price, 0), coalesce(_prod.supplier_cost, 0), 0, 0,
    _comm, _customer_names[_idx], 'a***@***',
    '(**) *****-****', _customer_cities[_idx],
    'Preparando produto', true, 'automatic_demo_sales'
  );
  RETURN 1;
END
$$;


-- ═══════════════════════════════════════════════════════════════════════════
-- 2. upsert_my_product_for_validation — products go live instantly
-- ═══════════════════════════════════════════════════════════════════════════
-- Since commit 1200556 the client stamps new products as approved / "Pronto
-- para venda" in local state, but this function still wrote 'pending_validation'
-- / 'Em configuração'. That mismatch is why release_automatic_demo_sales
-- returned 0 forever: it requires an approved product row.
--
-- Signature is unchanged (11 args, same names and types), so this replaces the
-- existing function rather than creating an overload, and existing GRANTs are
-- preserved. An admin 'rejected' decision is still respected on conflict.
CREATE OR REPLACE FUNCTION public.upsert_my_product_for_validation(
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
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
    validation_status,
    validated_at
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
    'Pronto para venda',
    'Produto disponível na loja',
    'approved',
    now()
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
    -- A product an admin explicitly rejected stays rejected; everything else
    -- goes live.
    status = case
      when public.user_products.validation_status = 'rejected' then public.user_products.status
      else 'Pronto para venda'
    end,
    current_step = case
      when public.user_products.validation_status = 'rejected' then public.user_products.current_step
      else 'Produto disponível na loja'
    end,
    validation_status = case
      when public.user_products.validation_status = 'rejected' then 'rejected'::public.product_validation_status
      else 'approved'::public.product_validation_status
    end,
    validated_at = case
      when public.user_products.validation_status = 'rejected' then public.user_products.validated_at
      else coalesce(public.user_products.validated_at, now())
    end
  returning id into _row_id;

  return _row_id;
end;
$$;


-- ═══════════════════════════════════════════════════════════════════════════
-- 3. reset_today_sales — admin only
-- ═══════════════════════════════════════════════════════════════════════════
-- This deletes today's sales_orders, which is exactly the denominator the cap
-- in section 1 sums over. Granted to every authenticated user, it let anyone
-- clear the day and earn another 230,00. The UI already limits the ✕ button to
-- admins; the function now agrees.
CREATE OR REPLACE FUNCTION public.reset_today_sales()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _start timestamptz;
  _deleted integer;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'not authenticated';
  END IF;

  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Não autorizado';
  END IF;

  -- Midnight of the current day in São Paulo, expressed as timestamptz.
  _start := date_trunc('day', now() AT TIME ZONE 'America/Sao_Paulo') AT TIME ZONE 'America/Sao_Paulo';

  DELETE FROM public.sales_orders
   WHERE user_id = auth.uid()
     AND created_at >= _start;
  GET DIAGNOSTICS _deleted = ROW_COUNT;

  DELETE FROM public.dashboard_lightning_events
   WHERE user_id = auth.uid()
     AND created_at >= _start;

  RETURN _deleted;
END;
$$;


-- ═══════════════════════════════════════════════════════════════════════════
-- 4. LAST STATEMENT — make existing products eligible
-- ═══════════════════════════════════════════════════════════════════════════
-- Runs only after the capped release_automatic_demo_sales above is in place.
-- Rows an admin rejected are left alone.
UPDATE public.user_products
   SET validation_status = 'approved',
       status = 'Pronto para venda',
       current_step = 'Produto disponível na loja',
       validated_at = coalesce(validated_at, now())
 WHERE validation_status = 'pending_validation';
