import { useEffect, useRef, useState, useCallback } from "react";
import { ExternalLink, Pencil, X, RotateCcw } from "lucide-react";

export interface ProjectData {
  title: string;
  description: string;
  url: string;
  tag: string;
  stats?: { num: string; label: string }[];
}

const FEATURED_DEFAULTS: ProjectData[] = [
  {
    title: "PARKPULSE",
    url: "https://national-park-service.lovable.app",
    description: "Live explorer guide for national parks with real-time data, trail maps, and visitor insights.",
    tag: "exploration · live-data",
    stats: [{ num: "43K+", label: "Parks" }, { num: "Real-time", label: "Updates" }],
  },
  {
    title: "SPARKLAB AI",
    url: "https://prompt-spark-playground.lovable.app",
    description: "Creative lab for experimenting with AI prompts — no-code interface for rapid prototyping.",
    tag: "ai · experimentation",
    stats: [{ num: "100K+", label: "Experiments" }, { num: "No-Code", label: "Interface" }],
  },
  {
    title: "CURATEPRO",
    url: "https://chetbeencool.lovable.app",
    description: "Portfolio platform for artists — curate, showcase, and sell creative work.",
    tag: "creator-economy · portfolio",
    stats: [{ num: "5K+", label: "Artists" }, { num: "$2M+", label: "Sales" }],
  },
  {
    title: "STEMSCORE",
    url: "https://stemjudges.lovable.app",
    description: "Competition management platform for STEM judges and event organizers.",
    tag: "education · competition",
    stats: [{ num: "500+", label: "Events" }, { num: "50K+", label: "Competitors" }],
  },
];

const LS_KEY = "featured_projects_edits";

function loadEdits(): Record<number, Partial<ProjectData>> {
  try {
    return JSON.parse(localStorage.getItem(LS_KEY) || "{}");
  } catch {
    return {};
  }
}

function saveEdits(edits: Record<number, Partial<ProjectData>>) {
  localStorage.setItem(LS_KEY, JSON.stringify(edits));
}

function mergeProject(base: ProjectData, edits?: Partial<ProjectData>): ProjectData {
  if (!edits) return base;
  return { ...base, ...edits };
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
      <div
        className="glass-card w-[90vw] max-w-md p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <span className="tag-label">Edit Project</span>
          <button onClick={onClose} className="cmd-close"><X className="w-3 h-3" /></button>
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

/* ── Featured Card ── */
function FeaturedCard({
  project,
  index,
  editMode,
  onEdit,
}: {
  project: ProjectData;
  index: number;
  editMode: boolean;
  onEdit: () => void;
}) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  const [mountIframe, setMountIframe] = useState(false);
  const [iframeLoaded, setIframeLoaded] = useState(false);
  const side = index % 2 === 0 ? "left" : "right";

  useEffect(() => {
    const el = cardRef.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        setVisible(entry.isIntersecting);
        if (entry.isIntersecting) setMountIframe(true);
        else setMountIframe(false);
      },
      { rootMargin: "300px 0px", threshold: 0.05 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <div
      ref={cardRef}
      className={`featured-card featured-card--${side} ${visible ? "featured-card--visible" : ""}`}
      style={{ animationDelay: `${index * 0.12}s` }}
    >
      {/* Iframe preview */}
      <div className="featured-card__embed">
        {!iframeLoaded && (
          <div className="proj-card__fallback">
            <div className="proj-card__fallback-text">loading…</div>
          </div>
        )}
        {mountIframe && (
          <iframe
            src={project.url}
            title={project.title}
            loading="lazy"
            sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
            className="featured-card__iframe"
            onLoad={() => setIframeLoaded(true)}
          />
        )}
        <div className="proj-card__scanlines" />
      </div>

      {/* Meta */}
      <div className="featured-card__meta">
        <span className="proj-card__tag">{project.tag}</span>
        <h3 className="featured-card__title">{project.title}</h3>
        <p className="featured-card__desc">{project.description}</p>

        {project.stats && (
          <div className="featured-card__stats">
            {project.stats.map((s) => (
              <div key={s.label} className="proj-card__stat">
                <span className="proj-card__stat-num">{s.num}</span>
                <span className="proj-card__stat-label">{s.label}</span>
              </div>
            ))}
          </div>
        )}

        <div className="featured-card__actions">
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

/* ── Main Component ── */
export default function FeaturedProjects({ editMode = false }: { editMode?: boolean }) {
  const [edits, setEdits] = useState<Record<number, Partial<ProjectData>>>(loadEdits);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);

  const projects = FEATURED_DEFAULTS.map((p, i) => mergeProject(p, edits[i]));

  const handleSave = useCallback(
    (index: number, data: Partial<ProjectData>) => {
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
    <section className="featured-projects">
      <div className="featured-projects__header">
        <span className="tag-label">Featured Work</span>
        <h2 className="display-heading display-lg">FLAGSHIP BUILDS</h2>
        {editMode && (
          <button onClick={handleReset} className="cta-btn-muted mt-3">
            <RotateCcw className="w-3 h-3" />
            Reset All
          </button>
        )}
      </div>

      <div className="featured-projects__list">
        {projects.map((project, i) => (
          <FeaturedCard
            key={i}
            project={project}
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
    </section>
  );
}

export { FEATURED_DEFAULTS };
