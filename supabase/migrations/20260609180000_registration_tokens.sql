-- NOTE: public.registration_tokens is already created (with secure RLS) by the
-- earlier migrations 20260609173538_* (table + admin policies via has_role) and
-- 20260609174813_* (drops public SELECT, adds the secure lookup_registration_token
-- function). This file sorts AFTER both, so its original CREATE TABLE failed with
-- "relation already exists", and its policies were either broken or a security
-- regression. It is reduced here to a guarded no-op that preserves that intended
-- final schema.

-- Guarded create: real table comes from 20260609173538_*; this never re-runs the
-- creation on an already-migrated DB, and is a safe no-op on a fresh push.
CREATE TABLE IF NOT EXISTS public.registration_tokens (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  token TEXT UNIQUE NOT NULL,
  plan_type TEXT NOT NULL CHECK (plan_type IN ('mensal', 'vitalicio')),
  status TEXT NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente', 'usado', 'expirado')),
  created_by UUID REFERENCES auth.users(id),
  used_by UUID REFERENCES auth.users(id),
  used_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Idempotent: RLS is already enabled by 20260609173538_*; harmless if repeated.
ALTER TABLE public.registration_tokens ENABLE ROW LEVEL SECURITY;

-- Removed broken policy "Admins can do everything": it referenced profiles.id and
-- profiles.role, neither of which exist (profiles keys on user_id and has no role
-- column; roles live in public.user_roles). Admin access is already correctly
-- provided by the has_role(auth.uid(),'admin') policies in 20260609173538_*.
DROP POLICY IF EXISTS "Admins can do everything" ON public.registration_tokens;

-- Removed policy "Anyone can read token to validate" (USING (true)): re-adding
-- public read here would undo the security hardening in 20260609174813_*, which
-- intentionally revoked public SELECT in favor of the SECURITY DEFINER function
-- public.lookup_registration_token(text). Drop it defensively in case a prior
-- push created it.
DROP POLICY IF EXISTS "Anyone can read token to validate" ON public.registration_tokens;
