import { useState } from "react";
import { ExternalLink, Maximize2, Minimize2 } from "lucide-react";

interface Project {
  title: string;
  description: string;
  url: string;
  type: "iframe" | "video" | "link";
}

const PLACEHOLDER_PROJECTS: Project[] = [
  {
    title: "Bioluminescence Map",
    description: "Interactive global map of 43K+ bioluminescent organism sightings from GBIF and OBIS datasets.",
    url: "",
    type: "link",
  },
];

export default function ProjectShowcase() {
  const [expanded, setExpanded] = useState<string | null>(null);

  return (
    <div className="project-showcase">
      <div className="project-showcase-header">
        <span className="tag-label">Live Projects & Embeds</span>
        <h3 className="display-heading display-lg">
          INTER&shy;ACTIVE<br />WORK
        </h3>
        <p className="body-muted" style={{ maxWidth: "36rem" }}>
          Explore live demos, embedded applications, and interactive experiments.
          Each card is a window into a real project.
        </p>
      </div>

      <div className="project-grid">
        {PLACEHOLDER_PROJECTS.map((project) => (
          <div
            key={project.title}
            className={`project-card ${expanded === project.title ? "project-card-expanded" : ""}`}
          >
            <div className="project-card-header">
              <div>
                <h4 className="font-mono text-[0.65rem] tracking-[0.2em] uppercase text-foreground/80">
                  {project.title}
                </h4>
                <p className="text-[0.6rem] text-muted-foreground/60 mt-1 leading-relaxed max-w-[280px]">
                  {project.description}
                </p>
              </div>
              <div className="flex items-center gap-1.5">
                {project.url && (
                  <a
                    href={project.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="project-icon-btn"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                )}
                {project.type === "iframe" && (
                  <button
                    onClick={() => setExpanded(expanded === project.title ? null : project.title)}
                    className="project-icon-btn"
                  >
                    {expanded === project.title ? (
                      <Minimize2 className="w-3.5 h-3.5" />
                    ) : (
                      <Maximize2 className="w-3.5 h-3.5" />
                    )}
                  </button>
                )}
              </div>
            </div>

            {project.type === "iframe" && project.url && (
              <div className="project-embed-wrap">
                <iframe
                  src={project.url}
                  className="project-embed-iframe"
                  allow="autoplay; encrypted-media; fullscreen"
                  loading="lazy"
                  sandbox="allow-scripts allow-same-origin allow-popups"
                />
              </div>
            )}

            {project.type === "video" && project.url && (
              <div className="project-embed-wrap">
                <video
                  src={project.url}
                  controls
                  playsInline
                  preload="metadata"
                  className="project-embed-video"
                />
              </div>
            )}

            {project.type === "link" && !project.url && (
              <div className="project-placeholder">
                <span className="font-mono text-[0.5rem] tracking-widest uppercase text-muted-foreground/30">
                  Add projects via the Command Dashboard
                </span>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
