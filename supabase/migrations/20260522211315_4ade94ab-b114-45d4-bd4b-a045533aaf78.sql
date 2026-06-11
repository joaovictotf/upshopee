-- 1) Lock down user_roles: only admins can INSERT / UPDATE / DELETE
CREATE POLICY "Admins insert roles"
  ON public.user_roles
  FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "Admins update roles"
  ON public.user_roles
  FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "Admins delete roles"
  ON public.user_roles
  FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role));

-- 2) Revoke EXECUTE on admin-only SECURITY DEFINER functions from public/authenticated.
--    The functions already enforce has_role(..., 'admin') internally, but exposing
--    EXECUTE to signed-in users still trips the linter and broadens attack surface.
REVOKE EXECUTE ON FUNCTION public.validate_all_pending_products() FROM PUBLIC, authenticated, anon;
REVOKE EXECUTE ON FUNCTION public.approve_user(uuid) FROM PUBLIC, authenticated, anon;
REVOKE EXECUTE ON FUNCTION public.validate_user_pending_products(uuid) FROM PUBLIC, authenticated, anon;
REVOKE EXECUTE ON FUNCTION public.validate_marketplace_connection(uuid, text) FROM PUBLIC, authenticated, anon;
REVOKE EXECUTE ON FUNCTION public.validate_user_pending_connections(uuid) FROM PUBLIC, authenticated, anon;
REVOKE EXECUTE ON FUNCTION public.validate_all_pending_connections() FROM PUBLIC, authenticated, anon;
REVOKE EXECUTE ON FUNCTION public.validate_user_product(uuid) FROM PUBLIC, authenticated, anon;
REVOKE EXECUTE ON FUNCTION public.reject_marketplace_connection(uuid, text, text) FROM PUBLIC, authenticated, anon;
REVOKE EXECUTE ON FUNCTION public.reject_user(uuid) FROM PUBLIC, authenticated, anon;

-- handle_new_user is a trigger function, must not be callable directly
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, authenticated, anon;

-- Keep upsert_my_product_for_validation and has_role callable by authenticated users
-- (they are intentionally user-facing and enforce auth.uid() internally).

-- 3) Restrict realtime subscriptions to authenticated users.
--    Per-row filtering for postgres_changes still flows through each source
--    table's existing RLS, so users only receive events for rows they can read.
ALTER TABLE realtime.messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can receive realtime messages"
  ON realtime.messages
  FOR SELECT
  TO authenticated
  USING (true);