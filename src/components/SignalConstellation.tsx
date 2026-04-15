import { useMemo, useState, type CSSProperties } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowUpRight, Orbit, Radar, Sparkles } from "lucide-react";

interface ConstellationNode {
  id: string;
  orbit: string;
  label: string;
  title: string;
  summary: string;
  accent: string;
  angle: number;
  radius: number;
  metrics: { value: string; label: string }[];
  highlights: string[];
}

const CONSTELLATION_NODES: ConstellationNode[] = [
  {
    id: "education",
    orbit: "Public Impact",
    label: "Education",
    title: "Historic work with real social surface area.",
    summary:
      "Programs, partnerships, and tools built to make AI legible to young people before the rest of the system catches up.",
    accent: "128 80% 56%",
    angle: -68,
    radius: 33,
    metrics: [
      { value: "1st", label: "Youth AI literacy program in US history" },
      { value: "4.7M+", label: "Boys & Girls Clubs youth network" },
    ],
    highlights: [
      "Turns abstract technology into curriculum, interfaces, and trust.",
      "Designed for institutions, not just demos.",
      "Built to scale through partnership rather than one-off launch energy.",
    ],
  },
  {
    id: "systems",
    orbit: "Execution",
    label: "Systems",
    title: "Products that act like infrastructure once they ship.",
    summary:
      "From internal tools to full platforms, the throughline is leverage: fewer fragile workflows, more durable operating systems.",
    accent: "206 92% 60%",
    angle: -8,
    radius: 39,
    metrics: [
      { value: "50+", label: "Shipped builds and client systems" },
      { value: "360", label: "Product, code, narrative, launch" },
    ],
    highlights: [
      "Architected for handoff, scale, and future iteration.",
      "Balances speed with long-term maintainability.",
      "Built with the assumption that success increases complexity.",
    ],
  },
  {
    id: "interfaces",
    orbit: "Experience",
    label: "Interfaces",
    title: "Visual systems with enough edge to stay in memory.",
    summary:
      "The interface work is not decoration. Motion, typography, and structure are used to make the underlying system feel inevitable.",
    accent: "26 94% 60%",
    angle: 58,
    radius: 34,
    metrics: [
      { value: "0", label: "Tolerance for generic card-grid design" },
      { value: "1", label: "Dominant visual thesis per screen" },
    ],
    highlights: [
      "Poster-like first screens instead of template SaaS framing.",
      "Motion is used for hierarchy and presence, not noise.",
      "Every section earns its place with one clear job.",
    ],
  },
  {
    id: "labs",
    orbit: "R&D",
    label: "Labs",
    title: "Experiments that become reusable building blocks later.",
    summary:
      "Generative tools, visual engines, and speculative builds feed the production work instead of living as disconnected side quests.",
    accent: "281 82% 68%",
    angle: 128,
    radius: 28,
    metrics: [
      { value: "24/7", label: "Prototype velocity" },
      { value: "Open", label: "Curiosity budget" },
    ],
    highlights: [
      "Treats experiments as a future infrastructure pipeline.",
      "Keeps novel interactions grounded in real product taste.",
      "Uses exploration to expand the production palette.",
    ],
  },
  {
    id: "partnerships",
    orbit: "Reach",
    label: "Partnerships",
    title: "Built to operate across institutions, brands, and culture.",
    summary:
      "The portfolio is strongest where software meets distribution: schools, clubs, protocols, creators, and organizations with actual reach.",
    accent: "352 88% 64%",
    angle: 192,
    radius: 36,
    metrics: [
      { value: "5", label: "Fortune 500 relationships" },
      { value: "Multi", label: "Institutional ecosystems served" },
    ],
    highlights: [
      "Technical work framed so non-technical partners can move with it.",
      "Systems designed for credibility, not just novelty.",
      "Bridges product craft with distribution logic.",
    ],
  },
];

interface SignalConstellationProps {
  onExploreWork?: () => void;
}

