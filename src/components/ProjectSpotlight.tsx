import { useCallback, useEffect, useRef, useState, type CSSProperties, type PointerEvent } from "react";
import { ArrowUpRight, Pencil, X } from "lucide-react";
import FoilCanvas from "@/foil/FoilCanvas";
import { getFoilEngine, type RendererStatus } from "@/foil/engine";
import { prefersReducedMotion } from "@/hooks/useRafTicker";
import "@/foil/vault.css";

/* ──────────────────────────────────────────────────────────────────
   Data
   ────────────────────────────────────────────────────────────────── */

export interface ProjectData {
  title: string;
  description: string;
  url: string;
  tag: string;
  stats?: { num: string; label: string }[];
}

/** Each plate's live engraving (scene) and foil ink, by portfolio slot. */
const PLATES: { scene: string; accent: string }[] = [
  { scene: "pioneer", accent: "#59c3ff" },
  { scene: "dmv", accent: "#6ee7b7" },
  { scene: "near", accent: "#4ee6ad" },
  { scene: "parks", accent: "#86d9a8" },
  { scene: "spark", accent: "#ffb86b" },
  { scene: "gallery", accent: "#f2a7c3" },
  { scene: "stem", accent: "#8fb4ff" },
  { scene: "medcode", accent: "#5eead4" },
  { scene: "cipher", accent: "#ff8fa3" },
  { scene: "terminal", accent: "#7ef0c2" },
  { scene: "planet", accent: "#b69cff" },
  { scene: "proto", accent: "#67e8f9" },
  { scene: "weekly", accent: "#f5d06f" },
  { scene: "forge", accent: "#fb9a6b" },
  { scene: "lens", accent: "#c4b5fd" },
  { scene: "gravity", accent: "#60a5fa" },
  { scene: "toon", accent: "#fda4af" },
  { scene: "chronos", accent: "#93c5fd" },
  { scene: "deadline", accent: "#fbbf24" },
  { scene: "baker", accent: "#fcd34d" },
];

const FEATURED = 2;

