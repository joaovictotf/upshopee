
revoke execute on function public.handle_new_user() from public, anon, authenticated;
revoke execute on function public.has_role(uuid, public.app_role) from public, anon;
revoke execute on function public.approve_user(uuid) from public, anon;
revoke execute on function public.reject_user(uuid) from public, anon;
