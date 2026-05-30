-- Add acknowledgement columns to calls
ALTER TABLE public.calls
  ADD COLUMN IF NOT EXISTS acknowledged_at timestamptz,
  ADD COLUMN IF NOT EXISTS acknowledged_by uuid;

-- Replace select policy to include escalation roles
DROP POLICY IF EXISTS calls_select_scoped ON public.calls;
CREATE POLICY calls_select_scoped ON public.calls
FOR SELECT TO authenticated
USING (
  station_id = auth.uid()
  OR (public."current_role"() = 'almoxarifado'::user_role AND sector = 'almoxarifado'::call_sector)
  OR (public."current_role"() = 'qualidade'::user_role AND sector = 'qualidade'::call_sector)
  OR (public."current_role"() = 'admin'::user_role)
  OR (
    public."current_role"() = 'coord_qualidade'::user_role
    AND sector = 'qualidade'::call_sector
    AND status = 'ativo'::call_status
    AND started_at < now() - interval '30 minutes'
  )
  OR (
    public."current_role"() = 'coord_almoxarifado'::user_role
    AND sector = 'almoxarifado'::call_sector
    AND status = 'ativo'::call_status
    AND started_at < now() - interval '60 minutes'
  )
  OR (
    public."current_role"() = 'gerente_supply'::user_role
    AND sector = 'almoxarifado'::call_sector
    AND status = 'ativo'::call_status
    AND started_at < now() - interval '24 hours'
  )
  OR (
    public."current_role"() = 'diretor_industrial'::user_role
    AND sector = 'almoxarifado'::call_sector
    AND status = 'ativo'::call_status
    AND started_at < now() - interval '72 hours'
  )
);

-- Allow sector/coord/admin users to acknowledge calls (update acknowledged_at)
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
WITH CHECK (true);