const ALL_PROJECTS: ProjectData[] = [
  {
    title: "1ST YOUTH AI LITERACY PROGRAM IN US HISTORY",
    url: "https://zenai.world",
    description: "Founded by Alexander Leschik — the first-ever youth AI literacy program in United States history. Teaching the next generation to understand, build with, and think critically about artificial intelligence.",
    tag: "zen ai co. · historic · ai-literacy",
    stats: [{ num: "1st", label: "In US History" }, { num: "Youth", label: "Focused" }, { num: "ZEN", label: "AI Co." }],
  },
  {
    title: "BOYS & GIRLS CLUBS × ZEN",
    url: "https://bgcgw-cot.lovable.app",
    description: "Official AI literacy partnership with Boys & Girls Clubs of Greater Washington — bringing ZEN AI Co.'s curriculum to communities across the DMV.",
    tag: "partnership · youth",
    stats: [{ num: "30K", label: "National Members" }, { num: "5K+", label: "Clubs" }],
  },
  {
    title: "NEAR PROTOCOL × ZEN",
    url: "https://near.org",
    description: "Collaboration with NEAR Protocol — the largest AI blockchain in the world. Building decentralized AI literacy tools and Web3-native educational experiences.",
    tag: "blockchain · ai · web3",
    stats: [{ num: "#1", label: "AI Blockchain" }, { num: "Web3", label: "Native" }],
  },
  {
    title: "PARKPULSE",
    url: "https://national-park-service.lovable.app",
    description: "Live explorer guide for national parks with real-time data, trail maps, and visitor insights. Built for outdoor enthusiasts and park rangers.",
    tag: "exploration · live-data",
    stats: [{ num: "43K+", label: "Parks" }, { num: "Real-time", label: "Updates" }],
  },
  {
    title: "SPARKLAB AI",
    url: "https://prompt-spark-playground.lovable.app",
    description: "Creative lab for experimenting with AI prompts — no-code interface for rapid prototyping and creative exploration.",
    tag: "ai · experimentation",
    stats: [{ num: "100K+", label: "Experiments" }, { num: "No-Code", label: "Interface" }],
  },
  {
    title: "CURATEPRO",
    url: "https://chetbeencool.lovable.app",
    description: "Portfolio platform for artists — curate, showcase, and sell creative work with elegant, gallery-grade presentation.",
    tag: "creator-economy · portfolio",
    stats: [{ num: "5K+", label: "Artists" }, { num: "$2M+", label: "Sales" }],
  },
  {
    title: "STEMSCORE",
    url: "https://stemjudges.lovable.app",
    description: "Competition management platform for STEM judges and event organizers. Streamlining the entire judging pipeline.",
    tag: "education · competition",
    stats: [{ num: "500+", label: "Events" }, { num: "50K+", label: "Competitors" }],
  },
  {
    title: "MEDCODE",
    url: "https://zenmedcode.vercel.app",
    description: "Advanced medical coding platform — intelligent code lookup, encryption, and workflow management.",
    tag: "healthcare · coding",
    stats: [{ num: "500+", label: "Codes" }, { num: "HIPAA", label: "Compliant" }],
  },
  {
    title: "CLINICALCIPHER",
    url: "https://zenmedcode.lovable.app",
    description: "Medical coding toolkit — encrypt, decode, and manage clinical workflows with precision.",
    tag: "healthcare · automation",
  },
  {
    title: "PROMPT PLAYGROUND",
    url: "https://terminalz.lovable.app",
    description: "Terminal-style AI prompt exploration tool built for ZEN AI Co.'s curriculum — used by Pioneers ages 11–18 in the first Youth AI Literacy Program in US history.",
    tag: "zen ai · education · module 1",
    stats: [{ num: "Ages", label: "11–18" }, { num: "Module", label: "1 Tool" }],
  },
  {
    title: "PROMPT A PLANET",
    url: "https://prompt-a-planet-forge.lovable.app",
    description: "World-building AI tool from ZEN AI Co.'s Pioneer curriculum — students generate entire planets and ecosystems powered by DALL·E 3, GPT-IMAGE-1.5, FLUX, and more.",
    tag: "zen ai · world-building · ai-literacy",
    stats: [{ num: "Multi", label: "AI Models" }, { num: "Pioneer", label: "Curriculum" }],
  },
  {
    title: "PROMPT A PROTOTYPE",
    url: "https://protozen.lovable.app",
    description: "Rapid-prototype AI tool for ZEN AI Pioneers — generates hyper-detailed images and design concepts. Students build real AI intuition from day one.",
    tag: "zen ai · prototyping · ai-literacy",
    stats: [{ num: "DALL·E 3", label: "Powered" }, { num: "FLUX", label: "+ More" }],
  },
  {
    title: "ZEN WEEKLY",
    url: "https://www.zenai.world/zenweekly",
    description: "Our flagship publication — the definitive weekly dispatch on AI literacy, youth tech, and the frontier of human-machine collaboration. 20,000+ subscribers.",
    tag: "publication · zen ai · since 2023",
    stats: [{ num: "20K+", label: "Subscribers" }, { num: "2023", label: "Est." }, { num: "Weekly", label: "Cadence" }],
  },
  {
    title: "CANVASFORGE",
    url: "https://phengine.lovable.app",
    description: "P5.js creative engine for generative art and interactive visualizations.",
    tag: "creative · generative",
  },
  {
    title: "INSPIRELENS",
    url: "https://brooks-showcase-studio.lovable.app",
    description: "Capture, curate, and share visual moments that matter.",
    tag: "visual-inspiration · media",
  },
  {
    title: "GRAVITYGRID",
    url: "https://spacetime-sculptor.lovable.app",
    description: "Physics simulation — gravity, spacetime, and particle dynamics.",
    tag: "simulation · physics",
  },
  {
    title: "ANIMATIC PRO",
    url: "https://toontool.lovable.app",
    description: "Animation and toon-rendering suite for professionals.",
    tag: "animation · professional",
  },
  {
    title: "CHRONOSLIFE",
    url: "https://birth-spark.lovable.app/",
    description: "See your life through the lens of time and moments lived.",
    tag: "data-visualization · personal",
  },
  {
    title: "DEADLINEDASH",
    url: "https://decent-ducks-countdown-15.lovable.app",
    description: "Urgency-driven countdown timer — turn deadlines into momentum.",
    tag: "productivity · gamified",
  },
  {
    title: "BAKERSPOT",
    url: "https://popuppastries.lovable.app",
    description: "Pop-up pastry marketplace — artisanal baked goods on demand.",
    tag: "commerce · local",
  },
];

/* ──────────────────────────────────────────────────────────────────
   Helpers
   ────────────────────────────────────────────────────────────────── */

const GLYPHS = "01アイウエオカキクケコ∷∵∴⊕⊗※÷≈≡∞";
const LS_KEY = "spotlight_projects_edits";

