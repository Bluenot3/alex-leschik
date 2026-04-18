import {
  type CSSProperties,
  type RefObject,
  useCallback,
  useMemo,
  useRef,
  useState,
} from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowUpRight,
  Atom,
  BookOpen,
  Cpu,
  Globe,
  Monitor,
  Orbit,
  Radar,
  Sparkles,
} from "lucide-react";
import { AnimatedBeam } from "@/components/AnimatedBeam";

/* ─────────────────────────────────────────────────────────────
   Data
───────────────────────────────────────────────────────────── */

interface ConstellationNode {
  id: string;
  orbit: string;
  label: string;
  title: string;
  summary: string;
  accent: string;          // HSL string e.g. "128 80% 56%"
  accentHex: string;       // Hex for SVG gradients
  accentHexFade: string;   // Lighter / faded hex for gradient stop
  angle: number;
  radius: number;
  icon: React.FC<{ className?: string }>;
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
    accentHex: "#3dd65c",
    accentHexFade: "#8ef5a3",
    angle: -68,
    radius: 33,
    icon: BookOpen,
    metrics: [
      { value: "1st", label: "Youth AI literacy program in US history" },
      { value: "30K", label: "Boys & Girls Clubs national members" },
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
    accentHex: "#3b9ef5",
    accentHexFade: "#93cefb",
    angle: -8,
    radius: 39,
    icon: Cpu,
    metrics: [
      { value: "50+", label: "Shipped builds and client systems" },
      { value: "360°", label: "Product, code, narrative, launch" },
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
    accentHex: "#f77025",
    accentHexFade: "#fbb07a",
    angle: 58,
    radius: 34,
    icon: Monitor,
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
    accentHex: "#b96eef",
    accentHexFade: "#dab3f8",
    angle: 128,
    radius: 28,
    icon: Atom,
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
    accentHex: "#f05070",
    accentHexFade: "#f9a0b0",
    angle: 192,
    radius: 36,
    icon: Globe,
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

/* ─────────────────────────────────────────────────────────────
   Helpers
───────────────────────────────────────────────────────────── */

/** Convert a mutable element ref-array entry into a RefObject for AnimatedBeam */
function makeRefObj(
  arr: React.MutableRefObject<(HTMLDivElement | null)[]>,
  index: number
): RefObject<HTMLDivElement | null> {
  return {
    get current() {
      return arr.current[index];
    },
  } as RefObject<HTMLDivElement | null>;
}

/* ─────────────────────────────────────────────────────────────
   Component
───────────────────────────────────────────────────────────── */

interface SignalConstellationProps {
  onExploreWork?: () => void;
}

export default function SignalConstellation({ onExploreWork }: SignalConstellationProps) {
  const [activeId, setActiveId] = useState(CONSTELLATION_NODES[0].id);

  // Refs for beam anchors
  const stageRef = useRef<HTMLDivElement>(null);
  const coreRef  = useRef<HTMLDivElement>(null);
  const nodeRefs = useRef<(HTMLDivElement | null)[]>(
    Array(CONSTELLATION_NODES.length).fill(null)
  );

  // Pre-build RefObject wrappers (stable, no hooks in loops)
  const nodeRefObjects = useMemo(
    () => CONSTELLATION_NODES.map((_, i) => makeRefObj(nodeRefs, i)),
    []
  );

  const activeNode = useMemo(
    () => CONSTELLATION_NODES.find((n) => n.id === activeId) ?? CONSTELLATION_NODES[0],
    [activeId]
  );

  const handleActivate = useCallback((id: string) => setActiveId(id), []);

  return (
    <div className="signal-constellation">

      {/* ── Stage (the orbit map) ─────────────────────────────── */}
      <div className="signal-constellation__stage" ref={stageRef}>

        {/* Concentric rings */}
        <div className="signal-constellation__rings" aria-hidden>
          <span /><span /><span />
        </div>

        {/* Animated beams – one per node, travelling core → node */}
        {CONSTELLATION_NODES.map((node, i) => (
          <AnimatedBeam
            key={node.id}
            containerRef={stageRef as RefObject<HTMLElement | null>}
            fromRef={coreRef as RefObject<HTMLElement | null>}
            toRef={nodeRefObjects[i] as RefObject<HTMLElement | null>}
            duration={3.2 + i * 0.45}
            delay={i * 0.55}
            gradientStartColor={node.accentHex}
            gradientStopColor={node.accentHexFade}
            pathColor="rgba(15,23,42,0.07)"
            pathWidth={1.5}
            curvature={0}
          />
        ))}

        {/* Node cards */}
        {CONSTELLATION_NODES.map((node, i) => {
          const rad   = (node.angle * Math.PI) / 180;
          const left  = 50 + Math.cos(rad) * node.radius;
          const top   = 50 + Math.sin(rad) * node.radius;
          const isActive = node.id === activeId;
          const NodeIcon = node.icon;

          return (
            <button
              key={node.id}
              type="button"
              ref={(el) => { nodeRefs.current[i] = el as HTMLDivElement | null; }}
              className={`sc-node ${isActive ? "sc-node--active" : ""}`}
              style={
                {
                  "--node-accent": node.accent,
                  "--node-hex": node.accentHex,
                  left: `${left}%`,
                  top: `${top}%`,
                } as CSSProperties
              }
              onMouseEnter={() => handleActivate(node.id)}
              onFocus={() => handleActivate(node.id)}
              onClick={() => handleActivate(node.id)}
              aria-pressed={isActive}
            >
              {/* Pulse ring */}
              <span className="sc-node__pulse" aria-hidden />

              {/* Card shell */}
              <div className="sc-node__card">

                {/* Top row: icon + orbit tag */}
                <div className="sc-node__header">
                  <span className="sc-node__icon-wrap">
                    <NodeIcon className="sc-node__icon" />
                  </span>
                  <span className="sc-node__orbit">{node.orbit}</span>
                </div>

                {/* Label */}
                <div className="sc-node__label">{node.label}</div>

                {/* Primary metric */}
                <div className="sc-node__metric">
                  <strong className="sc-node__metric-value">
                    {node.metrics[0].value}
                  </strong>
                  <span className="sc-node__metric-label">
                    {node.metrics[0].label.split(" ").slice(0, 3).join(" ")}
                  </span>
                </div>
              </div>
            </button>
          );
        })}

        {/* Core circle */}
        <div className="sc-core" ref={coreRef}>
          <div className="sc-core__badge">
            <Orbit className="h-3.5 w-3.5" />
            Core
          </div>
          <div className="sc-core__name">Alex Leschik</div>
          <p className="sc-core__tagline">
            Strategy · Software<br />Design · Storytelling
          </p>
        </div>
      </div>

      {/* ── Detail panel ─────────────────────────────────────── */}
      <div className="signal-constellation__detail">
        <div className="signal-constellation__detail-topline">
          <Radar className="h-4 w-4" />
          Active orbit
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={activeNode.id}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            className="signal-constellation__detail-body"
          >
            <div className="signal-constellation__detail-header">
              <span
                className="signal-constellation__detail-kicker"
                style={{ color: `hsl(${activeNode.accent})` }}
              >
                {activeNode.orbit}
              </span>
              <h3 className="signal-constellation__detail-title">
                {activeNode.title}
              </h3>
            </div>

            <p className="signal-constellation__detail-copy">
              {activeNode.summary}
            </p>

            <div className="signal-constellation__metric-grid">
              {activeNode.metrics.map((m) => (
                <div key={m.label} className="signal-constellation__metric">
                  <span
                    className="signal-constellation__metric-value"
                    style={{ color: `hsl(${activeNode.accent})` }}
                  >
                    {m.value}
                  </span>
                  <span className="signal-constellation__metric-label">
                    {m.label}
                  </span>
                </div>
              ))}
            </div>

            <div className="signal-constellation__highlights">
              {activeNode.highlights.map((h) => (
                <div key={h} className="signal-constellation__highlight">
                  <Sparkles className="h-3.5 w-3.5" />
                  <span>{h}</span>
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
