-- Function callable by the evopay-webhook edge function (via service_role key)
-- to activate a boost pack after PIX payment is confirmed.
-- Mirrors admin_create_boost_campaign but does NOT require admin auth —
-- it is secured by being callable only via the webhook secret.
CREATE OR REPLACE FUNCTION public.webhook_activate_boost_pack(
  _user_id uuid,
  _pack_id text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _cid uuid;
  _existing uuid;
  _pack_name text;
  _pack_value numeric;
  _total_sales int;
  _min_comm numeric;
  _max_comm numeric;
  _fixed_comm numeric;
  _has_any_product boolean;
  _i int;
  _ts timestamptz;
  _day_offset numeric;
  _hour int;
  _minute int;
  _comm numeric;
  _prod public.user_products%rowtype;
BEGIN
  -- Pack configuration (same as admin_create_boost_campaign)
  CASE _pack_id
    WHEN 'inicio' THEN
      _pack_name := 'Pack Início'; _pack_value := 24;
      _total_sales := 3;
      _min_comm := 24; _max_comm := 50; _fixed_comm := NULL;
    WHEN 'aceleracao' THEN
      _pack_name := 'Pack Aceleração'; _pack_value := 50;
      _total_sales := 4 + floor(random() * 5)::int; -- 4..8
      _min_comm := 45; _max_comm := 70; _fixed_comm := NULL;
    WHEN 'escala' THEN
      _pack_name := 'Pack Escala'; _pack_value := 150;
      _total_sales := 8 + floor(random() * 11)::int; -- 8..18
      _fixed_comm := 100;
    WHEN 'maximo' THEN
      _pack_name := 'Pack Máximo'; _pack_value := 400;
      _total_sales := 20 + floor(random() * 26)::int; -- 20..45
      _fixed_comm := 200;
    ELSE
      RETURN jsonb_build_object('ok', false, 'error', 'invalid_pack', 'pack_id', _pack_id);
  END CASE;

  -- Check if user already has an active campaign — cancel it (replace)
  SELECT id INTO _existing FROM public.boost_campaigns
    WHERE user_id = _user_id AND status = 'active' LIMIT 1;
  IF _existing IS NOT NULL THEN
    UPDATE public.boost_campaigns SET status = 'cancelled' WHERE id = _existing;
    DELETE FROM public.boost_simulated_events WHERE campaign_id = _existing AND status = 'scheduled';
  END IF;

  -- Create the campaign
  INSERT INTO public.boost_campaigns(
    user_id, pack_id, pack_name, pack_value,
    starts_at, ends_at, approved_by, internal_note, is_demo
  ) VALUES (
    _user_id, _pack_id, _pack_name, _pack_value,
    now(), now() + interval '7 days',
    _user_id, -- approved_by: the paying user (or null would work too)
    'Ativado via pagamento PIX (EvoPay)',
    false -- is_demo: this is a real paid pack
  )
  RETURNING id INTO _cid;

  -- Generate simulated sales events spread across 7 days
  FOR _i IN 1.._total_sales LOOP
    _day_offset := random() * 7;
    _hour := 9 + floor(random() * 13)::int;   -- 9..21
    _minute := floor(random() * 60)::int;
    _ts := date_trunc('day', now())
            + (floor(_day_offset)::int || ' days')::interval
            + (_hour || ' hours')::interval
            + (_minute || ' minutes')::interval;

    IF _fixed_comm IS NOT NULL THEN
      _comm := _fixed_comm;
    ELSE
      _comm := round((_min_comm + random() * (_max_comm - _min_comm))::numeric, 2);
    END IF;

    -- Prefer approved / Pronto para venda; fallback to any product of this user
    SELECT * INTO _prod FROM public.user_products
      WHERE user_id = _user_id
        AND (validation_status = 'approved' OR status = 'Pronto para venda')
      ORDER BY random() LIMIT 1;
    IF NOT FOUND THEN
      SELECT * INTO _prod FROM public.user_products
        WHERE user_id = _user_id
        ORDER BY random() LIMIT 1;
    END IF;
    -- Fallback if user has zero products
    IF NOT FOUND THEN
      _prod.name := 'Produto impulsionado ShopeSync';
      _prod.image := '/brands/shopee-bag.svg';
      _prod.id := NULL;
    END IF;

    INSERT INTO public.boost_simulated_events(
      campaign_id, user_id, product_row_id, product_name, product_image,
      scheduled_at, commission, is_demo
    ) VALUES (
      _cid, _user_id, _prod.id, _prod.name, _prod.image, _ts, _comm, false
    );
  END LOOP;

  RETURN jsonb_build_object(
    'ok', true,
    'campaign_id', _cid,
    'pack_name', _pack_name,
    'pack_value', _pack_value,
    'sales_planned', _total_sales
  );
END
$$;
