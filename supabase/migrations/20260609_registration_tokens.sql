CREATE TABLE registration_tokens (
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

ALTER TABLE registration_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can do everything"
ON registration_tokens FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'full_admin'
  )
);

CREATE POLICY "Anyone can read token to validate"
ON registration_tokens FOR SELECT
USING (true);
