-- Add password_reset_required column to profiles for migrated-users flow.
-- New users default to false (no reset needed).
-- All existing profiles (the 426 imported users) get true.
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS password_reset_required boolean NOT NULL DEFAULT false;

UPDATE public.profiles
  SET password_reset_required = true;

-- Allow regular users to update their own profile so they can clear
-- password_reset_required after setting a personal password.
DROP POLICY IF EXISTS "Users update own profile" ON public.profiles;
CREATE POLICY "Users update own profile"
  ON public.profiles FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
