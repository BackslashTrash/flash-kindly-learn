CREATE TABLE public.reviews (
  id text PRIMARY KEY,
  user_id uuid NOT NULL DEFAULT auth.uid(),
  card_id text NOT NULL,
  deck text NOT NULL,
  reviewed_at timestamptz NOT NULL DEFAULT now(),
  result text NOT NULL,
  missed_keywords text[] NOT NULL DEFAULT '{}',
  mode text NOT NULL
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.reviews TO authenticated;
GRANT ALL ON public.reviews TO service_role;
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own reviews" ON public.reviews FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE TABLE public.card_state (
  user_id uuid NOT NULL DEFAULT auth.uid(),
  card_id text NOT NULL,
  step int NOT NULL DEFAULT 0,
  due_date date NOT NULL,
  last_result text,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, card_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.card_state TO authenticated;
GRANT ALL ON public.card_state TO service_role;
ALTER TABLE public.card_state ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own state" ON public.card_state FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());