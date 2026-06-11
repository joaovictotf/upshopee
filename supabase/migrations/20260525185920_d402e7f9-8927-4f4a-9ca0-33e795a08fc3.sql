
-- Withdrawal requests table
CREATE TABLE public.withdrawal_requests (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  requested_amount numeric NOT NULL CHECK (requested_amount > 0),
  pix_key text NOT NULL,
  pix_key_type text NOT NULL,
  holder_name text NOT NULL,
  status text NOT NULL DEFAULT 'pending_review',
  internal_note text,
  reviewed_by uuid,
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.withdrawal_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user reads own withdrawal requests"
  ON public.withdrawal_requests FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "admin reads all withdrawal requests"
  ON public.withdrawal_requests FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "admin updates withdrawal requests"
  ON public.withdrawal_requests FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE INDEX idx_withdrawal_requests_user ON public.withdrawal_requests(user_id, created_at DESC);
CREATE INDEX idx_withdrawal_requests_status ON public.withdrawal_requests(status);

-- RPC: user creates a withdrawal request (must be >= 30 days from account creation)
CREATE OR REPLACE FUNCTION public.create_withdrawal_request(
  _amount numeric,
  _pix_key text,
  _pix_key_type text,
  _holder_name text
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
  _created_at timestamptz;
  _new_id uuid;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'Não autorizado'; END IF;
  IF _amount IS NULL OR _amount <= 0 THEN RAISE EXCEPTION 'Valor inválido'; END IF;
  IF coalesce(trim(_pix_key),'') = '' THEN RAISE EXCEPTION 'Informe a chave Pix'; END IF;
  IF coalesce(trim(_pix_key_type),'') = '' THEN RAISE EXCEPTION 'Informe o tipo da chave Pix'; END IF;
  IF coalesce(trim(_holder_name),'') = '' THEN RAISE EXCEPTION 'Informe o nome do titular'; END IF;

  SELECT created_at INTO _created_at FROM public.profiles WHERE user_id = _uid;
  IF _created_at IS NULL THEN RAISE EXCEPTION 'Perfil não encontrado'; END IF;
  IF now() < _created_at + interval '30 days' THEN
    RAISE EXCEPTION 'Saque ficará disponível após 30 dias de conta ativa';
  END IF;

  INSERT INTO public.withdrawal_requests(user_id, requested_amount, pix_key, pix_key_type, holder_name)
  VALUES (_uid, round(_amount::numeric, 2), trim(_pix_key), trim(_pix_key_type), trim(_holder_name))
  RETURNING id INTO _new_id;
  RETURN _new_id;
END
$$;

-- RPC: release automatic demo sales for the caller (or _user_id if admin).
-- Only runs for users approved >= 3 days ago. Caps at 4 sales/day with >=90min spacing.
-- Commission random between R$ 12 and R$ 30. Marked is_demo=true, source='automatic_demo_sales'.
CREATE OR REPLACE FUNCTION public.release_automatic_demo_sales(_user_id uuid DEFAULT NULL)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _scope uuid;
  _approved_at timestamptz;
  _status text;
  _today_count int;
  _last_auto timestamptz;
  _prod public.user_products%rowtype;
  _comm numeric;
  _customer_names text[] := array['Ana Silva','Carlos Souza','Mariana Oliveira','João Pereira','Beatriz Santos','Rafael Lima','Camila Costa','Diego Almeida'];
  _customer_cities text[] := array['São Paulo, SP','Rio de Janeiro, RJ','Belo Horizonte, MG','Curitiba, PR','Porto Alegre, RS','Salvador, BA','Recife, PE','Fortaleza, CE'];
  _idx int;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Não autorizado'; END IF;
  IF _user_id IS NULL THEN
    _scope := auth.uid();
  ELSE
    IF _user_id <> auth.uid() AND NOT public.has_role(auth.uid(),'admin') THEN
      RAISE EXCEPTION 'Não autorizado';
    END IF;
    _scope := _user_id;
  END IF;

  SELECT approval_status::text, approved_at INTO _status, _approved_at
    FROM public.profiles WHERE user_id = _scope;
  IF _status IS DISTINCT FROM 'approved' THEN RETURN 0; END IF;
  IF _approved_at IS NULL OR now() < _approved_at + interval '3 days' THEN RETURN 0; END IF;

  SELECT count(*) INTO _today_count FROM public.sales_orders
    WHERE user_id = _scope
      AND source = 'automatic_demo_sales'
      AND created_at::date = current_date;
  IF _today_count >= 4 THEN RETURN 0; END IF;

  SELECT max(created_at) INTO _last_auto FROM public.sales_orders
    WHERE user_id = _scope AND source = 'automatic_demo_sales';
  IF _last_auto IS NOT NULL AND now() - _last_auto < interval '90 minutes' THEN RETURN 0; END IF;

  -- Need at least one validated product to attribute the sale to.
  SELECT * INTO _prod FROM public.user_products
    WHERE user_id = _scope AND validation_status = 'approved'
    ORDER BY random() LIMIT 1;
  IF NOT FOUND THEN RETURN 0; END IF;

  _comm := round((12 + random() * 18)::numeric, 2);
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
