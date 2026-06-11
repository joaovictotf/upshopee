
-- Add new enum value (must commit before use)
ALTER TYPE public.approval_status ADD VALUE IF NOT EXISTS 'blocked_payment';

-- Admin: block by missing payment
CREATE OR REPLACE FUNCTION public.block_user_payment(_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Não autorizado';
  END IF;
  UPDATE public.profiles
    SET approval_status = 'blocked_payment'
    WHERE user_id = _user_id;
END
$$;

-- Admin: release blocked user
CREATE OR REPLACE FUNCTION public.unblock_user_payment(_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Não autorizado';
  END IF;
  UPDATE public.profiles
    SET approval_status = 'approved',
        approved_at = COALESCE(approved_at, now()),
        approved_by = COALESCE(approved_by, auth.uid())
    WHERE user_id = _user_id;
END
$$;
