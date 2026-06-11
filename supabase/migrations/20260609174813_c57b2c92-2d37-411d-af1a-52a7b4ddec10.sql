
-- 1. registration_tokens: drop public SELECT, add secure lookup function
DROP POLICY IF EXISTS "Anyone can select registration tokens" ON public.registration_tokens;
DROP POLICY IF EXISTS "Public can select registration tokens" ON public.registration_tokens;
DROP POLICY IF EXISTS "Anyone can validate tokens" ON public.registration_tokens;
DROP POLICY IF EXISTS "Public can validate tokens" ON public.registration_tokens;

-- Remove broad anon/authenticated SELECT grants; access goes through the function below
REVOKE SELECT ON public.registration_tokens FROM anon;
REVOKE SELECT ON public.registration_tokens FROM authenticated;

-- Admins keep full read access via existing admin ALL policy. Add explicit admin SELECT just in case.
CREATE POLICY "Admins can view registration tokens"
  ON public.registration_tokens
  FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Secure lookup: only returns a row when the caller supplies the exact token string
CREATE OR REPLACE FUNCTION public.lookup_registration_token(_token text)
RETURNS TABLE (
  id uuid,
  token text,
  plan_type text,
  status text,
  expires_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id, token, plan_type, status, expires_at
  FROM public.registration_tokens
  WHERE token = _token
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.lookup_registration_token(text) TO anon, authenticated;

-- 2. dashboard_lightning_events: add INSERT/UPDATE/DELETE policies scoped to owner
CREATE POLICY "Users can insert their own lightning events"
  ON public.dashboard_lightning_events
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own lightning events"
  ON public.dashboard_lightning_events
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own lightning events"
  ON public.dashboard_lightning_events
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- 3. withdrawal_requests: scope INSERT to owner, DELETE to admins
CREATE POLICY "Users can insert their own withdrawal requests"
  ON public.withdrawal_requests
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can delete withdrawal requests"
  ON public.withdrawal_requests
  FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- 4. profiles: scope INSERT to owner, DELETE to admins
-- Note: profiles uses user_id (not id) as the auth.users reference; has_role avoids RLS recursion
CREATE POLICY "Users can insert their own profile"
  ON public.profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can delete profiles"
  ON public.profiles
  FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
