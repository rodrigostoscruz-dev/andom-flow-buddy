DROP POLICY IF EXISTS calls_select_scoped ON public.calls;
CREATE POLICY calls_select_scoped ON public.calls
FOR SELECT TO authenticated
USING (
  (station_id = auth.uid())
  OR (public."current_role"() = 'almoxarifado'::user_role AND sector = 'almoxarifado'::call_sector)
  OR (public."current_role"() = 'qualidade'::user_role AND sector = 'qualidade'::call_sector)
  OR (public."current_role"() = 'admin'::user_role)
);