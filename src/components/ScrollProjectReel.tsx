import { useEffect, useRef, useState, useCallback } from "react";
import { ExternalLink, Pencil, X, RotateCcw } from "lucide-react";

interface Project {
  title: string;
  description: string;
  url: string;
  tag: string;
  type: "iframe" | "link";
  stats?: { num: string; label: string }[];
}

// 13 remaining projects (4 featured ones removed)
const PROJECTS: Project[] = [
  {
    title: "CLINICALCIPHER",
    url: "https://zenmedcode.lovable.app",
    type: "iframe",
    description: "Medical coding toolkit — encrypt, decode, manage workflows.",
    tag: "healthcare · automation",
    stats: [{ num: "500+", label: "Codes" }, { num: "HIPAA", label: "Compliant" }],
  },
  {
    title: "LEXLESCHIK",
    url: "https://leschiks-law.lovable.app",
    type: "iframe",
    description: "Legal system analyzer with intelligent document processing.",
    tag: "legal · ai",
  },
  {
    title: "CANVASFORGE",
    url: "https://phengine.lovable.app",
    type: "iframe",
    description: "P5.js creative engine for generative art and visualizations.",
    tag: "creative · generative",
  },
  {
    title: "TALENTFLOW",
    url: "https://hractions.lovable.app",
    type: "iframe",
    description: "Seamless onboarding and talent pipeline management.",
    tag: "hr-tech · automation",
  },
  {
    title: "WORLDFORGE AI",
    url: "https://prompt-a-planet-forge.lovable.app",
    type: "iframe",
    description: "Build entire worlds with AI — concept to environment.",
    tag: "ai · world-building",
  },
  {
    title: "ZENTYPE",
    url: "https://terminalz.lovable.app",
    type: "iframe",
    description: "Terminal-style writing with zen-like simplicity.",
    tag: "productivity · minimalist",
  },
  {
    title: "INSPIRELENS",
    url: "https://brooks-showcase-studio.lovable.app",
    type: "iframe",
    description: "Capture, curate, and share visual moments that matter.",
    tag: "visual-inspiration · media",
  },
  {
    title: "GRAVITYGRID",
    url: "https://spacetime-sculptor.lovable.app",
    type: "iframe",
    description: "Physics simulation — gravity, spacetime, and dynamics.",
    tag: "simulation · physics",
  },
  {
    title: "ANIMATIC PRO",
    url: "https://toontool.lovable.app",
    type: "iframe",
    description: "Animation and toon-rendering suite for professionals.",
    tag: "animation · professional",
  },
  {
    title: "CHRONOSLIFE",
    url: "https://birth-spark.lovable.app/",
    type: "iframe",
    description: "See your life through the lens of time and moments.",
    tag: "data-visualization · personal",
  },
  {
    title: "MEDCODE",
    url: "https://zenmedcode.vercel.app",
    type: "iframe",
    description: "Advanced medical coding — intelligent code lookup.",
    tag: "healthcare · coding",
  },
  {
    title: "DEADLINEDASH",
    url: "https://decent-ducks-countdown-15.lovable.app",
    type: "iframe",
    description: "Urgency-driven countdown timer — deadlines into momentum.",
    tag: "productivity · gamified",
  },
  {
    title: "BAKERSPOT",
    url: "https://popuppastries.lovable.app",
    type: "iframe",
    description: "Pop-up pastry marketplace — artisanal baked goods.",
    tag: "commerce · local",
  },
];

const GLYPHS = "01アイウエオカキクケコ∷∵∴⊕⊗※÷≈≡∞";
const LS_KEY = "reel_projects_edits";

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

function loadEdits(): Record<number, Partial<Project>> {
  try { return JSON.parse(localStorage.getItem(LS_KEY) || "{}"); } catch { return {}; }
}
function saveEdits(edits: Record<number, Partial<Project>>) {
  localStorage.setItem(LS_KEY, JSON.stringify(edits));
}

