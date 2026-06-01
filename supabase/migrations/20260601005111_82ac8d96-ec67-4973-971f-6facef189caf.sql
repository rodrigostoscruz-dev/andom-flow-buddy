-- Seed 4 coordination/management profiles
DO $$
DECLARE
  v_pwd text := crypt('andom123', gen_salt('bf'));
  rec record;
  new_id uuid;
BEGIN
  FOR rec IN
    SELECT * FROM (VALUES
      ('coord_qualidade',     'Coordenador Qualidade',     'coord_qualidade'::user_role),
      ('coord_almoxarifado',  'Coordenador Almoxarifado',  'coord_almoxarifado'::user_role),
      ('gerente_sc',          'Gerente Supply Chain',      'gerente_supply'::user_role),
      ('diretor_industrial',  'Diretor Industrial',        'diretor_industrial'::user_role)
    ) AS t(skey, sname, srole)
  LOOP
    -- Skip if already exists
    IF EXISTS (SELECT 1 FROM public.profiles WHERE station_key = rec.skey) THEN
      CONTINUE;
    END IF;

    new_id := gen_random_uuid();

    INSERT INTO auth.users (
      instance_id, id, aud, role, email, encrypted_password,
      email_confirmed_at, created_at, updated_at,
      raw_app_meta_data, raw_user_meta_data, is_super_admin, confirmation_token,
      email_change, email_change_token_new, recovery_token
    ) VALUES (
      '00000000-0000-0000-0000-000000000000', new_id, 'authenticated', 'authenticated',
      rec.skey || '@andom.app', v_pwd,
      now(), now(), now(),
      '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb, false, '',
      '', '', ''
    );

    INSERT INTO auth.identities (
      id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at
    ) VALUES (
      gen_random_uuid(), new_id,
      jsonb_build_object('sub', new_id::text, 'email', rec.skey || '@andom.app'),
      'email', rec.skey || '@andom.app',
      now(), now(), now()
    );

    INSERT INTO public.profiles (id, station_key, station_name, role, must_change_password)
    VALUES (new_id, rec.skey, rec.sname, rec.srole, true);
  END LOOP;
END $$;