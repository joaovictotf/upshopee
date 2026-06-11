-- Allow users to reset their own connection back to pending_validation
DROP POLICY IF EXISTS "user updates own pending connection" ON public.user_marketplace_connections;

CREATE POLICY "user updates own connection to pending"
ON public.user_marketplace_connections
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id AND status = 'pending_validation'::connection_status);