/* ── Edit Modal ── */
function EditModal({
  project,
  onSave,
  onClose,
}: {
  project: Project;
  onSave: (data: Partial<Project>) => void;
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

/* ── Reel Card ── */
function ReelCard({
  item,
  index,
  editMode,
  onEdit,
}: {
  item: Project;
  index: number;
  editMode: boolean;
  onEdit: () => void;
}) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  const [mountIframe, setMountIframe] = useState(false);
  const [titleText, setTitleText] = useState(item.title);
  const [iframeLoaded, setIframeLoaded] = useState(false);
  const [iframeError, setIframeError] = useState(false);
  const scrambleRef = useRef<ReturnType<typeof setInterval>>();
  const side = index % 2 === 0 ? "left" : "right";

  // Visibility + iframe lifecycle
  useEffect(() => {
    const el = cardRef.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        setVisible(entry.isIntersecting);
      },
      { rootMargin: "50px 0px", threshold: 0.05 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  // Mount/unmount iframe based on proximity
  useEffect(() => {
    const el = cardRef.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setMountIframe(true);
        } else {
          setMountIframe(false);
          setIframeLoaded(false);
        }
      },
      { rootMargin: "200px 0px 500px 0px", threshold: 0 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  // Scramble text animation
  useEffect(() => {
    if (!visible) return;
    let frame = 0;
    const total = 18;
    scrambleRef.current = setInterval(() => {
      frame++;
      setTitleText(scrambleText(item.title, frame / total));
      if (frame >= total) {
        setTitleText(item.title);
        clearInterval(scrambleRef.current);
      }
    }, 40);
    return () => { if (scrambleRef.current) clearInterval(scrambleRef.current); };
  }, [visible, item.title]);

  const handleIframeError = useCallback(() => setIframeError(true), []);

  return (
    <div
      ref={cardRef}
      className={`proj-card proj-card--${side} ${visible ? "proj-card--visible" : ""}`}
      style={{ animationDelay: `${(index % 6) * 0.08}s` }}
    >
      <div className="proj-card__embed">
        {!iframeError ? (
          <>
            {!iframeLoaded && (
              <div className="proj-card__fallback">
                <div className="proj-card__fallback-text">loading…</div>
              </div>
            )}
            {mountIframe && (
              <iframe
                src={item.url}
                title={item.title}
                loading="lazy"
                sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
                className="proj-card__iframe"
                onLoad={() => setIframeLoaded(true)}
                onError={handleIframeError}
              />
            )}
          </>
        ) : (
          <div className="proj-card__fallback">
            <div className="proj-card__fallback-text">{item.title}</div>
          </div>
        )}
        <div className="proj-card__scanlines" />
        <div className="proj-card__overlay" />
      </div>

      <div className="proj-card__meta">
        <div className="proj-card__meta-left">
          <span className="proj-card__tag">{item.tag}</span>
          <h4 className="proj-card__title">{titleText}</h4>
          <p className="proj-card__desc">{item.description}</p>
        </div>
        <div className="flex items-center gap-1">
          {editMode && (
            <button onClick={onEdit} className="proj-card__link">
              <Pencil className="w-3 h-3" />
            </button>
          )}
          <a href={item.url} target="_blank" rel="noopener noreferrer" className="proj-card__link">
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
      </div>
    </div>
  );
}

/* ── Main Component ── */
export default function ScrollProjectReel({ editMode = false }: { editMode?: boolean }) {
  const [edits, setEdits] = useState<Record<number, Partial<Project>>>(loadEdits);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);

  const projects = PROJECTS.map((p, i) => ({ ...p, ...(edits[i] || {}) }));

  const handleSave = useCallback(
    (index: number, data: Partial<Project>) => {
      const next = { ...edits, [index]: data };
      setEdits(next);
      saveEdits(next);
    },
    [edits]
  );

  const handleReset = useCallback(() => {
    setEdits({});
    localStorage.removeItem(LS_KEY);
  }, []);

  return (
    <div className="proj-reel">
      <div className="proj-reel__header">
        <span className="tag-label">13 More Deployed Products</span>
        <h3 className="display-heading display-lg">ALL BUILDS</h3>
        {editMode && (
          <button onClick={handleReset} className="cta-btn-muted mt-2">
            <RotateCcw className="w-3 h-3" />
            Reset All
          </button>
        )}
      </div>

      <div className="proj-reel__grid">
        {projects.map((item, i) => (
          <ReelCard
            key={item.title}
            item={item}
            index={i}
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
    </div>
  );
}
