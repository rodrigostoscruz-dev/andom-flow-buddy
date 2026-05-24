
-- Enums
CREATE TYPE public.user_role AS ENUM ('producao', 'almoxarifado', 'qualidade');
CREATE TYPE public.call_sector AS ENUM ('almoxarifado', 'qualidade');
CREATE TYPE public.call_status AS ENUM ('ativo', 'encerrado');

-- Profiles
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  station_key text NOT NULL UNIQUE,
  station_name text NOT NULL,
  role public.user_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "profiles_select_all_authenticated"
  ON public.profiles FOR SELECT
  TO authenticated USING (true);

-- Helper function for role
CREATE OR REPLACE FUNCTION public.current_role()
RETURNS public.user_role
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT role FROM public.profiles WHERE id = auth.uid() $$;

-- Calls
CREATE TABLE public.calls (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  station_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  station_name text NOT NULL,
  sector public.call_sector NOT NULL,
  reason text NOT NULL,
  color text NOT NULL,
  status public.call_status NOT NULL DEFAULT 'ativo',
  started_at timestamptz NOT NULL DEFAULT now(),
  ended_at timestamptz,
  duration_seconds integer
);
CREATE INDEX calls_status_idx ON public.calls(status);
CREATE INDEX calls_sector_idx ON public.calls(sector);
CREATE INDEX calls_station_idx ON public.calls(station_id);

ALTER TABLE public.calls ENABLE ROW LEVEL SECURITY;

-- Production sees their own; almox/qualidade see by sector
CREATE POLICY "calls_select_scoped"
  ON public.calls FOR SELECT
  TO authenticated
  USING (
    station_id = auth.uid()
    OR (public.current_role() = 'almoxarifado' AND sector = 'almoxarifado')
    OR (public.current_role() = 'qualidade' AND sector = 'qualidade')
  );

-- Only the station owner (production) can create their calls
CREATE POLICY "calls_insert_own"
  ON public.calls FOR INSERT
  TO authenticated
  WITH CHECK (station_id = auth.uid() AND public.current_role() = 'producao');

-- Only the station owner can close their calls
CREATE POLICY "calls_update_own"
  ON public.calls FOR UPDATE
  TO authenticated
  USING (station_id = auth.uid())
  WITH CHECK (station_id = auth.uid());

-- Trigger to auto-fill duration on close
CREATE OR REPLACE FUNCTION public.fill_call_duration()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.status = 'encerrado' AND NEW.ended_at IS NULL THEN
    NEW.ended_at := now();
  END IF;
  IF NEW.ended_at IS NOT NULL THEN
    NEW.duration_seconds := GREATEST(0, EXTRACT(EPOCH FROM (NEW.ended_at - NEW.started_at))::int);
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER calls_fill_duration
  BEFORE INSERT OR UPDATE ON public.calls
  FOR EACH ROW EXECUTE FUNCTION public.fill_call_duration();

-- Realtime
ALTER TABLE public.calls REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.calls;

-- Seed 9 users
DO $$
DECLARE
  u record;
  new_id uuid;
  hashed text;
BEGIN
  FOR u IN
    SELECT * FROM (VALUES
      ('cabeca',        'Cabeça',           'producao'),
      ('transportador', 'Transportador',    'producao'),
      ('mesa-saida',    'Mesa de Saída',    'producao'),
      ('eletrica',      'Elétrica',         'producao'),
      ('ponte',         'Ponte',            'producao'),
      ('plother-icf',   'Plother/ICF',      'producao'),
      ('integracao',    'Integração',       'producao'),
      ('almoxarifado',  'Almoxarifado',     'almoxarifado'),
      ('qualidade',     'Qualidade',        'qualidade')
    ) AS t(skey, sname, srole)
  LOOP
    new_id := gen_random_uuid();
    hashed := crypt('andom123', gen_salt('bf'));
    INSERT INTO auth.users (
      instance_id, id, aud, role, email, encrypted_password,
      email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
      created_at, updated_at, confirmation_token, email_change, email_change_token_new, recovery_token
    ) VALUES (
      '00000000-0000-0000-0000-000000000000', new_id, 'authenticated', 'authenticated',
      u.skey || '@andom.app', hashed, now(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      jsonb_build_object('station_key', u.skey, 'station_name', u.sname, 'role', u.srole),
      now(), now(), '', '', '', ''
    );
    INSERT INTO auth.identities (id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at)
    VALUES (gen_random_uuid(), new_id,
      jsonb_build_object('sub', new_id::text, 'email', u.skey || '@andom.app'),
      'email', u.skey || '@andom.app', now(), now(), now());
    INSERT INTO public.profiles (id, station_key, station_name, role)
    VALUES (new_id, u.skey, u.sname, u.srole::public.user_role);
  END LOOP;
END $$;
