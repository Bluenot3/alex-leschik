import { useEffect, useRef, useState, useCallback } from "react";
import { ExternalLink } from "lucide-react";

interface Project {
  title: string;
  description: string;
  repoUrl: string;
  embedUrl: string;
}

const PROJECTS: Project[] = [
  {
    title: "ROAM",
    description: "Explore the world through an interactive roaming experience.",
    repoUrl: "https://github.com/Bluenot3/ROAM",
    embedUrl: "https://bluenot3.github.io/ROAM/",
  },
  {
    title: "AI Literacy Constitution",
    description: "The foundational framework for youth AI literacy education.",
    repoUrl: "https://github.com/Bluenot3/AI-Literacy-Constitution",
    embedUrl: "https://bluenot3.github.io/AI-Literacy-Constitution/",
  },
  {
    title: "Agent Arena",
    description: "Template for building competitive AI agent environments.",
    repoUrl: "https://github.com/Bluenot3/AGENT-ARENA-TEMPLATE",
    embedUrl: "https://bluenot3.github.io/AGENT-ARENA-TEMPLATE/",
  },
  {
    title: "Popup Pastries",
    description: "A delightful popup pastry shop experience.",
    repoUrl: "https://github.com/Bluenot3/popuppastries",
    embedUrl: "https://bluenot3.github.io/popuppastries/",
  },
  {
    title: "Globe.gl",
    description: "Interactive 3D globe visualization powered by WebGL.",
    repoUrl: "https://github.com/Bluenot3/globe.gl",
    embedUrl: "https://bluenot3.github.io/globe.gl/",
  },
  {
    title: "Homeschool Kit",
    description: "Comprehensive toolkit for modern homeschool education.",
    repoUrl: "https://github.com/Bluenot3/homeschool-kit",
    embedUrl: "https://bluenot3.github.io/homeschool-kit/",
  },
  {
    title: "Vibe Book PM",
    description: "Project management with a creative, vibe-driven approach.",
    repoUrl: "https://github.com/Bluenot3/vibe-book-pm",
    embedUrl: "https://bluenot3.github.io/vibe-book-pm/",
  },
  {
    title: "V3",
    description: "Next-generation interface and interaction experiments.",
    repoUrl: "https://github.com/Bluenot3/V3",
    embedUrl: "https://bluenot3.github.io/V3/",
  },
  {
    title: "Fus3",
    description: "Fusion of creative coding and interactive design.",
    repoUrl: "https://github.com/Bluenot3/Fus3",
    embedUrl: "https://bluenot3.github.io/Fus3/",
  },
  {
    title: "Brooks Showcase Studio",
    description: "A premium showcase studio for creative portfolios.",
    repoUrl: "https://github.com/Bluenot3/brooks-showcase-studio",
    embedUrl: "https://bluenot3.github.io/brooks-showcase-studio/",
  },
];

function ReelCard({ project, index }: { project: Project; index: number }) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  const [shouldMount, setShouldMount] = useState(false);
  const [iframeError, setIframeError] = useState(false);
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
      className={`reel-card reel-card--${side} ${visible ? "reel-card--visible" : ""}`}
    >
      <div className="reel-card__label">
        <span className="reel-card__number">
          {String(index + 1).padStart(2, "0")}
        </span>
        <span className="reel-card__title">{project.title}</span>
      </div>

      <div className="reel-card__body">
        <div className="reel-card__embed">
          {shouldMount && !iframeError ? (
            <iframe
              src={project.embedUrl}
              title={project.title}
              loading="lazy"
              sandbox="allow-scripts allow-same-origin allow-popups"
              onError={() => setIframeError(true)}
              className="reel-card__iframe"
            />
          ) : (
            <div className="reel-card__fallback">
              <span className="font-mono text-[0.6rem] tracking-widest uppercase text-muted-foreground/50">
                {iframeError ? "Preview unavailable" : "Loading…"}
              </span>
            </div>
          )}
        </div>

        <div className="reel-card__info">
          <p className="reel-card__desc">{project.description}</p>
          <a
            href={project.repoUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="reel-card__link"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            View on GitHub
          </a>
        </div>
      </div>
    </div>
  );
}

export default function ScrollProjectReel() {
  return (
    <div className="scroll-reel">
      <div className="scroll-reel__header">
        <span className="tag-label">Live Projects & Embeds</span>
        <h3 className="display-heading display-lg">
          INTER&shy;ACTIVE<br />WORK
        </h3>
        <p className="body-muted" style={{ maxWidth: "36rem" }}>
          Scroll through live demos of real projects — each card is a window
          into a deployed application.
        </p>
      </div>

      {PROJECTS.map((project, i) => (
        <ReelCard key={project.title} project={project} index={i} />
      ))}
    </div>
  );
}
