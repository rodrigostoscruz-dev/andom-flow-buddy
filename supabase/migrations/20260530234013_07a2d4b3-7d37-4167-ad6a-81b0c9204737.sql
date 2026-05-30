UPDATE auth.users
SET encrypted_password = crypt('260194', gen_salt('bf'))
WHERE id = '3681bb0e-18ad-4da0-8321-09fa18931b92';