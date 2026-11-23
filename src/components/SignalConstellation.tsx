import {
  type CSSProperties,
  type RefObject,
  useCallback,
  useEffect,
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
  Sparkles,
} from "lucide-react";


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
    title: "First-in-history AI literacy work with real deployment.",
    summary:
      "Programs, partnerships, and tools that moved young people from AI awareness to real building, including bots, agents, apps, prompts, credentials, and deployed projects.",
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
      "Turns AI literacy into projects students can actually build and launch.",
      "Built for schools, nonprofits, teams, and public-facing programs.",
      "Scaled through partnerships, repeatable curriculum, and production systems.",
    ],
  },
  {
    id: "systems",
    orbit: "Execution",
    label: "Systems",
    title: "Software that teams depend on once it ships.",
    summary:
      "From internal tools to full platforms, the goal is the same: replace fragile manual workflows with systems that keep running.",
    accent: "206 92% 60%",
    accentHex: "#3b9ef5",
    accentHexFade: "#93cefb",
    angle: -8,
    radius: 33,
    icon: Cpu,
    metrics: [
      { value: "50+", label: "Shipped builds and client systems" },
      { value: "End-to-end", label: "Product, code, design, launch" },
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
    title: "Interfaces people remember after they close the tab.",
    summary:
      "Design here isn't decoration. Motion, typography, and structure exist to make complicated software feel obvious.",
    accent: "26 94% 60%",
    accentHex: "#f77025",
    accentHexFade: "#fbb07a",
    angle: 58,
    radius: 34,
    icon: Monitor,
    metrics: [
      { value: "3.5M+", label: "Lines of production code shipped" },
    ],
    highlights: [
      "First screens designed like posters, not stock SaaS pages.",
      "Motion used to guide attention, never for decoration.",
      "Every section has one clear job or it gets cut.",
    ],
  },
  {
    id: "labs",
    orbit: "R&D",
    label: "Labs",
    title: "Experiments that turn into reusable building blocks.",
    summary:
      "Generative tools, visual engines, and early prototypes feed straight back into the production work instead of sitting unused.",
    accent: "281 82% 68%",
    accentHex: "#b96eef",
    accentHexFade: "#dab3f8",
    angle: 128,
    radius: 28,
    icon: Atom,
    metrics: [
      { value: "Weekly", label: "New prototypes built" },
    ],
    highlights: [
      "Experiments are treated as a pipeline, not a hobby.",
      "New interactions stay grounded in real product needs.",
      "Exploration widens what production work can do.",
    ],
  },
  {
    id: "partnerships",
    orbit: "Reach",
    label: "Partnerships",
    title: "Working across institutions, brands, and communities.",
    summary:
      "The work ships where software meets real distribution: schools, clubs, protocols, Fortune 500 partners, and organizations with genuine reach.",
    accent: "352 88% 64%",
    accentHex: "#f05070",
    accentHexFade: "#f9a0b0",
    angle: 192,
    radius: 36,
    icon: Globe,
    metrics: [
      { value: "5", label: "Fortune 500 companies" },
    ],
    highlights: [
      "Technical work explained so non-technical partners can act on it.",
      "Systems built for trust and longevity, not novelty.",
      "Connects good product work to real distribution.",
    ],
  },
];

/* ─────────────────────────────────────────────────────────────
   Helpers
───────────────────────────────────────────────────────────── */

/* Pulse styles: each route gets its own path bend, comet length, speed and direction */
const PULSE_VARIANTS = [
  { bend: 0,    dash: 6,  dur: 2.6, dir: "out" },
  { bend: 0.22, dash: 2,  dur: 3.4, dir: "back" },
  { bend: -0.3, dash: 10, dur: 4.2, dir: "out" },
  { bend: 0.4,  dash: 3,  dur: 5.1, dir: "both" },
] as const;

