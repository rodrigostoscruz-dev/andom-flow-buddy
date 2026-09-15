CREATE OR REPLACE FUNCTION public.working_seconds(p_start timestamptz, p_end timestamptz)
RETURNS integer
LANGUAGE plpgsql
STABLE
SET search_path = public
AS $$
DECLARE
  s timestamp;
  e timestamp;
  d date;
  ws timestamp;
  we timestamp;
  total numeric := 0;
BEGIN
  IF p_start IS NULL OR p_end IS NULL THEN RETURN 0; END IF;
  s := p_start AT TIME ZONE 'America/Sao_Paulo';
  e := p_end AT TIME ZONE 'America/Sao_Paulo';
  IF e <= s THEN RETURN 0; END IF;
  d := s::date;
  WHILE d <= e::date LOOP
    ws := d + time '08:00';
    we := d + time '17:31';
    total := total + GREATEST(0, EXTRACT(EPOCH FROM (LEAST(e, we) - GREATEST(s, ws))));
    d := d + 1;
  END LOOP;
  RETURN total::int;
END $$;

CREATE OR REPLACE FUNCTION public.fill_call_duration()
RETURNS trigger LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'encerrado' AND NEW.ended_at IS NULL THEN
    NEW.ended_at := now();
  END IF;
  IF NEW.ended_at IS NOT NULL THEN
    NEW.duration_seconds := public.working_seconds(NEW.started_at, NEW.ended_at);
  END IF;
  RETURN NEW;
END $$;

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
    AND public.working_seconds(started_at, now()) >= 30 * 60
  )
  OR (
    public."current_role"() = 'coord_almoxarifado'::user_role
    AND sector = 'almoxarifado'::call_sector
    AND status = 'ativo'::call_status
    AND public.working_seconds(started_at, now()) >= 60 * 60
  )
  OR (
    public."current_role"() = 'gerente_supply'::user_role
    AND sector = 'almoxarifado'::call_sector
    AND status = 'ativo'::call_status
    AND public.working_seconds(started_at, now()) >= 24 * 3600
  )
  OR (
    public."current_role"() = 'diretor_industrial'::user_role
    AND sector = 'almoxarifado'::call_sector
    AND status = 'ativo'::call_status
    AND public.working_seconds(started_at, now()) >= 72 * 3600
  )
);