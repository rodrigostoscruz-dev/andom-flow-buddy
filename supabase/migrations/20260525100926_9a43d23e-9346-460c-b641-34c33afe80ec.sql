
-- 1) Restrict profiles SELECT to self only (current_role() is SECURITY DEFINER so RLS policies still work)
DROP POLICY IF EXISTS profiles_select_all_authenticated ON public.profiles;

CREATE POLICY profiles_select_own
ON public.profiles
FOR SELECT
TO authenticated
USING (id = auth.uid());

-- Explicitly prevent users from inserting/updating/deleting profiles (defense in depth against role escalation)
CREATE POLICY profiles_no_insert
ON public.profiles
FOR INSERT
TO authenticated
WITH CHECK (false);

CREATE POLICY profiles_no_update
ON public.profiles
FOR UPDATE
TO authenticated
USING (false)
WITH CHECK (false);

CREATE POLICY profiles_no_delete
ON public.profiles
FOR DELETE
TO authenticated
USING (false);

-- 2) Lock down Realtime channel subscriptions
ALTER TABLE realtime.messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS andom_realtime_authenticated_read ON realtime.messages;
CREATE POLICY andom_realtime_authenticated_read
ON realtime.messages
FOR SELECT
TO authenticated
USING (true);