export default function SignalConstellation({ onExploreWork }: SignalConstellationProps) {
  const [activeId, setActiveId] = useState(CONSTELLATION_NODES[0].id);

  const activeNode = useMemo(
    () =>
      CONSTELLATION_NODES.find((node) => node.id === activeId) ?? CONSTELLATION_NODES[0],
    [activeId]
  );

  return (
    <div className="signal-constellation">
      <div className="signal-constellation__stage">
        <div className="signal-constellation__rings">
          <span />
          <span />
          <span />
        </div>

        {CONSTELLATION_NODES.map((node) => {
          const radians = (node.angle * Math.PI) / 180;
          const left = 50 + Math.cos(radians) * node.radius;
          const top = 50 + Math.sin(radians) * node.radius;
          const distance = Math.sqrt((left - 50) ** 2 + (top - 50) ** 2);
          const rotation = Math.atan2(top - 50, left - 50) * (180 / Math.PI);
          const style = {
            "--node-accent": node.accent,
            left: `${left}%`,
            top: `${top}%`,
          } as CSSProperties;

          return (
            <div key={node.id}>
              <span
                className={`signal-constellation__link ${
                  node.id === activeNode.id ? "signal-constellation__link--active" : ""
                }`}
                style={
                  {
                    width: `${distance}%`,
                    left: "50%",
                    top: "50%",
                    transform: `rotate(${rotation}deg)`,
                    "--node-accent": node.accent,
                  } as CSSProperties
                }
              />

              <button
                type="button"
                className={`signal-constellation__node ${
                  node.id === activeNode.id ? "signal-constellation__node--active" : ""
                }`}
                style={style}
                onMouseEnter={() => setActiveId(node.id)}
                onFocus={() => setActiveId(node.id)}
                onClick={() => setActiveId(node.id)}
                aria-pressed={node.id === activeNode.id}
              >
                <span className="signal-constellation__node-pulse" />
                <span className="signal-constellation__node-shell">
                  <span className="signal-constellation__node-orbit">{node.orbit}</span>
                  <span className="signal-constellation__node-label">{node.label}</span>
                </span>
              </button>
            </div>
          );
        })}

        <div className="signal-constellation__core">
          <div className="signal-constellation__core-badge">
            <Orbit className="h-4 w-4" />
            Core
          </div>
          <div className="signal-constellation__core-title">Alex Leschik</div>
          <p className="signal-constellation__core-copy">
            Strategy, software, design, storytelling.
          </p>
        </div>
      </div>

      <div className="signal-constellation__detail">
        <div className="signal-constellation__detail-topline">
          <Radar className="h-4 w-4" />
          Active orbit
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={activeNode.id}
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -18 }}
            transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
            className="signal-constellation__detail-body"
          >
            <div className="signal-constellation__detail-header">
              <span
                className="signal-constellation__detail-kicker"
                style={{ color: `hsl(${activeNode.accent})` }}
              >
                {activeNode.orbit}
              </span>
              <h3 className="signal-constellation__detail-title">{activeNode.title}</h3>
            </div>

            <p className="signal-constellation__detail-copy">{activeNode.summary}</p>

            <div className="signal-constellation__metric-grid">
              {activeNode.metrics.map((metric) => (
                <div key={metric.label} className="signal-constellation__metric">
                  <span className="signal-constellation__metric-value">{metric.value}</span>
                  <span className="signal-constellation__metric-label">{metric.label}</span>
                </div>
              ))}
            </div>

            <div className="signal-constellation__highlights">
              {activeNode.highlights.map((highlight) => (
                <div key={highlight} className="signal-constellation__highlight">
                  <Sparkles className="h-3.5 w-3.5" />
                  <span>{highlight}</span>
                </div>
              ))}
            </div>

            <div className="signal-constellation__detail-actions">
              <button type="button" className="cta-btn" onClick={onExploreWork}>
                Explore selected orbit
                <ArrowUpRight className="h-3 w-3" />
              </button>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
