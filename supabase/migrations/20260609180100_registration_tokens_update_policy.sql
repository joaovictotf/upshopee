-- Allow newly signed-up (authenticated) users to mark a pending token as used.
-- USING: can only touch rows that are still 'pendente'
-- WITH CHECK: the new status must be 'usado'
CREATE POLICY "Authenticated users can mark token as used"
ON registration_tokens FOR UPDATE
USING (auth.uid() IS NOT NULL AND status = 'pendente')
WITH CHECK (status = 'usado');
