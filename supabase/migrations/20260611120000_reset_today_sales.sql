-- Reset button (✕): clears the caller's sales for "today" (America/Sao_Paulo)
-- at the source. sales_orders has no client-side DELETE policy (writes go
-- through security-definer functions only), so the reset runs as one too.
-- Historical rows (before today) are never touched.
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

GRANT EXECUTE ON FUNCTION public.reset_today_sales() TO authenticated;
