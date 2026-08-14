-- Revoke create_robo_sale_order from end users.
--
-- This RPC has no daily cap, no spacing between calls, and accepts any
-- commission below 500,00. Its only limiter was tryAutoSale's cooldown, which
-- lived in localStorage — per browser, per tab, and editable from devtools.
-- tryAutoSale has been removed from src/lib/state.tsx, so nothing calls it.
--
-- Automatic sales now come exclusively from release_automatic_demo_sales,
-- which enforces the R$ 230,00 daily cap under an advisory lock.
--
-- The function is left in place rather than dropped: revoking is reversible,
-- and the definition is still the reference for how a user-scoped sale row is
-- shaped. No admin grant is being preserved because none exists and none is
-- needed — admin-issued sales go through admin_create_demo_sale_order, which
-- has its own has_role(auth.uid(),'admin') check and separate grants. The
-- function owner retains EXECUTE regardless, so a superuser can still call it
-- for support work.

REVOKE EXECUTE ON FUNCTION public.create_robo_sale_order(uuid, numeric) FROM authenticated;

-- Re-assert the original revokes so a fresh database ends in the same state.
REVOKE EXECUTE ON FUNCTION public.create_robo_sale_order(uuid, numeric) FROM PUBLIC, anon;
