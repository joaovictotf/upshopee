
-- Ensure pg_cron is available
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- 1) Replace bulk commission so it requires a real ready product per user
CREATE OR REPLACE FUNCTION public.admin_bulk_demo_commission_shopee(_commission numeric, _note text DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _user record;
  _prod public.user_products%rowtype;
  _success int := 0;
  _errors int := 0;
  _skipped int := 0;
  _eligible int := 0;
  _customer_names text[] := array['Ana Silva','Carlos Souza','Mariana Oliveira','João Pereira','Beatriz Santos','Rafael Lima','Camila Costa','Diego Almeida'];
  _customer_cities text[] := array['São Paulo, SP','Rio de Janeiro, RJ','Belo Horizonte, MG','Curitiba, PR','Porto Alegre, RS','Salvador, BA','Recife, PE','Fortaleza, CE'];
  _idx int;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Não autorizado';
  END IF;
  IF _commission IS NULL OR _commission <= 0 THEN
    RAISE EXCEPTION 'Valor de comissão inválido';
  END IF;

  FOR _user IN
    SELECT DISTINCT p.user_id
    FROM public.profiles p
    JOIN public.user_marketplace_connections c ON c.user_id = p.user_id
    WHERE p.approval_status = 'approved'
      AND c.marketplace = 'shopee'
      AND c.status = 'approved'
  LOOP
    _eligible := _eligible + 1;
    BEGIN
      SELECT * INTO _prod
        FROM public.user_products
        WHERE user_id = _user.user_id
          AND validation_status = 'approved'
        ORDER BY random()
        LIMIT 1;

      IF NOT FOUND THEN
        _skipped := _skipped + 1;
        CONTINUE;
      END IF;

      _idx := 1 + floor(random() * 8)::int;

      INSERT INTO public.sales_orders (
        user_id, product_row_id, product_local_id, product_remote_id,
        product_name, product_image, marketplace,
        supplier_name, supplier_location,
        sale_price, supplier_cost, marketplace_fee, operational_cost,
        commission, customer_name, customer_email_masked,
        customer_phone_masked, customer_location, status,
        is_demo, source
      ) VALUES (
        _user.user_id, _prod.id, _prod.local_id, _prod.id::text,
        _prod.name, _prod.image, 'shopee',
        _prod.supplier_name, _prod.supplier_location,
        coalesce(_prod.recommended_price, 0), coalesce(_prod.supplier_cost, 0), 0, 0,
        round(_commission::numeric, 2),
        _customer_names[_idx], 'a***@***',
        '(**) *****-****', _customer_cities[_idx],
        'Preparando produto', true, 'bulk_admin_commission'
      );
      _success := _success + 1;
    EXCEPTION WHEN OTHERS THEN
      _errors := _errors + 1;
    END;
  END LOOP;

  RETURN jsonb_build_object(
    'success', _success,
    'errors', _errors,
    'skipped', _skipped,
    'eligible', _eligible
  );
END
$$;

-- 2) Approve all pending accounts (admin manual action)
CREATE OR REPLACE FUNCTION public.approve_all_pending_accounts()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE n integer;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Não autorizado';
  END IF;
  WITH upd AS (
    UPDATE public.profiles
      SET approval_status = 'approved',
          approved_at = now(),
          approved_by = auth.uid()
      WHERE approval_status = 'pending'
      RETURNING 1
  ) SELECT count(*)::int INTO n FROM upd;
  RETURN coalesce(n, 0);
END
$$;

-- 3) Automatic background routines (no auth required, run by pg_cron)
CREATE OR REPLACE FUNCTION public.cron_auto_approve_pending_accounts()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE n integer;
BEGIN
  WITH upd AS (
    UPDATE public.profiles
      SET approval_status = 'approved',
          approved_at = COALESCE(approved_at, now())
      WHERE approval_status = 'pending'
      RETURNING 1
  ) SELECT count(*)::int INTO n FROM upd;
  RETURN coalesce(n, 0);
END
$$;

CREATE OR REPLACE FUNCTION public.cron_auto_approve_pending_connections()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE n integer;
BEGIN
  WITH upd AS (
    UPDATE public.user_marketplace_connections
      SET status = 'approved',
          validated_at = now(),
          rejected_at = null,
          rejection_reason = null
      WHERE status = 'pending_validation'
      RETURNING 1
  ) SELECT count(*)::int INTO n FROM upd;
  RETURN coalesce(n, 0);
END
$$;

-- 4) Schedule jobs (idempotent)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'auto-approve-accounts-30min') THEN
    PERFORM cron.schedule(
      'auto-approve-accounts-30min',
      '*/30 * * * *',
      $job$SELECT public.cron_auto_approve_pending_accounts();$job$
    );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'auto-approve-connections-1h') THEN
    PERFORM cron.schedule(
      'auto-approve-connections-1h',
      '0 * * * *',
      $job$SELECT public.cron_auto_approve_pending_connections();$job$
    );
  END IF;
END
$$;
