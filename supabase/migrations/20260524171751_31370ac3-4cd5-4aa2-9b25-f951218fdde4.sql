
REVOKE EXECUTE ON FUNCTION public.current_role() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.current_role() TO postgres, service_role;
ALTER FUNCTION public.fill_call_duration() SET search_path = public;
