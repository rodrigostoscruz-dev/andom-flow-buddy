
DO $$
DECLARE
  new_id uuid := gen_random_uuid();
  hashed text := crypt('andom123', gen_salt('bf'));
BEGIN
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'admin@andom.app') THEN
    INSERT INTO auth.users (
      instance_id, id, aud, role, email, encrypted_password,
      email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
      created_at, updated_at, confirmation_token, email_change, email_change_token_new, recovery_token
    ) VALUES (
      '00000000-0000-0000-0000-000000000000', new_id, 'authenticated', 'authenticated',
      'admin@andom.app', hashed, now(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      jsonb_build_object('station_key','admin','station_name','Administrador','role','admin'),
      now(), now(), '', '', '', ''
    );
    INSERT INTO auth.identities (id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at)
    VALUES (gen_random_uuid(), new_id,
      jsonb_build_object('sub', new_id::text, 'email', 'admin@andom.app'),
      'email', 'admin@andom.app', now(), now(), now());
    INSERT INTO public.profiles (id, station_key, station_name, role)
    VALUES (new_id, 'admin', 'Administrador', 'admin'::public.user_role);
  END IF;
END $$;
