import { useEffect, useRef, useState, useCallback } from "react";
import { ExternalLink, Pencil, X } from "lucide-react";

/* ──────────────────────────────────────────────────────────────────
   Helper: convert hex → "r, g, b" string for use in rgba()
   ────────────────────────────────────────────────────────────────── */
function hexToRgb(hex: string): string {
  const c = hex.replace("#", "");
  const r = parseInt(c.slice(0, 2), 16);
  const g = parseInt(c.slice(2, 4), 16);
  const b = parseInt(c.slice(4, 6), 16);
  return `${r}, ${g}, ${b}`;
}

/* ──────────────────────────────────────────────────────────────────
   Static Preview
   ────────────────────────────────────────────────────────────────── */

function getPreviewStyle(tag: string): { bg: string; accent: string; glow: string } {
  const t = tag.toLowerCase();
  if (t.includes("ai") || t.includes("prompt") || t.includes("sparklab"))
    return { bg: "linear-gradient(135deg,#04101f 0%,#072842 50%,#040e1c 100%)", accent: "#4fc3f7", glow: "rgba(79,195,247,0.15)" };
  if (t.includes("blockchain") || t.includes("web3") || t.includes("near"))
    return { bg: "linear-gradient(135deg,#06081e 0%,#0c1140 50%,#05071a 100%)", accent: "#818cf8", glow: "rgba(129,140,248,0.15)" };
  if (t.includes("zen") || t.includes("literacy") || t.includes("education") || t.includes("pioneer"))
    return { bg: "linear-gradient(135deg,#0e0520 0%,#1a0840 50%,#09031a 100%)", accent: "#c084fc", glow: "rgba(192,132,252,0.15)" };
  if (t.includes("healthcare") || t.includes("medical") || t.includes("clinical") || t.includes("hipaa"))
    return { bg: "linear-gradient(135deg,#021a10 0%,#053320 50%,#021410 100%)", accent: "#34d399", glow: "rgba(52,211,153,0.15)" };
  if (t.includes("creative") || t.includes("generative") || t.includes("animation"))
    return { bg: "linear-gradient(135deg,#1a0800 0%,#361500 50%,#150600 100%)", accent: "#fb923c", glow: "rgba(251,146,60,0.15)" };
  if (t.includes("simulation") || t.includes("physics"))
    return { bg: "linear-gradient(135deg,#020810 0%,#051628 50%,#03090e 100%)", accent: "#60a5fa", glow: "rgba(96,165,250,0.15)" };
  if (t.includes("commerce") || t.includes("local") || t.includes("baker"))
    return { bg: "linear-gradient(135deg,#1a0510 0%,#330a1e 50%,#150410 100%)", accent: "#f472b6", glow: "rgba(244,114,182,0.15)" };
  if (t.includes("publication") || t.includes("weekly"))
    return { bg: "linear-gradient(135deg,#100e06 0%,#231e08 50%,#0e0c05 100%)", accent: "#fbbf24", glow: "rgba(251,191,36,0.15)" };
  if (t.includes("visual") || t.includes("media"))
    return { bg: "linear-gradient(135deg,#080410 0%,#140820 50%,#06030e 100%)", accent: "#a78bfa", glow: "rgba(167,139,250,0.15)" };
  return { bg: "linear-gradient(135deg,#080c14 0%,#0f1828 50%,#060a10 100%)", accent: "#94a3b8", glow: "rgba(148,163,184,0.1)" };
}