function scrambleText(text: string, progress: number): string {
  return text
    .split("")
    .map((ch, i) => {
      if (ch === " ") return " ";
      return progress > i / text.length ? ch : GLYPHS[Math.floor(Math.random() * GLYPHS.length)];
    })
    .join("");
}

function loadEdits(): Record<number, Partial<ProjectData>> {
  try {
    return JSON.parse(localStorage.getItem(LS_KEY) || "{}");
  } catch {
    return {};
  }
}
function saveEdits(edits: Record<number, Partial<ProjectData>>) {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(edits));
  } catch {
    /* storage unavailable — edits stay in memory */
  }
}
function getHostname(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

/* ──────────────────────────────────────────────────────────────────
   Edit Modal
   ────────────────────────────────────────────────────────────────── */

function EditModal({
  project,
  onSave,
  onClose,
}: {
  project: ProjectData;
  onSave: (d: Partial<ProjectData>) => void;
  onClose: () => void;
}) {
  const [title, setTitle] = useState(project.title);
  const [description, setDescription] = useState(project.description);
  const [tag, setTag] = useState(project.tag);
  const [url, setUrl] = useState(project.url);
  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/20 backdrop-blur-sm" onClick={onClose}>
      <div className="glass-card w-[90vw] max-w-md p-6" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <span className="tag-label">Edit Project</span>
          <button onClick={onClose} className="cmd-close" aria-label="Close editor">
            <X className="w-3 h-3" />
          </button>
        </div>
        <div className="flex flex-col gap-3">
          <input className="cmd-input" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Title" />
          <textarea className="cmd-textarea min-h-[60px]" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Description" />
          <input className="cmd-input" value={tag} onChange={(e) => setTag(e.target.value)} placeholder="Tag" />
          <input className="cmd-input" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="URL" />
          <button
            className="cmd-submit"
            onClick={() => {
              onSave({ title, description, tag, url });
              onClose();
            }}
          >
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
}

/* ──────────────────────────────────────────────────────────────────
   Plate — one project, one live engraving
   ────────────────────────────────────────────────────────────────── */

function Plate({
  project,
  index,
  scene,
  accent,
  featured,
  editMode,
  onEdit,
}: {
  project: ProjectData;
  index: number;
  scene: string;
  accent: string;
  featured: boolean;
  editMode: boolean;
  onEdit: () => void;
}) {
  const ref = useRef<HTMLElement>(null);
  const frame = useRef(0);
  const [displayTitle, setDisplayTitle] = useState(project.title);
  const scrambleRef = useRef<ReturnType<typeof setInterval>>();
  const reduced = useRef(prefersReducedMotion());
  const hostname = getHostname(project.url);

  useEffect(() => setDisplayTitle(project.title), [project.title]);
  useEffect(
    () => () => {
      clearInterval(scrambleRef.current);
      cancelAnimationFrame(frame.current);
    },
    [],
  );

  const onEnter = useCallback(() => {
    if (reduced.current) return;
    let step = 0;
    const total = 14;
    clearInterval(scrambleRef.current);
    scrambleRef.current = setInterval(() => {
      step++;
      setDisplayTitle(scrambleText(project.title, step / total));
      if (step >= total) {
        setDisplayTitle(project.title);
        clearInterval(scrambleRef.current);
      }
    }, 32);
  }, [project.title]);

  /* Pointer tilt + the foil edge catching light — CSS vars, one write per frame. */
  const onMove = useCallback((e: PointerEvent<HTMLElement>) => {
    if (reduced.current || e.pointerType === "touch") return;
    const el = ref.current;
    if (!el) return;
    const { clientX, clientY } = e;
    cancelAnimationFrame(frame.current);
    frame.current = requestAnimationFrame(() => {
      const r = el.getBoundingClientRect();
      const x = (clientX - r.left) / r.width - 0.5;
      const y = (clientY - r.top) / r.height - 0.5;
      el.style.setProperty("--rx", `${(-y * 5).toFixed(2)}deg`);
      el.style.setProperty("--ry", `${(x * 6).toFixed(2)}deg`);
      el.style.setProperty("--edge", `${(Math.atan2(y, x) * (180 / Math.PI) + 90).toFixed(1)}deg`);
      el.style.setProperty("--gx", `${((x + 0.5) * 100).toFixed(1)}%`);
      el.style.setProperty("--gy", `${((y + 0.5) * 100).toFixed(1)}%`);
    });
  }, []);

  const onLeave = useCallback(() => {
    clearInterval(scrambleRef.current);
    setDisplayTitle(project.title);
    cancelAnimationFrame(frame.current);
    const el = ref.current;
    if (!el) return;
    el.style.setProperty("--rx", "0deg");
    el.style.setProperty("--ry", "0deg");
  }, [project.title]);

  const no = String(index + 1).padStart(2, "0");

  return (
    <article
      ref={ref}
      className={`plate${featured ? " plate--featured" : ""}`}
      style={{ "--a": accent } as CSSProperties}
      onPointerEnter={onEnter}
      onPointerMove={onMove}
      onPointerLeave={onLeave}
    >
      <div className="plate__art">
        <FoilCanvas scene={scene} accent={accent} targetRef={ref} />
        <span className="plate__reg plate__reg--tl" aria-hidden="true" />
        <span className="plate__reg plate__reg--tr" aria-hidden="true" />
        <span className="plate__reg plate__reg--bl" aria-hidden="true" />
        <span className="plate__reg plate__reg--br" aria-hidden="true" />
      </div>

      <div className="plate__body">
        <div className="plate__meta">
          <span className="plate__no">No. {no}</span>
          <span className="plate__tag">{project.tag}</span>
        </div>

        <h3 className="plate__title">
          <a className="plate__link" href={project.url} target="_blank" rel="noopener noreferrer">
            <span aria-hidden="true">{displayTitle}</span>
            <span className="sr-only">
              {project.title} (opens {hostname} in a new tab)
            </span>
          </a>
        </h3>

        <p className="plate__desc">{project.description}</p>

        <div className="plate__foot">
          {project.stats && project.stats.length > 0 ? (
            <dl className="plate__stats">
              {project.stats.slice(0, 3).map((s) => (
                <div key={s.label} className="plate__stat">
                  <dt>{s.label}</dt>
                  <dd>{s.num}</dd>
                </div>
              ))}
            </dl>
          ) : (
            <span className="plate__domain">{hostname}</span>
          )}
          <span className="plate__open" aria-hidden="true">
            Open live <ArrowUpRight className="plate__open-icon" />
          </span>
        </div>
      </div>

      {editMode && (
        <button type="button" className="plate__edit" onClick={onEdit} aria-label={`Edit ${project.title}`}>
          <Pencil className="w-3 h-3" />
        </button>
      )}
    </article>
  );
}

/* ──────────────────────────────────────────────────────────────────
   Main Component
   ────────────────────────────────────────────────────────────────── */

const RENDERER_LABEL: Record<RendererStatus, string> = {
  pending: "Initialising GPU",
  webgpu: "WebGPU",
  webgl2: "WebGL2",
  static: "Static",
};

export default function ProjectSpotlight({ editMode = false }: { editMode?: boolean }) {
  const [edits, setEdits] = useState<Record<number, Partial<ProjectData>>>(loadEdits);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [renderer, setRenderer] = useState<RendererStatus>("pending");

  useEffect(() => getFoilEngine().subscribeStatus(setRenderer), []);

  const projects = ALL_PROJECTS.map((p, i) => ({ ...p, ...(edits[i] || {}) }));

  const handleSave = useCallback(
    (index: number, data: Partial<ProjectData>) => {
      const next = { ...edits, [index]: data };
      setEdits(next);
      saveEdits(next);
    },
    [edits],
  );

  return (
    <section className="vault" aria-labelledby="vault-title">
      <div className="vault__inner">
        <header className="vault__head">
          <span className="vault__eyebrow">Portfolio — 50+ Projects · 5 Fortune 500 Partnerships</span>
          <h2 id="vault-title" className="vault__title display-heading">
            MY WORK
          </h2>
          <p className="vault__lede">
            From the first youth AI literacy program in US history to enterprise platforms — every project ships, every
            line serves a purpose.
          </p>
          <div className="vault__renderer" data-state={renderer}>
            <span className="vault__renderer-dot" aria-hidden="true" />
            Rendered live · <strong>{RENDERER_LABEL[renderer]}</strong>
          </div>
        </header>

        <div className="plates">
          {projects.map((project, i) => (
            <Plate
              key={i}
              project={project}
              index={i}
              scene={PLATES[i]?.scene ?? "pioneer"}
              accent={PLATES[i]?.accent ?? "#59c3ff"}
              featured={i < FEATURED}
              editMode={editMode}
              onEdit={() => setEditingIndex(i)}
            />
          ))}
        </div>
      </div>

      {editingIndex !== null && (
        <EditModal
          project={projects[editingIndex]}
          onSave={(data) => handleSave(editingIndex, data)}
          onClose={() => setEditingIndex(null)}
        />
      )}
    </section>
  );
}
