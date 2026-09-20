# TURING — Daily Game (Wordle-style AI literacy duel)

## The concept

A free daily game at `/game`: **can you tell the machine from the human?**

- Once a day, 5 short texts appear (an email snippet, a social post, a product review, a news lede, a poem). Some were written by a person, some by an AI.
- The player votes HUMAN or MACHINE on each. Instant verdict with a one-line "tell" explaining what gave it away — every round quietly teaches AI literacy.
- Wordle loop: one puzzle per day, streak counter, emoji-grid share button ("I beat the machine 4/5 — can you?"), countdown to tomorrow's puzzle, percentile rank vs. everyone else who played today.
- Conversion moment: at the reveal, the player is offered "Save your streak" — entering an email subscribes them to ZEN Weekly (existing `newsletter_signups` table + `notion-intake` edge function, no redirect). The game IS the value they take with them, and it demos that Alex ships real working AI products.
- Perfect brand fit: the godfather of AI literacy built the test.

## Game flow

```
/game  →  Boot line ("TURING v1.0 — calibrating…")
       →  Round 1..5: text card → HUMAN / MACHINE → verdict + tell
       →  Score card: X/5, percentile, streak, share grid, countdown
       →  Email gate (optional): save streak → ZEN Weekly
```

## What gets built

1. **Route + shell** — `/game` route in `src/App.tsx`; new `src/pages/Game.tsx` + `src/components/game/*` (RoundCard, VerdictBadge, ShareGrid, StreakBar, Countdown). Visual language matches the site: liquid-glass panels, terminal monospace accents, dithered/scanline texture — but the game is its own distinct room, not a copy of the homepage.

2. **Puzzle pipeline** — new edge function `turing-daily` (Lovable AI):
   - `GET ?date=YYYY-MM-DD` returns the day's 5 texts (truth flags never sent to the client until an answer is submitted — answers checked server-side per round via `POST`).
   - First request of the day generates the set with Lovable AI (JSON-schema output: text, author, tell), stores it in `daily_puzzles`, and every later player that day reads the cached row.
   - Also seeds 5-7 days ahead on first run so the game never shows empty.

3. **Answer checking + scoring** — `POST` with the day key + round picks; server returns per-round correct/incorrect + tells, final score, and the player's percentile (computed from `game_plays` for that day). Prevents cheating via devtools, which execs *will* open.

4. **Database** (Lovable Cloud, with RLS + GRANTs in the same migration):
   - `daily_puzzles` — day key, puzzle JSON, generated_at. Service-role write, no public write.
   - `game_plays` — day key, score, anonymized percentile input, optional email flag. Anonymous inserts allowed (game is playable logged-out), reads scoped to aggregates.

5. **Entry points on the homepage** — a "TURING // DAILY" CTA tile near the Lab section and a "Play" link in HoloNav. `/game` is shareable standalone for social posts.

6. **Owner console** — a small panel in `/console`: daily play counts, average score, email-capture conversion rate.

## Out of scope (deliberate)

- No accounts/passwords — anonymous play, email only to save streaks.
- No leaderboards with personal info — percentile only.
- No per-guess AI calls — content is cached per day, so cost stays near zero.

## Technical notes

- Edge function follows house rules: `corsHeaders` from the SDK, Zod validation on every payload, JWT checked where needed, never trust client-picked answers.
- Streak tracking: anonymous streak in `localStorage`; once an email is saved, streak attaches to the hashed email in `game_plays`.
- Share grid is plain text/emoji copied to clipboard — works on X, LinkedIn, iMessage with zero integrations.
- Copy tone: sharp, confident, no corporate filler ("5 texts. One of them is lying.").
