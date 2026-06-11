revoke execute on function public.upsert_my_product_for_validation(text, text, text, text, text, text[], text, text, numeric, numeric, numeric) from public, anon;
grant execute on function public.upsert_my_product_for_validation(text, text, text, text, text, text[], text, text, numeric, numeric, numeric) to authenticated;

revoke execute on function public.validate_user_product(uuid) from public, anon;
revoke execute on function public.validate_all_pending_products() from public, anon;
revoke execute on function public.validate_user_pending_products(uuid) from public, anon;
revoke execute on function public.validate_all_pending_connections() from public, anon;
revoke execute on function public.validate_user_pending_connections(uuid) from public, anon;
revoke execute on function public.validate_marketplace_connection(uuid, text) from public, anon;
revoke execute on function public.reject_marketplace_connection(uuid, text, text) from public, anon;
revoke execute on function public.approve_user(uuid) from public, anon;
revoke execute on function public.reject_user(uuid) from public, anon;

grant execute on function public.validate_user_product(uuid) to authenticated;
grant execute on function public.validate_all_pending_products() to authenticated;
grant execute on function public.validate_user_pending_products(uuid) to authenticated;
grant execute on function public.validate_all_pending_connections() to authenticated;
grant execute on function public.validate_user_pending_connections(uuid) to authenticated;
grant execute on function public.validate_marketplace_connection(uuid, text) to authenticated;
grant execute on function public.reject_marketplace_connection(uuid, text, text) to authenticated;
grant execute on function public.approve_user(uuid) to authenticated;
grant execute on function public.reject_user(uuid) to authenticated;