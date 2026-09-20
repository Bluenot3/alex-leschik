import { createClient } from "jsr:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const jsonHeaders = { ...corsHeaders, "Content-Type": "application/json" };

interface PlayRow {
  day_key: string;
  score: number;
  email_captured: boolean;
  created_at: string;
}

function ok(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: jsonHeaders });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    // Aggregate numbers only — but still require a signed-in owner session.
    const token = req.headers.get("Authorization")?.replace("Bearer ", "") ?? "";
    const admin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );
    const { data: userData } = await admin.auth.getUser(token);
    if (!userData?.user) {
      return ok({ error: "Unauthorized" }, 401);
    }

    const { data, error } = await admin
      .from("game_plays")
      .select("day_key, score, email_captured, created_at")
      .order("created_at", { ascending: false })
      .limit(5000);

    if (error) {
      console.error("turing-stats query:", error);
      return ok({ error: "Failed to load stats" }, 500);
    }

    const rows = (data ?? []) as PlayRow[];

    const byDay = new Map<string, { plays: number; scoreSum: number; conversions: number }>();
    for (const row of rows) {
      const d = byDay.get(row.day_key) ?? { plays: 0, scoreSum: 0, conversions: 0 };
      d.plays += 1;
      d.scoreSum += row.score;
      if (row.email_captured) d.conversions += 1;
      byDay.set(row.day_key, d);
    }

    const days = [...byDay.entries()]
      .sort((a, b) => (a[0] < b[0] ? 1 : -1))
      .slice(0, 14)
      .map(([day, v]) => ({
        day,
        plays: v.plays,
        avgScore: v.plays ? Math.round((v.scoreSum / v.plays) * 10) / 10 : 0,
        conversions: v.conversions,
      }));

    const totalPlays = rows.length;
    const scoreSum = rows.reduce((a, r) => a + r.score, 0);
    const conversions = rows.filter((r) => r.email_captured).length;

    return ok({
      days,
      totals: {
        plays: totalPlays,
        avgScore: totalPlays ? Math.round((scoreSum / totalPlays) * 10) / 10 : 0,
        conversions,
        conversionRate: totalPlays ? Math.round((conversions / totalPlays) * 100) : 0,
      },
    });
  } catch (e) {
    console.error("turing-stats:", e);
    return ok({ error: "Unexpected error" }, 500);
  }
});
