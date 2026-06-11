-- 1) Add presentation_admin role
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'presentation_admin';

-- 2) Lightning events table (source of truth for the lightning button)
CREATE TABLE IF NOT EXISTS public.dashboard_lightning_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  amount numeric NOT NULL,
  source text NOT NULL DEFAULT 'lightning_button',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS dashboard_lightning_events_user_created_idx
  ON public.dashboard_lightning_events (user_id, created_at DESC);

ALTER TABLE public.dashboard_lightning_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "user reads own lightning events" ON public.dashboard_lightning_events;
CREATE POLICY "user reads own lightning events"
  ON public.dashboard_lightning_events
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "admin reads all lightning events" ON public.dashboard_lightning_events;
CREATE POLICY "admin reads all lightning events"
  ON public.dashboard_lightning_events
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