function StaticPreview({ project }: { project: ProjectData }) {
  const { bg, accent } = getPreviewStyle(project.tag);
  let hostname = project.url;
  try { hostname = new URL(project.url).hostname; } catch { /* noop */ }
  return (
    <div className="static-preview" style={{ background: bg }}>
      <div className="static-preview__grid" style={{ "--sp-accent": accent } as React.CSSProperties} />
      <div className="static-preview__content">
        <div className="static-preview__domain" style={{ color: accent }}>{hostname}</div>
        <div className="static-preview__title" style={{ color: accent }}>{project.title}</div>
        <div className="static-preview__mock-ui" style={{ color: accent }}>
          <div className="static-preview__mock-nav"><span /><span /><span /><span /></div>
          <div className="static-preview__mock-hero" />
          <div className="static-preview__mock-cards"><div /><div /><div /></div>
        </div>
      </div>
      <div className="static-preview__live" style={{ color: accent }}>
        <span className="static-preview__live-dot" style={{ background: accent }} />
        LIVE
      </div>
    </div>
  );
}

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
  return text.split("").map((ch, i) => {
    if (ch === " ") return " ";
    return progress > i / text.length ? ch : GLYPHS[Math.floor(Math.random() * GLYPHS.length)];
  }).join("");
}

function loadEdits(): Record<number, Partial<ProjectData>> {
  try { return JSON.parse(localStorage.getItem(LS_KEY) || "{}"); } catch { return {}; }
}
function saveEdits(edits: Record<number, Partial<ProjectData>>) {
  localStorage.setItem(LS_KEY, JSON.stringify(edits));
}
function getHostname(url: string): string {
  try { return new URL(url).hostname; } catch { return url; }
}

/* ──────────────────────────────────────────────────────────────────
   Edit Modal
   ────────────────────────────────────────────────────────────────── */

function EditModal({
  project, onSave, onClose,
}: { project: ProjectData; onSave: (d: Partial<ProjectData>) => void; onClose: () => void }) {
  const [title, setTitle] = useState(project.title);
  const [description, setDescription] = useState(project.description);
  const [tag, setTag] = useState(project.tag);
  const [url, setUrl] = useState(project.url);
  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/20 backdrop-blur-sm" onClick={onClose}>
      <div className="glass-card w-[90vw] max-w-md p-6" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <span className="tag-label">Edit Project</span>
          <button onClick={onClose} className="cmd-close"><X className="w-3 h-3" /></button>
        </div>
        <div className="flex flex-col gap-3">
          <input className="cmd-input" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Title" />
          <textarea className="cmd-textarea min-h-[60px]" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Description" />
          <input className="cmd-input" value={tag} onChange={(e) => setTag(e.target.value)} placeholder="Tag" />
          <input className="cmd-input" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="URL" />
          <button className="cmd-submit" onClick={() => { onSave({ title, description, tag, url }); onClose(); }}>Save Changes</button>
        </div>
      </div>
    </div>
  );
}

/* ──────────────────────────────────────────────────────────────────
   Liquid Glass Card
   ────────────────────────────────────────────────────────────────── */

