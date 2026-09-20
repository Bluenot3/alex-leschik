import { createClient } from "jsr:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { z } from "npm:zod@3";

const jsonHeaders = { ...corsHeaders, "Content-Type": "application/json" };

type Author = "human" | "machine";

interface PuzzleItem {
  kind: string;
  text: string;
  author: Author;
  tell: string;
}

interface Puzzle {
  items: PuzzleItem[];
}

function ok(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: jsonHeaders });
}

function bad(body: unknown, status = 400) {
  return new Response(JSON.stringify(body), { status, headers: jsonHeaders });
}

function todayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

function shiftDay(key: string, delta: number): string {
  const d = new Date(key + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + delta);
  return d.toISOString().slice(0, 10);
}

const PUZZLE_SCHEMA = {
  name: "turing_puzzle",
  strict: true,
  schema: {
    type: "object",
    properties: {
      items: {
        type: "array",
        minItems: 5,
        maxItems: 5,
        items: {
          type: "object",
          properties: {
            kind: { type: "string", enum: ["email", "social", "review", "news", "poem"] },
            text: { type: "string" },
            author: { type: "string", enum: ["human", "machine"] },
            tell: { type: "string" },
          },
          required: ["kind", "text", "author", "tell"],
          additionalProperties: false,
        },
      },
    },
    required: ["items"],
    additionalProperties: false,
  },
};

function buildPrompt(day: string, machineCount: number) {
  return [
    {
      role: "system",
      content:
        "You build the daily 'TURING' puzzle: five short texts, some written by a person and some by an AI. " +
        "The goal is a fair, genuinely tricky test of AI literacy for sharp adult readers (executives, founders, educators).",
    },
    {
      role: "user",
      content:
        `Create the puzzle for ${day} (UTC). Return exactly 5 items as JSON.\n` +
        `- Exactly ${machineCount} items have author "machine"; the rest have author "human".\n` +
        `- Use each of these kinds exactly once: email (a work email draft), social (a social media post), review (a product review), news (a news lede), poem (a short poem).\n` +
        `- Topics: ordinary, believable, contemporary subjects (work, hobbies, neighborhoods, everyday products). No real company names, no real people's names, no branding.\n` +
        `- Length: 35-90 words each (poem may be shorter).\n` +
        `- Human texts: natural rhythm, small quirks, mild imperfections, personal voice. Not deliberately sloppy.\n` +
        `- Machine texts: polished, evenly structured, slightly over-complete — but not cartoonish and never mention being an AI.\n` +
        `- Both sides must be plausible. The puzzle should be hard, not a parody.\n` +
        `- tell: one sentence (max 140 chars) explaining the most instructive giveaway of that item's true author.`,
    },
  ];
}

function validatePuzzle(raw: unknown): Puzzle {
  const data = raw as { items?: PuzzleItem[] };
  const items = (data?.items ?? []).filter(
    (it) =>
      it &&
      typeof it.text === "string" &&
      it.text.trim().length > 0 &&
      (it.author === "human" || it.author === "machine") &&
      typeof it.tell === "string" &&
      it.tell.trim().length > 0 &&
      typeof it.kind === "string",
  );
  if (items.length !== 5) throw new Error("Generated puzzle did not contain 5 valid items");
  return { items: items.slice(0, 5) };
}

async function generatePuzzle(day: string): Promise<Puzzle> {
  const apiKey = Deno.env.get("LOVABLE_API_KEY");
  if (!apiKey) throw new Error("LOVABLE_API_KEY is not configured");

  const h = [...day].reduce((a, c) => a + c.charCodeAt(0), 0);
  const machineCount = 2 + (h % 2); // 2 or 3 machines per day

  let lastError = "";
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: buildPrompt(day, machineCount),
          response_format: { type: "json_schema", json_schema: PUZZLE_SCHEMA },
        }),
      });
      if (!res.ok) {
        lastError = `Gateway responded ${res.status}`;
        continue;
      }
      const payload = await res.json();
      const content = payload?.choices?.[0]?.message?.content;
      if (typeof content !== "string") {
        lastError = "Empty model response";
        continue;
      }
      return validatePuzzle(JSON.parse(content));
    } catch (e) {
      lastError = e instanceof Error ? e.message : String(e);
    }
  }
  throw new Error(`Puzzle generation failed: ${lastError}`);
}

