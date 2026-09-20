-- TURING daily game
CREATE TABLE public.daily_puzzles (
  day_key text PRIMARY KEY,
  puzzle jsonb NOT NULL,
  generated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.daily_puzzles ENABLE ROW LEVEL SECURITY;

-- Answers must never be exposed to clients directly; only backend functions read/write.
GRANT ALL ON public.daily_puzzles TO service_role;

CREATE TABLE public.game_plays (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  day_key text NOT NULL,
  score integer NOT NULL,
  picks jsonb NOT NULL DEFAULT '[]'::jsonb,
  player_hash text,
  email_captured boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT INSERT ON public.game_plays TO anon, authenticated;
GRANT ALL ON public.game_plays TO service_role;

ALTER TABLE public.game_plays ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can record a play"
  ON public.game_plays
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE INDEX idx_game_plays_day ON public.game_plays (day_key);