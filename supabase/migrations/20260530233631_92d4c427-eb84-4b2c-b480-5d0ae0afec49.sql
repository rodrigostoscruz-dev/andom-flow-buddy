DROP POLICY IF EXISTS calls_update_ack ON public.calls;
CREATE POLICY calls_update_ack ON public.calls
FOR UPDATE TO authenticated
USING (
  (public."current_role"() = 'almoxarifado'::user_role AND sector = 'almoxarifado'::call_sector)
  OR (public."current_role"() = 'qualidade'::user_role AND sector = 'qualidade'::call_sector)
  OR (public."current_role"() = 'coord_qualidade'::user_role AND sector = 'qualidade'::call_sector)
  OR (public."current_role"() = 'coord_almoxarifado'::user_role AND sector = 'almoxarifado'::call_sector)
  OR (public."current_role"() = 'gerente_supply'::user_role AND sector = 'almoxarifado'::call_sector)
  OR (public."current_role"() = 'diretor_industrial'::user_role AND sector = 'almoxarifado'::call_sector)
  OR (public."current_role"() = 'admin'::user_role)
)
WITH CHECK (
  (public."current_role"() = 'almoxarifado'::user_role AND sector = 'almoxarifado'::call_sector)
  OR (public."current_role"() = 'qualidade'::user_role AND sector = 'qualidade'::call_sector)
  OR (public."current_role"() = 'coord_qualidade'::user_role AND sector = 'qualidade'::call_sector)
  OR (public."current_role"() = 'coord_almoxarifado'::user_role AND sector = 'almoxarifado'::call_sector)
  OR (public."current_role"() = 'gerente_supply'::user_role AND sector = 'almoxarifado'::call_sector)
  OR (public."current_role"() = 'diretor_industrial'::user_role AND sector = 'almoxarifado'::call_sector)
  OR (public."current_role"() = 'admin'::user_role)
);