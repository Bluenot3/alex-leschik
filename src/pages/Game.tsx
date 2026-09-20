import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { ArrowRight, Copy, Loader2, Mail } from "lucide-react";
import "@/game.css";

type Author = "human" | "machine";

interface PuzzleItem {
  kind: string;
  text: string;
}

interface Verdict {
  index: number;
  guess: Author;
  author: Author;
  correct: boolean;
  tell: string;
}

interface FinalResult {
  score: number;
  percentile: number | null;
  totalPlayers: number | null;
}

interface Streak {
  lastDay: string;
  count: number;
}

const KIND_LABELS: Record<string, string> = {
  email: "Email draft",
  social: "Social post",
  review: "Product review",
  news: "News lede",
  poem: "Poem",
};

const BOOT_LINES = [
  "turing v1.0 — calibration",
  "loading five transmissions …",
  "origin check: 3 human · 2 machine (not necessarily in that order)",
  "",
];

function todayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

function loadStreak(): Streak {
  try {
    const raw = localStorage.getItem("turing_streak");
    if (raw) {
      const parsed = JSON.parse(raw) as Streak;
      if (typeof parsed.lastDay === "string" && typeof parsed.count === "number") return parsed;
    }
  } catch {
    /* fresh start */
  }
  return { lastDay: "", count: 0 };
}

function nextStreak(day: string): Streak {
  const prev = loadStreak();
  const yesterday = new Date(Date.now() - 86_400_000).toISOString().slice(0, 10);
  let count: number;
  if (prev.lastDay === day) count = Math.max(prev.count, 1);
  else if (prev.lastDay === yesterday) count = prev.count + 1;
  else count = 1;
  const next = { lastDay: day, count };
  try {
    localStorage.setItem("turing_streak", JSON.stringify(next));
  } catch {
    /* private mode */
  }
  return next;
}

function playerId(): string {
  try {
    let id = localStorage.getItem("turing_pid");
    if (!id) {
      id = crypto.randomUUID();
      localStorage.setItem("turing_pid", id);
    }
    return id;
  } catch {
    return "anon";
  }
}

async function hashEmail(email: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(email.trim().toLowerCase()));
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

function msUntilTomorrow(): number {
  const now = new Date();
  const tomorrow = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1));
  return tomorrow.getTime() - now.getTime();
}