function PulseNetwork({ stageRef }: { stageRef: RefObject<HTMLDivElement | null> }) {
  const [size, setSize] = useState({ w: 0, h: 0 });
  useEffect(() => {
    const el = stageRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => {
      const { width, height } = e.contentRect;
      setSize((s) => (Math.abs(s.w - width) < 1 && Math.abs(s.h - height) < 1 ? s : { w: width, h: height }));
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [stageRef]);
  if (!size.w) return null;
  const cx = size.w / 2, cy = size.h / 2;
  return (
    <svg className="sc-pulses" width={size.w} height={size.h} viewBox={`0 0 ${size.w} ${size.h}`} aria-hidden>
      {CONSTELLATION_NODES.map((node, i) => {
        const rad = (node.angle * Math.PI) / 180;
        const x = (50 + Math.cos(rad) * node.radius) / 100 * size.w;
        const y = (50 + Math.sin(rad) * node.radius) / 100 * size.h;
        const dx = x - cx, dy = y - cy;
        const len = Math.hypot(dx, dy) || 1;
        const nx = -dy / len, ny = dx / len;
        return (
          <g key={node.id} style={{ "--node-accent": node.accent } as CSSProperties}>
            <path className="sc-pulses__rail" d={`M${cx},${cy} L${x},${y}`} />
            {PULSE_VARIANTS.map((v, k) => {
              const b = v.bend * len * (i % 2 ? -1 : 1);
              const d = `M${cx},${cy} Q${cx + dx / 2 + nx * b},${cy + dy / 2 + ny * b} ${x},${y}`;
              return (
                <path
                  key={k}
                  d={d}
                  pathLength={100}
                  className={`sc-pulses__beam sc-pulses__beam--${v.dir}`}
                  style={{
                    strokeDasharray: `${v.dash} ${100 - v.dash}`,
                    animationDuration: `${v.dur + i * 0.37}s`,
                    animationDelay: `${-(i * 0.9 + k * 1.7)}s`,
                    strokeWidth: v.dash > 6 ? 1.2 : 2.2,
                  }}
                />
              );
            })}
          </g>
        );
      })}
    </svg>
  );
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

        <PulseNetwork stageRef={stageRef} />

        {CONSTELLATION_NODES.map((node, i) => {
          const rad   = (node.angle * Math.PI) / 180;
          const left  = 50 + Math.cos(rad) * node.radius;
          const top   = 50 + Math.sin(rad) * node.radius;
          const isActive = node.id === activeId;
          const NodeIcon = node.icon;
          const ring = `${node.label.toUpperCase()} · ${node.orbit.toUpperCase()} · `;
          return (
            <button
              key={node.id}
              type="button"
              className={`sc-orb ${isActive ? "sc-orb--active" : ""}`}
              style={{ "--node-accent": node.accent, left: `${left}%`, top: `${top}%`, animationDelay: `${i * -1.3}s` } as CSSProperties}
              onMouseEnter={() => handleActivate(node.id)}
              onFocus={() => handleActivate(node.id)}
              onClick={() => handleActivate(node.id)}
              aria-pressed={isActive}
              aria-label={node.label}
            >
              <span className="sc-orb__halo" aria-hidden />
              <svg className="sc-orb__print" viewBox="0 0 120 120" aria-hidden>
                <defs>
                  <path id={`orb-ring-${node.id}`} d="M60,60 m-50,0 a50,50 0 1,1 100,0 a50,50 0 1,1 -100,0" />
                </defs>
                <text><textPath href={`#orb-ring-${node.id}`} textLength="310" lengthAdjust="spacing">{ring.length < 22 ? ring + ring + ring : ring + ring}</textPath></text>
              </svg>
              <span className="sc-orb__sphere" aria-hidden>
                <NodeIcon className="sc-orb__icon" />
              </span>
              <span className="sc-orb__label">{node.label}</span>
            </button>
          );
        })}

        <div className="sc-core" ref={coreRef}>
          <div className="sc-core__name">Alex Leschik</div>
          <p className="sc-core__tagline">
            Strategy · Software<br />Design · Storytelling
          </p>
        </div>
      </div>

      {/* ── Detail panel ─────────────────────────────────────── */}
      <div className="signal-constellation__detail">

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
                Explore this track
                <ArrowUpRight className="h-3 w-3" />
              </button>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
