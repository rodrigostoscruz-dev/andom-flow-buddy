ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS must_change_password boolean NOT NULL DEFAULT false;

-- Backfill: existing non-admin profiles should NOT be forced to change.
-- (default false handles new rows; admin will set true via server fn when creating/resetting)

-- Allow each user to clear their own must_change_password flag after changing password.
DROP POLICY IF EXISTS profiles_self_clear_must_change ON public.profiles;
CREATE POLICY profiles_self_clear_must_change ON public.profiles
FOR UPDATE TO authenticated
USING (id = auth.uid())
WITH CHECK (id = auth.uid() AND must_change_password = false);