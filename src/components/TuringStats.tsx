import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";

interface DayStat {
  day: string;
  plays: number;
  avgScore: number;
  conversions: number;
}

interface Totals {
  plays: number;
  avgScore: number;
  conversions: number;
  conversionRate: number;
}

/** Aggregate TURING daily-game numbers — read through the owner-only stats function. */
export default function TuringStats() {
  const [days, setDays] = useState<DayStat[]>([]);
  const [totals, setTotals] = useState<Totals | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data, error: fnError } = await supabase.functions.invoke("turing-stats", {
        method: "GET",
      });
      if (fnError || data?.error) {
        setError(fnError?.message || data?.error || "Failed to load");
      } else {
        setDays(data.days ?? []);
        setTotals(data.totals ?? null);
      }
      setLoading(false);
    })();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center gap-2 py-6 text-muted-foreground/50 font-mono text-[0.55rem] tracking-widest uppercase">
        <Loader2 className="w-3 h-3 animate-spin" />
        Loading game stats
      </div>
    );
  }

  if (error) {
    return (
      <div className="py-6 text-muted-foreground/50 font-mono text-[0.55rem] tracking-widest uppercase">
        {error}
      </div>
    );
  }

  return (
    <div className="py-2 flex flex-col gap-4">
      <div className="grid grid-cols-3 gap-2">
        {[
          { label: "Plays", value: totals?.plays ?? 0 },
          { label: "Avg score", value: `${totals?.avgScore ?? 0}/5` },
          { label: "Emails", value: `${totals?.conversionRate ?? 0}%` },
        ].map((s) => (
          <div key={s.label} className="rounded-lg border border-border/60 px-3 py-2.5">
            <div className="font-mono text-[0.5rem] tracking-widest uppercase text-muted-foreground/50">
              {s.label}
            </div>
            <div className="text-foreground/85 text-sm font-medium mt-1">{s.value}</div>
          </div>
        ))}
      </div>

      <div className="flex flex-col gap-1.5">
        <div className="font-mono text-[0.5rem] tracking-widest uppercase text-muted-foreground/50">
          Last 14 days
        </div>
        {days.length === 0 && (
          <div className="py-3 text-muted-foreground/30 font-mono text-[0.55rem] tracking-widest uppercase">
            No plays yet
          </div>
        )}
        {days.map((d) => (
          <div key={d.day} className="flex items-center justify-between font-mono text-[0.55rem] tracking-wider text-foreground/70">
            <span>{d.day}</span>
            <span className="text-muted-foreground/50">
              {d.plays} {d.plays === 1 ? "play" : "plays"} · avg {d.avgScore}/5 · {d.conversions} email
              {d.conversions === 1 ? "" : "s"}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
