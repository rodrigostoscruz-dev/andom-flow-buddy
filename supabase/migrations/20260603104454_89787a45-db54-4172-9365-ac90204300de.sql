-- Reset passwords: admin -> 260194, all others -> 123456
UPDATE auth.users u
SET encrypted_password = crypt('260194', gen_salt('bf'))
FROM public.profiles p
WHERE p.id = u.id AND p.role = 'admin';

UPDATE auth.users u
SET encrypted_password = crypt('123456', gen_salt('bf'))
FROM public.profiles p
WHERE p.id = u.id AND p.role <> 'admin';