CREATE TABLE public.registration_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  token text UNIQUE NOT NULL,
  plan_type text NOT NULL CHECK (plan_type IN ('mensal','vitalicio')),
  status text NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente','usado','expirado')),
  created_by uuid REFERENCES auth.users(id),
  used_by uuid REFERENCES auth.users(id),
  used_at timestamptz,
  expires_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.registration_tokens TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.registration_tokens TO authenticated;
GRANT ALL ON public.registration_tokens TO service_role;

ALTER TABLE public.registration_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can select tokens for validation"
  ON public.registration_tokens FOR SELECT
  USING (true);

CREATE POLICY "Admins can insert tokens"
  ON public.registration_tokens FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update tokens"
  ON public.registration_tokens FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete tokens"
  ON public.registration_tokens FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));