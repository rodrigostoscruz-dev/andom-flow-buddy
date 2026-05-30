-- Extend user_role enum with new coordinator/director roles
ALTER TYPE public.user_role ADD VALUE IF NOT EXISTS 'coord_qualidade';
ALTER TYPE public.user_role ADD VALUE IF NOT EXISTS 'coord_almoxarifado';
ALTER TYPE public.user_role ADD VALUE IF NOT EXISTS 'gerente_supply';
ALTER TYPE public.user_role ADD VALUE IF NOT EXISTS 'diretor_industrial';