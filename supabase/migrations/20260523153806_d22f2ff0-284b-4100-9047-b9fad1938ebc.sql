
-- Re-grant EXECUTE on admin-gated RPCs to authenticated.
-- These functions are SECURITY DEFINER and self-check has_role(auth.uid(), 'admin') internally,
-- raising "Não autorizado" for non-admins. PostgREST requires EXECUTE on the role to
-- even call them, so revoking it broke the admin panel.

GRANT EXECUTE ON FUNCTION public.approve_user(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.reject_user(uuid) TO authenticated;

GRANT EXECUTE ON FUNCTION public.validate_user_product(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.validate_all_pending_products() TO authenticated;
GRANT EXECUTE ON FUNCTION public.validate_user_pending_products(uuid) TO authenticated;

GRANT EXECUTE ON FUNCTION public.validate_marketplace_connection(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.reject_marketplace_connection(uuid, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.validate_all_pending_connections() TO authenticated;
GRANT EXECUTE ON FUNCTION public.validate_user_pending_connections(uuid) TO authenticated;
