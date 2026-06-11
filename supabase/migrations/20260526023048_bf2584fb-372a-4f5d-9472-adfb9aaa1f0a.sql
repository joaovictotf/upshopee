-- Helper: is the current user a full admin OR a presentation admin (lightning button allowed)
CREATE OR REPLACE FUNCTION public.has_lightning_access(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id
      AND role IN ('admin'::public.app_role, 'presentation_admin'::public.app_role)
  )
$$;

-- record_lightning_click: insert a lightning event for the calling user
CREATE OR REPLACE FUNCTION public.record_lightning_click(_amount numeric)
RETURNS numeric
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
  _final numeric;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'Não autorizado'; END IF;
  IF NOT public.has_lightning_access(_uid) THEN
    RAISE EXCEPTION 'Acesso restrito';
  END IF;
  IF _amount IS NULL OR _amount <= 0 THEN
    _final := round((40 + random() * 310)::numeric, 2);
  ELSE
    _final := round(_amount::numeric, 2);
  END IF;
  INSERT INTO public.dashboard_lightning_events(user_id, amount)
    VALUES (_uid, _final);
  RETURN _final;
END
$$;

-- Grant presentation_admin role (full admin only)
CREATE OR REPLACE FUNCTION public.grant_presentation_admin(_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::public.app_role) THEN
    RAISE EXCEPTION 'Não autorizado';
  END IF;
  INSERT INTO public.user_roles(user_id, role)
    VALUES (_user_id, 'presentation_admin'::public.app_role)
    ON CONFLICT DO NOTHING;
END
$$;

-- Revoke presentation_admin role (full admin only)
CREATE OR REPLACE FUNCTION public.revoke_presentation_admin(_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::public.app_role) THEN
    RAISE EXCEPTION 'Não autorizado';
  END IF;
  DELETE FROM public.user_roles
    WHERE user_id = _user_id
      AND role = 'presentation_admin'::public.app_role;
END
$$;

-- List presentation_admin user_ids (admin only)
CREATE OR REPLACE FUNCTION public.list_presentation_admins()
RETURNS TABLE(user_id uuid)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::public.app_role) THEN
    RAISE EXCEPTION 'Não autorizado';
  END IF;
  RETURN QUERY
    SELECT ur.user_id FROM public.user_roles ur
      WHERE ur.role = 'presentation_admin'::public.app_role;
END
$$;