async function ensurePuzzle(admin: ReturnType<typeof createClient>, day: string): Promise<Puzzle> {
  const { data, error } = await admin
    .from("daily_puzzles")
    .select("puzzle")
    .eq("day_key", day)
    .maybeSingle();
  if (!error && data?.puzzle) return data.puzzle as Puzzle;

  const puzzle = await generatePuzzle(day);
  const { error: upsertError } = await admin
    .from("daily_puzzles")
    .upsert({ day_key: day, puzzle });
  if (upsertError) console.error("Failed to cache puzzle:", upsertError);
  return puzzle;
}

/** Quietly build the next few days so the game never shows empty. */
async function seedForward(admin: ReturnType<typeof createClient>, fromDay: string) {
  try {
    for (let i = 1; i <= 5; i++) {
      const day = shiftDay(fromDay, i);
      const { data } = await admin
        .from("daily_puzzles")
        .select("day_key")
        .eq("day_key", day)
        .maybeSingle();
      if (data) continue;
      const puzzle = await generatePuzzle(day);
      await admin.from("daily_puzzles").upsert({ day_key: day, puzzle });
    }
  } catch (e) {
    console.error("seedForward:", e);
  }
}

const PickSchema = z.object({
  index: z.number().int().min(0).max(4),
  guess: z.enum(["human", "machine"]),
});

const BodySchema = z.object({
  day: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  picks: z.array(PickSchema).min(1).max(5),
  playerHash: z.string().min(8).max(64).optional(),
  emailCaptured: z.boolean().optional(),
});

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const admin = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
  );

  const url = new URL(req.url);
  const waitUntil = (globalThis as unknown as {
    EdgeRuntime?: { waitUntil: (p: Promise<unknown>) => void };
  }).EdgeRuntime?.waitUntil;

  try {
    if (req.method === "GET") {
      const day = url.searchParams.get("date") ?? todayKey();
      if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) return bad({ error: "Invalid date" });

      const puzzle = await ensurePuzzle(admin, day);
      if (waitUntil) waitUntil(seedForward(admin, day));
      else seedForward(admin, day).catch(() => {});

      return ok({
        day,
        items: puzzle.items.map(({ kind, text }) => ({ kind, text })),
      });
    }

    if (req.method === "POST") {
      const parsed = BodySchema.safeParse(await req.json().catch(() => null));
      if (!parsed.success) {
        return bad({ error: "Invalid payload", detail: parsed.error.flatten() });
      }
      const { day, picks, playerHash, emailCaptured } = parsed.data;

      const puzzle = await ensurePuzzle(admin, day);

      const results = picks.map((p) => {
        const item = puzzle.items[p.index];
        return {
          index: p.index,
          guess: p.guess,
          author: item.author,
          correct: item.author === p.guess,
          tell: item.tell,
        };
      });
      const score = results.filter((r) => r.correct).length;

      if (picks.length === 5) {
        // Record the completed play and compute today's percentile.
        await admin.from("game_plays").insert({
          day_key: day,
          score,
          picks: picks,
          player_hash: playerHash ?? null,
          email_captured: emailCaptured ?? false,
        });

        const { data: todays } = await admin
          .from("game_plays")
          .select("score")
          .eq("day_key", day);
        const totalPlayers = todays?.length ?? 1;
        const worse = (todays ?? []).filter((row) => row.score < score).length;
        const percentile = Math.round((worse / totalPlayers) * 100);

        return ok({ results, score, percentile, totalPlayers });
      }

      return ok({ results });
    }

    return bad({ error: "Method not allowed" }, 405);
  } catch (e) {
    console.error("turing-daily:", e);
    return bad({ error: e instanceof Error ? e.message : "Unexpected error" }, 500);
  }
});
