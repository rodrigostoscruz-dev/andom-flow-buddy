
-- Add admin role
ALTER TYPE public.user_role ADD VALUE IF NOT EXISTS 'admin';
