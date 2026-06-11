
CREATE OR REPLACE FUNCTION public.release_due_boost_events(_user_id uuid DEFAULT NULL::uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _ev record;
  _n int := 0;
  _sid uuid;
  _scope uuid;
  _prod public.user_products%rowtype;
  _customer_names text[] := array['Ana Silva','Carlos Souza','Mariana Oliveira','João Pereira','Beatriz Santos','Rafael Lima','Camila Costa','Diego Almeida'];
  _customer_cities text[] := array['São Paulo, SP','Rio de Janeiro, RJ','Belo Horizonte, MG','Curitiba, PR','Porto Alegre, RS','Salvador, BA','Recife, PE','Fortaleza, CE'];
  _idx int;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Não autorizado';
  END IF;

  IF _user_id IS NULL THEN
    _scope := auth.uid();
  ELSE
    IF _user_id <> auth.uid() AND NOT public.has_role(auth.uid(),'admin') THEN
      RAISE EXCEPTION 'Não autorizado';
    END IF;
    _scope := _user_id;
  END IF;

  FOR _ev IN
    SELECT e.* FROM public.boost_simulated_events e
    JOIN public.boost_campaigns c ON c.id = e.campaign_id
    WHERE e.status = 'scheduled'
      AND e.scheduled_at <= now()
      AND c.status = 'active'
      AND e.user_id = _scope
    ORDER BY e.scheduled_at ASC
  LOOP
    _idx := 1 + floor(random()*8)::int;

    -- Refresh product info at release time so price/supplier reflect current data.
    IF _ev.product_row_id IS NOT NULL THEN
      SELECT * INTO _prod FROM public.user_products WHERE id = _ev.product_row_id;
    END IF;
    IF NOT FOUND THEN
      SELECT * INTO _prod FROM public.user_products
        WHERE user_id = _ev.user_id
        ORDER BY random() LIMIT 1;
    END IF;

    INSERT INTO public.sales_orders(
      user_id, product_row_id, product_local_id, product_remote_id,
      product_name, product_image, marketplace,
      supplier_name, supplier_location,
      sale_price, supplier_cost, marketplace_fee, operational_cost,
      commission, customer_name, customer_email_masked,
      customer_phone_masked, customer_location, status, is_demo, source
    ) VALUES (
      _ev.user_id,
      COALESCE(_prod.id, _ev.product_row_id),
      _prod.local_id,
      COALESCE(_prod.id::text, _ev.product_row_id::text),
      COALESCE(_prod.name, _ev.product_name),
      COALESCE(_prod.image, _ev.product_image),
      'shopee',
      _prod.supplier_name, _prod.supplier_location,
      COALESCE(_prod.recommended_price, 0), COALESCE(_prod.supplier_cost, 0), 0, 0,
      _ev.commission,
      _customer_names[_idx], 'a***@***', '(**) *****-****', _customer_cities[_idx],
      'Preparando produto', true, 'boost_simulation'
    ) RETURNING id INTO _sid;

    UPDATE public.boost_simulated_events
      SET status='released', released_at=now(), sales_order_id=_sid
      WHERE id = _ev.id;
    _n := _n + 1;
  END LOOP;

  RETURN _n;
END
$function$;
