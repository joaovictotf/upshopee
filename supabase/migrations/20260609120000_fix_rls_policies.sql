-- Fix INSERT policy for dashboard_lightning_events
ALTER TABLE dashboard_lightning_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert their own events"
ON dashboard_lightning_events
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can read their own events"
ON dashboard_lightning_events
FOR SELECT
USING (auth.uid() = user_id);