function formatCountdown(ms: number): string {
  const h = Math.floor(ms / 3_600_000);
  const m = Math.floor((ms % 3_600_000) / 60_000);
  const s = Math.floor((ms % 60_000) / 1000);
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

type Phase = "boot" | "loading" | "round" | "capture" | "result" | "error";

export default function Game() {
  const [phase, setPhase] = useState<Phase>("boot");
  const [bootText, setBootText] = useState("");
  const [day, setDay] = useState("");
  const [items, setItems] = useState<PuzzleItem[]>([]);
  const [roundIndex, setRoundIndex] = useState(0);
  const [verdicts, setVerdicts] = useState<Verdict[]>([]);
  const [showVerdict, setShowVerdict] = useState(false);
  const [picking, setPicking] = useState<Author | null>(null);
  const [final, setFinal] = useState<FinalResult | null>(null);
  const [streak, setStreak] = useState<Streak>(loadStreak);
  const [email, setEmail] = useState("");
  const [emailBusy, setEmailBusy] = useState(false);
  const [emailDone, setEmailDone] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const [countdown, setCountdown] = useState(msUntilTomorrow());
  const verdictRef = useRef<HTMLDivElement | null>(null);

  /* Boot type-on */
  useEffect(() => {
    document.title = "TURING // Daily — Alex Leschik";
    let line = 0;
    let char = 0;
    let out = "";
    const tick = window.setInterval(() => {
      if (line >= BOOT_LINES.length) {
        window.clearInterval(tick);
        window.setTimeout(() => setPhase("loading"), 250);
        return;
      }
      const target = BOOT_LINES[line];
      if (char <= target.length) {
        setBootText(out + target.slice(0, char));
        char += 2;
      } else {
        out += target + "\n";
        line += 1;
        char = 0;
      }
    }, 14);
    return () => window.clearInterval(tick);
  }, []);

  /* Countdown ticker */
  useEffect(() => {
    const t = window.setInterval(() => setCountdown(msUntilTomorrow()), 1000);
    return () => window.clearInterval(t);
  }, []);

  const loadPuzzle = useCallback(async () => {
    setPhase("loading");
    const { data, error: fnError } = await supabase.functions.invoke("turing-daily", {
      method: "GET",
    });
    if (fnError || !data?.items) {
      console.error(fnError);
      setError("The daily transmission failed to arrive. Try again in a moment.");
      setPhase("error");
      return;
    }
    setDay(data.day);
    setItems(data.items);
    setPhase("round");
  }, []);

  useEffect(() => {
    if (phase === "loading" && items.length === 0 && !day) void loadPuzzle();
  }, [phase, items.length, day, loadPuzzle]);

  const current = items[roundIndex];

  const pick = async (guess: Author) => {
    if (picking || !current) return;
    setPicking(guess);
    const { data, error: fnError } = await supabase.functions.invoke("turing-daily", {
      body: {
        day,
        picks: [{ index: roundIndex, guess }],
      },
    });
    setPicking(null);
    if (fnError || !data?.results?.length) {
      console.error(fnError);
      setError("Verdict lost in transmission. Try that one again.");
      return;
    }
    const v = data.results[0] as Verdict;
    setVerdicts((prev) => [...prev, v]);
    setShowVerdict(true);
  };

  const advance = () => {
    if (roundIndex + 1 >= items.length) {
      setPhase("capture");
    } else {
      setRoundIndex((i) => i + 1);
      setShowVerdict(false);
      setError("");
    }
  };

  useEffect(() => {
    if (showVerdict && verdictRef.current) {
      verdictRef.current.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
  }, [showVerdict]);

  const submitPlay = async (emailCaptured: boolean) => {
    setPhase("loading");
    const playerHash = emailCaptured ? await hashEmail(email) : playerId();
    const { data, error: fnError } = await supabase.functions.invoke("turing-daily", {
      body: {
        day,
        picks: verdicts.map((v) => ({ index: v.index, guess: v.guess })),
        playerHash,
        emailCaptured,
      },
    });
    if (fnError || typeof data?.score !== "number") {
      console.error(fnError);
      setError("Your result couldn't be recorded. The puzzle still counts — refresh to try tomorrow.");
      setPhase("error");
      return;
    }
    setStreak(nextStreak(day));
    setFinal({
      score: data.score,
      percentile: data.percentile ?? null,
      totalPlayers: data.totalPlayers ?? null,
    });
    setPhase("result");
  };

  const captureEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError("Please enter a valid email.");
      return;
    }
    setEmailBusy(true);
    const value = email.trim();
    const { error: supaError } = await supabase.from("newsletter_signups").insert({ email: value });
    if (supaError && !supaError.message?.includes("duplicate")) console.error(supaError);
    await supabase.functions.invoke("notion-intake", {
      body: { kind: "newsletter", email: value },
    });
    setEmailDone(true);
    setEmailBusy(false);
    await submitPlay(true);
  };

  const shareText = useMemo(() => {
    if (!final) return "";
    const cells = verdicts.map((v) => (v.correct ? "\u{1F7E9}" : "\u{1F7E5}")).join("");
    return [
      `TURING // DAILY ${day}`,
      `${cells} ${final.score}/5`,
      "Can you tell the machine from the human?",
      `${window.location.origin}/game`,
    ].join("\n");
  }, [final, verdicts, day]);

  const copyShare = async () => {
    try {
      await navigator.clipboard.writeText(shareText);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2400);
    } catch {
      setError("Couldn't access the clipboard — select and copy manually.");
    }
  };

  return (
    <main className="turing-shell">
      <div className="turing-frame">
        <div className="turing-topbar">
          <Link to="/" className="turing-topbar__home">
            ← Alex Leschik
          </Link>
          <span>{day ? `TRANSMISSION ${day}` : "TRANSMISSION —"}</span>
        </div>

        <div>
          <h1 className="turing-title">TURING</h1>
          <p className="turing-sub">Can you tell the machine from the human?</p>
        </div>

        {phase === "boot" && (
          <div className="turing-panel">
            <div className="turing-boot">
              {bootText}
              <span className="turing-boot__caret" />
            </div>
          </div>
        )}

        {phase === "loading" && (
          <div className="turing-loading">
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
            <span>Receiving today's transmission …</span>
          </div>
        )}

        {phase === "round" && current && (
          <div className="turing-panel turing-fade-in" key={roundIndex}>
            <div className="turing-panel__meta">
              <span>
                Round {roundIndex + 1} / {items.length}
              </span>
              <span>{KIND_LABELS[current.kind] ?? "Text"}</span>
            </div>
            <p className="turing-body-text">{current.text}</p>

            {!showVerdict ? (
              <div className="turing-choices">
                <button className="turing-choice" disabled={!!picking} onClick={() => void pick("human")}>
                  {picking === "human" ? "…" : "Human"}
                </button>
                <button className="turing-choice" disabled={!!picking} onClick={() => void pick("machine")}>
                  {picking === "machine" ? "…" : "Machine"}
                </button>
              </div>
            ) : (
              <div className="turing-verdict" ref={verdictRef}>
                <span
                  className={`turing-verdict__head ${
                    verdicts[verdicts.length - 1]?.correct
                      ? "turing-verdict__head--correct"
                      : "turing-verdict__head--wrong"
                  }`}
                >
                  {verdicts[verdicts.length - 1]?.correct ? "Correct" : "Wrong"} — it was{" "}
                  {verdicts[verdicts.length - 1]?.author}
                </span>
                <p className="turing-verdict__tell">{verdicts[verdicts.length - 1]?.tell}</p>
                <button className="turing-next" onClick={advance}>
                  {roundIndex + 1 >= items.length ? "Final tally" : "Next transmission"}
                  <ArrowRight className="w-3 h-3" />
                </button>
              </div>
            )}
            {error && <p className="turing-error">{error}</p>}
          </div>
        )}

        {phase === "capture" && (
          <div className="turing-panel turing-fade-in">
            <div className="turing-panel__meta">
              <span>All five read</span>
              <span>Streak {streak.lastDay === day ? streak.count : 1}× </span>
            </div>
            <p className="turing-body-text" style={{ fontSize: "0.95rem" }}>
              Leave an email to keep your streak, get tomorrow's puzzle, and receive ZEN Weekly — one
              short transmission of what Alex is building. No noise, ever.
            </p>
            {!emailDone && (
              <form className="turing-capture" onSubmit={captureEmail}>
                <div style={{ position: "relative", flex: "1 1 200px", display: "flex", alignItems: "center" }}>
                  <Mail
                    className="w-3.5 h-3.5"
                    style={{
                      position: "absolute",
                      left: "0.8rem",
                      opacity: 0.4,
                      pointerEvents: "none",
                    }}
                  />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="your@email.com"
                    className="turing-input"
                    style={{ paddingLeft: "2.2rem" }}
                  />
                </div>
                <button type="submit" className="turing-choice" style={{ flex: "0 0 auto" }}>
                  {emailBusy ? <Loader2 className="w-3 h-3 animate-spin" /> : "Save streak"}
                </button>
                <button type="button" className="turing-skip" onClick={() => void submitPlay(false)}>
                  Skip — just show my score
                </button>
              </form>
            )}
            {error && <p className="turing-error">{error}</p>}
          </div>
        )}

        {phase === "result" && final && (
          <div className="turing-panel turing-fade-in">
            <div className="turing-panel__meta">
              <span>Final tally</span>
              <span>Streak {streak.count}×</span>
            </div>
            <div className="turing-score">
              {final.score}
              <span style={{ opacity: 0.35, fontSize: "0.5em" }}>/5</span>
            </div>
            <div className="turing-grid">
              {verdicts.map((v) => (
                <span key={v.index} className={`turing-grid__cell ${v.correct ? "turing-grid__cell--hit" : "turing-grid__cell--miss"}`}>
                  {v.correct ? "✓" : "✕"}
                </span>
              ))}
            </div>
            <p className="turing-verdict__tell">
              {final.totalPlayers !== null && final.totalPlayers > 1 && final.percentile !== null
                ? `Sharper than ${final.percentile}% of today's ${final.totalPlayers} players.`
                : "First player today — the baseline is yours."}
            </p>
            <button className="turing-share" onClick={copyShare}>
              <Copy className="w-3 h-3" />
              {copied ? "Copied" : "Share your result"}
            </button>
            {copied && <div className="turing-copy-done">On your clipboard — paste it anywhere.</div>}
            <div style={{ marginTop: "1.6rem", display: "flex", flexDirection: "column", gap: "0.8rem" }}>
              <span className="turing-sub">Next transmission in {formatCountdown(countdown)}</span>
              <Link to="/" className="turing-share" style={{ textDecoration: "none", alignSelf: "flex-start" }}>
                <ArrowRight className="w-3 h-3" />
                See the work behind the game
              </Link>
            </div>
            {error && <p className="turing-error">{error}</p>}
          </div>
        )}

        {phase === "error" && (
          <div className="turing-panel turing-fade-in">
            <p className="turing-body-text" style={{ fontSize: "0.95rem" }}>
              {error}
            </p>
            <button className="turing-next" onClick={() => void loadPuzzle()}>
              Try again
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>
        )}

        {(phase === "round" || phase === "capture") && (
          <div className="turing-strip">
            <span>
              Streak <strong>{streak.lastDay === day ? streak.count : 1}×</strong>
            </span>
            <span>Next in {formatCountdown(countdown)}</span>
          </div>
        )}
      </div>
    </main>
  );
}
