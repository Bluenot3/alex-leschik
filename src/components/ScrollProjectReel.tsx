import { useEffect, useRef, useState } from "react";
import { ExternalLink } from "lucide-react";

interface Project {
  title: string;
  description: string;
  repoUrl: string;
  embedUrl: string;
  tag: string;
}

const PROJECTS: Project[] = [
  {
    title: "ROAM",
    description: "Interactive roaming experience across the world.",
    repoUrl: "https://github.com/Bluenot3/ROAM",
    embedUrl: "https://bluenot3.github.io/ROAM/",
    tag: "exploration",
  },
  {
    title: "AI Literacy Constitution",
    description: "The foundational framework for youth AI literacy.",
    repoUrl: "https://github.com/Bluenot3/AI-Literacy-Constitution",
    embedUrl: "https://bluenot3.github.io/AI-Literacy-Constitution/",
    tag: "education",
  },
  {
    title: "Agent Arena",
    description: "Competitive AI agent environment template.",
    repoUrl: "https://github.com/Bluenot3/AGENT-ARENA-TEMPLATE",
    embedUrl: "https://bluenot3.github.io/AGENT-ARENA-TEMPLATE/",
    tag: "ai · agents",
  },
  {
    title: "Popup Pastries",
    description: "A delightful popup pastry shop experience.",
    repoUrl: "https://github.com/Bluenot3/popuppastries",
    embedUrl: "https://bluenot3.github.io/popuppastries/",
    tag: "commerce",
  },
  {
    title: "Globe.gl",
    description: "Interactive 3D globe visualization.",
    repoUrl: "https://github.com/Bluenot3/globe.gl",
    embedUrl: "https://bluenot3.github.io/globe.gl/",
    tag: "webgl · data",
  },
  {
    title: "Homeschool Kit",
    description: "Modern toolkit for homeschool education.",
    repoUrl: "https://github.com/Bluenot3/homeschool-kit",
    embedUrl: "https://bluenot3.github.io/homeschool-kit/",
    tag: "education",
  },
  {
    title: "Vibe Book PM",
    description: "Creative, vibe-driven project management.",
    repoUrl: "https://github.com/Bluenot3/vibe-book-pm",
    embedUrl: "https://bluenot3.github.io/vibe-book-pm/",
    tag: "productivity",
  },
  {
    title: "V3",
    description: "Next-gen interface and interaction experiments.",
    repoUrl: "https://github.com/Bluenot3/V3",
    embedUrl: "https://bluenot3.github.io/V3/",
    tag: "experimental",
  },
  {
    title: "Fus3",
    description: "Fusion of creative coding and interactive design.",
    repoUrl: "https://github.com/Bluenot3/Fus3",
    embedUrl: "https://bluenot3.github.io/Fus3/",
    tag: "creative code",
  },
  {
    title: "Brooks Showcase Studio",
    description: "Premium showcase studio for creative portfolios.",
    repoUrl: "https://github.com/Bluenot3/brooks-showcase-studio",
    embedUrl: "https://bluenot3.github.io/brooks-showcase-studio/",
    tag: "portfolio",
  },
];

const GLYPHS = "01アイウエオカキクケコ∷∵∴⊕⊗※÷≈≡∞";

function scrambleText(text: string, progress: number): string {
  return text
    .split("")
    .map((ch, i) => {
      if (ch === " ") return " ";
      const threshold = (i / text.length) * 1.2;
      return progress > threshold
        ? ch
        : GLYPHS[Math.floor(Math.random() * GLYPHS.length)];
    })
    .join("");
}

function ReelCard({ project, index }: { project: Project; index: number }) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  const [shouldMount, setShouldMount] = useState(false);
  const [iframeError, setIframeError] = useState(false);
  const [titleText, setTitleText] = useState(project.title);
  const scrambleRef = useRef<ReturnType<typeof setInterval>>();
  const side = index % 2 === 0 ? "left" : "right";

  useEffect(() => {
    const el = cardRef.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        setVisible(entry.isIntersecting);
        if (entry.isIntersecting) setShouldMount(true);
      },
      { rootMargin: "200px 0px", threshold: 0.15 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  // Scramble title text on reveal
  useEffect(() => {
    if (!visible) return;
    let frame = 0;
    const total = 18;
    scrambleRef.current = setInterval(() => {
      frame++;
      const progress = frame / total;
      setTitleText(scrambleText(project.title, progress));
      if (frame >= total) {
        setTitleText(project.title);
        clearInterval(scrambleRef.current);
      }
    }, 40);
    return () => {
      if (scrambleRef.current) clearInterval(scrambleRef.current);
    };
  }, [visible, project.title]);

  // Unmount iframe when far from viewport
  useEffect(() => {
    if (!visible && shouldMount) {
      const timer = setTimeout(() => setShouldMount(false), 8000);
      return () => clearTimeout(timer);
    }
  }, [visible, shouldMount]);

  return (
    <div
      ref={cardRef}
      className={`proj-card proj-card--${side} ${visible ? "proj-card--visible" : ""}`}
    >
      {/* Cryptic index number */}
      <div className="proj-card__index">
        {String(index + 1).padStart(2, "0")}
      </div>

      {/* Embed preview */}
      <div className="proj-card__embed">
        {shouldMount && !iframeError ? (
          <iframe
            src={project.embedUrl}
            title={project.title}
            loading="lazy"
            sandbox="allow-scripts allow-same-origin allow-popups"
            onError={() => setIframeError(true)}
            className="proj-card__iframe"
          />
        ) : (
          <div className="proj-card__fallback">
            <span className="proj-card__fallback-text">
              {iframeError ? "PREVIEW RESTRICTED" : "LOADING"}
            </span>
            {/* Decorative scanlines */}
            <div className="proj-card__scanlines" />
          </div>
        )}
        {/* Overlay gradient */}
        <div className="proj-card__overlay" />
      </div>

      {/* Info strip */}
      <div className="proj-card__meta">
        <div className="proj-card__meta-left">
          <span className="proj-card__tag">{project.tag}</span>
          <h4 className="proj-card__title">{titleText}</h4>
          <p className="proj-card__desc">{project.description}</p>
        </div>
        <a
          href={project.repoUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="proj-card__link"
        >
          <ExternalLink className="w-3.5 h-3.5" />
        </a>
      </div>
    </div>
  );
}

export default function ScrollProjectReel() {
  return (
    <div className="proj-reel">
      <div className="proj-reel__header">
        <span className="tag-label">Live Deployments</span>
        <h3 className="display-heading display-lg">
          INTER&shy;ACTIVE<br />WORK
        </h3>
      </div>

      <div className="proj-reel__grid">
        {PROJECTS.map((project, i) => (
          <ReelCard key={project.title} project={project} index={i} />
        ))}
      </div>
    </div>
  );
}
