-- BOOST CAMPAIGNS
CREATE TABLE public.boost_campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  pack_id text NOT NULL,
  pack_name text NOT NULL,
  pack_value numeric NOT NULL,
  status text NOT NULL DEFAULT 'active',
  starts_at timestamptz NOT NULL DEFAULT now(),
  ends_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  approved_by uuid,
  internal_note text,
  is_demo boolean NOT NULL DEFAULT true
);
ALTER TABLE public.boost_campaigns ENABLE ROW LEVEL SECURITY;
CREATE POLICY "user reads own boost campaigns" ON public.boost_campaigns
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "admin reads all boost campaigns" ON public.boost_campaigns
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'));

CREATE INDEX idx_boost_campaigns_user ON public.boost_campaigns(user_id, status);

-- BOOST SIMULATED EVENTS
CREATE TABLE public.boost_simulated_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid NOT NULL REFERENCES public.boost_campaigns(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  product_row_id uuid,
  product_name text NOT NULL,
  product_image text,
  scheduled_at timestamptz NOT NULL,
  commission numeric NOT NULL,
  status text NOT NULL DEFAULT 'scheduled',
  is_demo boolean NOT NULL DEFAULT true,
  source text NOT NULL DEFAULT 'boost_simulation',
  created_at timestamptz NOT NULL DEFAULT now(),
  released_at timestamptz,
  sales_order_id uuid
);
ALTER TABLE public.boost_simulated_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "user reads own boost events" ON public.boost_simulated_events
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "admin reads all boost events" ON public.boost_simulated_events
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'));

CREATE INDEX idx_boost_events_user_status ON public.boost_simulated_events(user_id, status, scheduled_at);
CREATE INDEX idx_boost_events_campaign ON public.boost_simulated_events(campaign_id);

-- CREATE CAMPAIGN
CREATE OR REPLACE FUNCTION public.admin_create_boost_campaign(
  _user_id uuid,
  _pack_id text,
  _starts_at timestamptz DEFAULT now(),
  _note text DEFAULT NULL,
  _replace boolean DEFAULT false
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _cid uuid;
  _existing uuid;
  _pack_name text;
  _pack_value numeric;
  _min_per_day int;
  _max_per_day int;
  _min_comm numeric;
  _max_comm numeric;
  _day int;
  _count int;
  _i int;
  _ts timestamptz;
  _hour int;
  _minute int;
  _comm numeric;
  _prod public.user_products%rowtype;
  _prod_name text;
  _prod_image text;
  _prod_row uuid;
BEGIN
  IF NOT public.has_role(auth.uid(),'admin') THEN
    RAISE EXCEPTION 'Não autorizado';
  END IF;

  CASE _pack_id
    WHEN 'inicio'     THEN _pack_name := 'Pack Início';     _pack_value := 24;  _min_per_day := 1; _max_per_day := 3; _min_comm := 12; _max_comm := 45;
    WHEN 'aceleracao' THEN _pack_name := 'Pack Aceleração'; _pack_value := 50;  _min_per_day := 2; _max_per_day := 4; _min_comm := 15; _max_comm := 70;
    WHEN 'escala'     THEN _pack_name := 'Pack Escala';     _pack_value := 150; _min_per_day := 3; _max_per_day := 6; _min_comm := 25; _max_comm := 120;
    WHEN 'maximo'     THEN _pack_name := 'Pack Máximo';     _pack_value := 400; _min_per_day := 4; _max_per_day := 7; _min_comm := 35; _max_comm := 120;
    ELSE RAISE EXCEPTION 'Pack inválido';
  END CASE;

  SELECT id INTO _existing FROM public.boost_campaigns
    WHERE user_id = _user_id AND status = 'active' LIMIT 1;
  IF _existing IS NOT NULL THEN
    IF NOT _replace THEN
      RETURN jsonb_build_object('ok', false, 'error', 'already_active');
    END IF;
    UPDATE public.boost_campaigns SET status = 'cancelled' WHERE id = _existing;
    DELETE FROM public.boost_simulated_events WHERE campaign_id = _existing AND status = 'scheduled';
  END IF;

  INSERT INTO public.boost_campaigns(user_id, pack_id, pack_name, pack_value, starts_at, ends_at, approved_by, internal_note)
  VALUES (_user_id, _pack_id, _pack_name, _pack_value, _starts_at, _starts_at + interval '7 days', auth.uid(), _note)
  RETURNING id INTO _cid;

  FOR _day IN 0..6 LOOP
    _count := _min_per_day + floor(random()*(_max_per_day - _min_per_day + 1))::int;
    IF _count > 7 THEN _count := 7; END IF;
    FOR _i IN 1.._count LOOP
      _hour := 9 + floor(random()*13)::int;   -- 9..21
      _minute := floor(random()*60)::int;
      _ts := date_trunc('day', _starts_at) + (_day || ' days')::interval + (_hour || ' hours')::interval + (_minute || ' minutes')::interval;
      _comm := round((_min_comm + random()*(_max_comm - _min_comm))::numeric, 2);

      SELECT * INTO _prod FROM public.user_products
        WHERE user_id = _user_id AND validation_status = 'approved'
        ORDER BY random() LIMIT 1;
      IF FOUND THEN
        _prod_name := _prod.name; _prod_image := _prod.image; _prod_row := _prod.id;
      ELSE
        SELECT * INTO _prod FROM public.user_products
          WHERE user_id = _user_id ORDER BY created_at DESC LIMIT 1;
        IF FOUND THEN
          _prod_name := _prod.name; _prod_image := _prod.image; _prod_row := _prod.id;
        ELSE
          _prod_name := 'Produto impulsionado ShopeSync';
          _prod_image := '/brands/shopee-bag.svg';
          _prod_row := NULL;
        END IF;
      END IF;

      INSERT INTO public.boost_simulated_events(
        campaign_id, user_id, product_row_id, product_name, product_image, scheduled_at, commission
      ) VALUES (
        _cid, _user_id, _prod_row, _prod_name, _prod_image, _ts, _comm
      );
    END LOOP;
  END LOOP;

  RETURN jsonb_build_object('ok', true, 'campaign_id', _cid, 'pack_name', _pack_name, 'pack_value', _pack_value);
END
$$;

-- CANCEL CAMPAIGN
CREATE OR REPLACE FUNCTION public.admin_cancel_boost_campaign(_campaign_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.has_role(auth.uid(),'admin') THEN
    RAISE EXCEPTION 'Não autorizado';
  END IF;
  UPDATE public.boost_campaigns SET status = 'cancelled' WHERE id = _campaign_id;
  DELETE FROM public.boost_simulated_events WHERE campaign_id = _campaign_id AND status = 'scheduled';
END
$$;

-- RELEASE DUE EVENTS (idempotent, scoped by auth.uid() unless admin passes another user)
CREATE OR REPLACE FUNCTION public.release_due_boost_events(_user_id uuid DEFAULT NULL)
RETURNS int LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _ev record;
  _n int := 0;
  _sid uuid;
  _scope uuid;
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
    INSERT INTO public.sales_orders(
      user_id, product_row_id, product_name, product_image, marketplace,
      sale_price, supplier_cost, commission,
      customer_name, customer_email_masked, customer_phone_masked, customer_location,
      status, is_demo, source
    ) VALUES (
      _ev.user_id, _ev.product_row_id, _ev.product_name, _ev.product_image, 'shopee',
      0, 0, _ev.commission,
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
$$;