function GlassCard({
  project, index, editMode, onEdit,
}: {
  project: ProjectData;
  index: number;
  editMode: boolean;
  onEdit: () => void;
}) {
  /* No mousePos state — eliminates per-mousemove re-renders on 20 cards */
  const [hovered, setHovered] = useState(false);
  const [displayTitle, setDisplayTitle] = useState(project.title);
  const scrambleRef = useRef<ReturnType<typeof setInterval>>();

  const { accent } = getPreviewStyle(project.tag);
  const accentRgb = hexToRgb(accent);
  const hostname = getHostname(project.url);

  const handleEnter = useCallback(() => {
    setHovered(true);
    let frame = 0;
    const total = 14;
    clearInterval(scrambleRef.current);
    scrambleRef.current = setInterval(() => {
      frame++;
      setDisplayTitle(scrambleText(project.title, frame / total));
      if (frame >= total) { setDisplayTitle(project.title); clearInterval(scrambleRef.current); }
    }, 32);
  }, [project.title]);

  const handleLeave = useCallback(() => {
    setHovered(false);
    clearInterval(scrambleRef.current);
    setDisplayTitle(project.title);
  }, [project.title]);

  useEffect(() => () => clearInterval(scrambleRef.current), []);

  const cssVars = {
    "--gc-accent":     accent,
    "--gc-accent-rgb": accentRgb,
  } as React.CSSProperties;

  return (
    <div
      className={`gc-wrap${hovered ? " gc-wrap--hovered" : ""}`}
      style={cssVars}
      onMouseEnter={handleEnter}
      onMouseLeave={handleLeave}
      onClick={() => window.open(project.url, "_blank", "noopener,noreferrer")}
    >
      <div className="gc-face">
        {/* Accent top bar */}
        <div className="gc-face__bar" aria-hidden />
        {/* Holographic prismatic sweep */}
        <div className="gc-face__sweep" aria-hidden />
        {/* Top-edge shimmer line */}
        <div className="gc-face__shimmer" aria-hidden />
        {/* Ambient accent glow halo */}
        <div className="gc-face__glow" aria-hidden />

        {/* ── Main body ── */}
        <div className="gc-face__body">
          {/* Top row: index · tag · ext icon */}
          <div className="gc-face__toprow">
            <span className="gc-face__idx">{String(index + 1).padStart(2, "0")}</span>
            <span className="gc-face__tag">{project.tag}</span>
            <ExternalLink className="gc-face__ext" aria-hidden />
          </div>

          {/* Title */}
          <h3 className="gc-face__title">{displayTitle}</h3>

          {/* Description */}
          <p className="gc-face__desc">{project.description}</p>

          {/* Stats */}
          {project.stats && project.stats.length > 0 && (
            <div className="gc-face__stats">
              {project.stats.slice(0, 3).map((s) => (
                <div key={s.label} className="gc-face__stat">
                  <span className="gc-face__stat-num">{s.num}</span>
                  <span className="gc-face__stat-label">{s.label}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── Hover reveal — slides up from bottom ── */}
        <div className="gc-face__reveal">
          <div className="gc-face__reveal-inner">
            <span className="gc-face__domain">{hostname}</span>
            <div className="gc-face__actions">
              <a
                href={project.url}
                target="_blank"
                rel="noopener noreferrer"
                className="gc-face__cta"
                onClick={(e) => e.stopPropagation()}
              >
                Open Live
                <ExternalLink className="w-3 h-3" />
              </a>
              {editMode && (
                <button
                  className="gc-panel__edit"
                  onClick={(e) => { e.stopPropagation(); onEdit(); }}
                >
                  <Pencil className="w-3 h-3" />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Corner brackets */}
        <span className="gc-br gc-br--tl" />
        <span className="gc-br gc-br--tr" />
        <span className="gc-br gc-br--bl" />
        <span className="gc-br gc-br--br" />
      </div>
    </div>
  );
}

/* ──────────────────────────────────────────────────────────────────
   Main Component
   ────────────────────────────────────────────────────────────────── */

export default function ProjectSpotlight({ editMode = false }: { editMode?: boolean }) {
  const [edits, setEdits] = useState<Record<number, Partial<ProjectData>>>(loadEdits);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);

  const projects = ALL_PROJECTS.map((p, i) => ({ ...p, ...(edits[i] || {}) }));

  const handleSave = useCallback(
    (index: number, data: Partial<ProjectData>) => {
      const next = { ...edits, [index]: data };
      setEdits(next);
      saveEdits(next);
    },
    [edits]
  );

  return (
    <section className="spotlight-section">
      {/* Header */}
      <div className="spotlight-header">
        <span className="tag-label">Portfolio — 50+ Projects · 5 Fortune 500 Partnerships</span>
        <h2 className="display-heading display-lg">MY WORK</h2>
        <p className="body-muted" style={{ maxWidth: "32rem", margin: "0.5rem auto 0" }}>
          From the first youth AI literacy program in US history to enterprise platforms — every project ships, every line serves a purpose.
        </p>
      </div>

      {/* Flat 4×5 liquid glass grid */}
      <div className="gc-grid">
        {projects.map((project, i) => (
          <GlassCard
            key={i}
            project={project}
            index={i}
            editMode={editMode}
            onEdit={() => setEditingIndex(i)}
          />
        ))}
      </div>

      {/* Edit modal */}
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
