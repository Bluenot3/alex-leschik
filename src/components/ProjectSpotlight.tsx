import { useEffect, useRef, useState, useCallback } from "react";
import { ExternalLink, Pencil, X, ChevronRight } from "lucide-react";

export interface ProjectData {
  title: string;
  description: string;
  url: string;
  tag: string;
  stats?: { num: string; label: string }[];
}

const ALL_PROJECTS: ProjectData[] = [
  // === FLAGSHIP / HIGH-PROFILE ===
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
    description: "Official AI literacy partnership with Boys & Girls Clubs of Greater Washington — bringing ZEN AI Co.'s curriculum to communities across the DMV. AI education for millions of young minds.",
    tag: "partnership · youth",
    stats: [{ num: "4.7M+", label: "Youth Served" }, { num: "5K+", label: "Clubs" }],
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
    title: "LEXLESCHIK",
    url: "https://leschiks-law.lovable.app",
    description: "Legal system analyzer with intelligent document processing and case research.",
    tag: "legal · ai",
  },
  {
    title: "CANVASFORGE",
    url: "https://phengine.lovable.app",
    description: "P5.js creative engine for generative art and interactive visualizations.",
    tag: "creative · generative",
  },
  {
    title: "TALENTFLOW",
    url: "https://hractions.lovable.app",
    description: "Seamless onboarding and talent pipeline management for modern teams.",
    tag: "hr-tech · automation",
  },
  {
    title: "WORLDFORGE AI",
    url: "https://prompt-a-planet-forge.lovable.app",
    description: "Build entire worlds with AI — from concept to environment in minutes.",
    tag: "ai · world-building",
  },
  {
    title: "ZENTYPE",
    url: "https://terminalz.lovable.app",
    description: "Terminal-style writing environment with zen-like simplicity and focus.",
    tag: "productivity · minimalist",
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

const GLYPHS = "01アイウエオカキクケコ∷∵∴⊕⊗※÷≈≡∞";
const LS_KEY = "spotlight_projects_edits";

function scrambleText(text: string, progress: number): string {
  return text
    .split("")
    .map((ch, i) => {
      if (ch === " ") return " ";
      const threshold = (i / text.length) * 1.2;
      return progress > threshold ? ch : GLYPHS[Math.floor(Math.random() * GLYPHS.length)];
    })
    .join("");
}

function loadEdits(): Record<number, Partial<ProjectData>> {
  try { return JSON.parse(localStorage.getItem(LS_KEY) || "{}"); } catch { return {}; }
}
function saveEdits(edits: Record<number, Partial<ProjectData>>) {
  localStorage.setItem(LS_KEY, JSON.stringify(edits));
}

/* ── Edit Modal ── */
function EditModal({
  project,
  onSave,
  onClose,
}: {
  project: ProjectData;
  onSave: (data: Partial<ProjectData>) => void;
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
          <button onClick={onClose} className="cmd-close"><X className="w-3 h-3" /></button>
        </div>
        <div className="flex flex-col gap-3">
          <input className="cmd-input" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Title" />
          <textarea className="cmd-textarea min-h-[60px]" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Description" />
          <input className="cmd-input" value={tag} onChange={(e) => setTag(e.target.value)} placeholder="Tag" />
          <input className="cmd-input" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="URL" />
          <button className="cmd-submit" onClick={() => { onSave({ title, description, tag, url }); onClose(); }}>
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Single Spotlight Card ── */
function SpotlightCard({
  project,
  index,
  active,
  editMode,
  onEdit,
}: {
  project: ProjectData;
  index: number;
  active: boolean;
  editMode: boolean;
  onEdit: () => void;
}) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  const [mountIframe, setMountIframe] = useState(false);
  const [iframeLoaded, setIframeLoaded] = useState(false);
  const [titleText, setTitleText] = useState(project.title);
  const scrambleRef = useRef<ReturnType<typeof setInterval>>();

  useEffect(() => {
    const el = cardRef.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        setVisible(entry.isIntersecting);
        if (entry.isIntersecting) setMountIframe(true);
        else {
          setMountIframe(false);
          setIframeLoaded(false);
        }
      },
      { rootMargin: "200px 0px", threshold: 0.1 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  // Scramble text
  useEffect(() => {
    if (!visible) return;
    let frame = 0;
    const total = 20;
    scrambleRef.current = setInterval(() => {
      frame++;
      setTitleText(scrambleText(project.title, frame / total));
      if (frame >= total) {
        setTitleText(project.title);
        clearInterval(scrambleRef.current);
      }
    }, 35);
    return () => { if (scrambleRef.current) clearInterval(scrambleRef.current); };
  }, [visible, project.title]);

  const side = index % 2 === 0 ? "left" : "right";

  return (
    <div
      ref={cardRef}
      id={`project-${index}`}
      className={`spotlight-card spotlight-card--${side} ${visible ? "spotlight-card--visible" : ""}`}
    >
      {/* Embed */}
      <div className="spotlight-card__embed">
        {!iframeLoaded && (
          <div className="proj-card__fallback">
            <div className="proj-card__fallback-text">{project.title}</div>
          </div>
        )}
        {mountIframe && (
          <iframe
            src={project.url}
            title={project.title}
            loading="lazy"
            sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
            className="spotlight-card__iframe"
            onLoad={() => setIframeLoaded(true)}
          />
        )}
        <div className="proj-card__scanlines" />
      </div>

      {/* Meta */}
      <div className="spotlight-card__meta">
        <span className="proj-card__tag">{project.tag}</span>
        <h3 className="spotlight-card__title">{titleText}</h3>
        <p className="spotlight-card__desc">{project.description}</p>

        {project.stats && (
          <div className="spotlight-card__stats">
            {project.stats.map((s) => (
              <div key={s.label} className="proj-card__stat">
                <span className="proj-card__stat-num">{s.num}</span>
                <span className="proj-card__stat-label">{s.label}</span>
              </div>
            ))}
          </div>
        )}

        <div className="spotlight-card__actions">
          <a href={project.url} target="_blank" rel="noopener noreferrer" className="cta-btn">
            Open Live
            <ExternalLink className="w-3 h-3" />
          </a>
          {editMode && (
            <button onClick={onEdit} className="cta-btn-muted">
              <Pencil className="w-3 h-3" />
              Edit
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

/* ── Side Navigation ── */
function SideNav({
  projects,
  activeIndex,
  onNavigate,
}: {
  projects: ProjectData[];
  activeIndex: number;
  onNavigate: (index: number) => void;
}) {
  return (
    <div className="spotlight-nav">
      {projects.map((p, i) => (
        <button
          key={i}
          className={`spotlight-nav__dot ${i === activeIndex ? "spotlight-nav__dot--active" : ""}`}
          onClick={() => onNavigate(i)}
          title={p.title}
        >
          <span className="spotlight-nav__label">{p.title}</span>
        </button>
      ))}
    </div>
  );
}

/* ── Main Component ── */
export default function ProjectSpotlight({ editMode = false }: { editMode?: boolean }) {
  const [edits, setEdits] = useState<Record<number, Partial<ProjectData>>>(loadEdits);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const projects = ALL_PROJECTS.map((p, i) => ({ ...p, ...(edits[i] || {}) }));

  // Track which project is in view
  useEffect(() => {
    const cards = document.querySelectorAll(".spotlight-card");
    if (!cards.length) return;
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            const idx = Number((e.target as HTMLElement).id.replace("project-", ""));
            if (!isNaN(idx)) setActiveIndex(idx);
          }
        });
      },
      { rootMargin: "-40% 0px -40% 0px", threshold: 0 }
    );
    cards.forEach((c) => io.observe(c));
    return () => io.disconnect();
  }, [projects.length]);

  const handleNavigate = useCallback((index: number) => {
    const el = document.getElementById(`project-${index}`);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
  }, []);

  const handleSave = useCallback(
    (index: number, data: Partial<ProjectData>) => {
      const next = { ...edits, [index]: data };
      setEdits(next);
      saveEdits(next);
    },
    [edits]
  );

  return (
    <section className="spotlight-section" ref={containerRef}>
      <div className="spotlight-header">
        <span className="tag-label">Portfolio — {projects.length} Deployed Products</span>
        <h2 className="display-heading display-lg">MY WORK</h2>
        <p className="body-muted" style={{ maxWidth: "32rem", margin: "0.5rem auto 0" }}>
          From the first youth AI literacy program in US history to enterprise platforms — every project ships, every line serves a purpose.
        </p>
      </div>

      <SideNav projects={projects} activeIndex={activeIndex} onNavigate={handleNavigate} />

      <div className="spotlight-list">
        {projects.map((project, i) => (
          <SpotlightCard
            key={i}
            project={project}
            index={i}
            active={i === activeIndex}
            editMode={editMode}
            onEdit={() => setEditingIndex(i)}
          />
        ))}
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
