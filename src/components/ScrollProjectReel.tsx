import { useEffect, useRef, useState, useCallback } from "react";
import { ExternalLink } from "lucide-react";

interface Project {
  title: string;
  description: string;
  url: string;
  tag: string;
  type: "iframe" | "link";
  stats?: { num: string; label: string }[];
}

const PROJECTS: Project[] = [
  {
    title: "PARKPULSE",
    url: "https://national-park-service.lovable.app",
    type: "iframe",
    description: "Live explorer guide for national parks with real-time data.",
    tag: "exploration · live-data",
    stats: [{ num: "43K+", label: "Parks" }, { num: "Real-time", label: "Updates" }],
  },
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
    stats: [{ num: "10K+", label: "Cases" }, { num: "Legal", label: "Precedent" }],
  },
  {
    title: "CANVASFORGE",
    url: "https://phengine.lovable.app",
    type: "iframe",
    description: "P5.js creative engine for generative art and visualizations.",
    tag: "creative · generative",
    stats: [{ num: "60fps", label: "Performance" }, { num: "Infinite", label: "Possibilities" }],
  },
  {
    title: "TALENTFLOW",
    url: "https://hractions.lovable.app",
    type: "iframe",
    description: "Seamless onboarding and talent pipeline management.",
    tag: "hr-tech · automation",
    stats: [{ num: "80%", label: "Faster Hire" }, { num: "Real-time", label: "Pipeline" }],
  },
  {
    title: "WORLDFORGE AI",
    url: "https://prompt-a-planet-forge.lovable.app",
    type: "iframe",
    description: "Build entire worlds with AI — concept to environment.",
    tag: "ai · world-building",
    stats: [{ num: "Infinite", label: "Worlds" }, { num: "AI-Powered", label: "Creation" }],
  },
  {
    title: "SPARKLAB AI",
    url: "https://prompt-spark-playground.lovable.app",
    type: "iframe",
    description: "Creative lab for experimenting with AI prompts.",
    tag: "ai · experimentation",
    stats: [{ num: "100K+", label: "Experiments" }, { num: "No-Code", label: "Interface" }],
  },
  {
    title: "CURATEPRO",
    url: "https://chetbeencool.lovable.app",
    type: "iframe",
    description: "Portfolio platform for artists — curate, showcase, sell.",
    tag: "creator-economy · portfolio",
    stats: [{ num: "5K+", label: "Artists" }, { num: "$2M+", label: "Sales" }],
  },
  {
    title: "STEMSCORE",
    url: "https://stemjudges.lovable.app",
    type: "iframe",
    description: "Competition management for STEM judges.",
    tag: "education · competition",
    stats: [{ num: "500+", label: "Events" }, { num: "50K+", label: "Competitors" }],
  },
  {
    title: "ZENTYPE",
    url: "https://terminalz.lovable.app",
    type: "iframe",
    description: "Terminal-style writing with zen-like simplicity.",
    tag: "productivity · minimalist",
    stats: [{ num: "10K+", label: "Letters" }, { num: "Distraction-free", label: "Design" }],
  },
  {
    title: "INSPIRELENS",
    url: "https://brooks-showcase-studio.lovable.app",
    type: "iframe",
    description: "Capture, curate, and share visual moments that matter.",
    tag: "visual-inspiration · media",
    stats: [{ num: "1M+", label: "Moments" }, { num: "Real-time", label: "Sharing" }],
  },
  {
    title: "GRAVITYGRID",
    url: "https://spacetime-sculptor.lovable.app",
    type: "iframe",
    description: "Physics simulation — gravity, spacetime, and dynamics.",
    tag: "simulation · physics",
    stats: [{ num: "60fps", label: "Rendering" }, { num: "Einstein", label: "Approved" }],
  },
  {
    title: "ANIMATIC PRO",
    url: "https://toontool.lovable.app",
    type: "iframe",
    description: "Animation and toon-rendering suite for professionals.",
    tag: "animation · professional",
    stats: [{ num: "24fps+", label: "Smooth" }, { num: "Pro-Grade", label: "Tools" }],
  },
  {
    title: "CHRONOSLIFE",
    url: "https://birth-spark.lovable.app/",
    type: "iframe",
    description: "See your life through the lens of time and moments.",
    tag: "data-visualization · personal",
    stats: [{ num: "Lifetime", label: "Data" }, { num: "Chronological", label: "Beauty" }],
  },
  {
    title: "MEDCODE",
    url: "https://zenmedcode.vercel.app",
    type: "iframe",
    description: "Advanced medical coding — intelligent code lookup.",
    tag: "healthcare · coding",
    stats: [{ num: "10K+", label: "Codes" }, { num: "ICD-10", label: "Compliant" }],
  },
  {
    title: "DEADLINEDASH",
    url: "https://decent-ducks-countdown-15.lovable.app",
    type: "iframe",
    description: "Urgency-driven countdown timer — deadlines into momentum.",
    tag: "productivity · gamified",
    stats: [{ num: "1M+", label: "Countdowns" }, { num: "Zero", label: "Procrastination" }],
  },
  {
    title: "BAKERSPOT",
    url: "https://popuppastries.lovable.app",
    type: "iframe",
    description: "Pop-up pastry marketplace — artisanal baked goods.",
    tag: "commerce · local",
    stats: [{ num: "200+", label: "Bakeries" }, { num: "$500K", label: "Revenue" }],
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

function ReelCard({ item, index }: { item: Project; index: number }) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  const [mountIframe, setMountIframe] = useState(false);
  const [titleText, setTitleText] = useState(item.title);
  const [iframeLoaded, setIframeLoaded] = useState(false);
  const [iframeError, setIframeError] = useState(false);
  const scrambleRef = useRef<ReturnType<typeof setInterval>>();
  const side = index % 2 === 0 ? "left" : "right";

  useEffect(() => {
    const el = cardRef.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => setVisible(entry.isIntersecting),
      { rootMargin: "50px 0px", threshold: 0.1 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    const el = cardRef.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => setMountIframe(entry.isIntersecting),
      { rootMargin: "140px 0px", threshold: 0 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    if (!mountIframe) {
      setIframeLoaded(false);
    }
  }, [mountIframe]);

  useEffect(() => {
    if (!visible) return;
    let frame = 0;
    const total = 18;
    scrambleRef.current = setInterval(() => {
      frame++;
      const progress = frame / total;
      setTitleText(scrambleText(item.title, progress));
      if (frame >= total) {
        setTitleText(item.title);
        clearInterval(scrambleRef.current);
      }
    }, 40);
    return () => {
      if (scrambleRef.current) clearInterval(scrambleRef.current);
    };
  }, [visible, item.title]);

  const handleIframeError = useCallback(() => setIframeError(true), []);

  const isIframe = item.type === "iframe";

  return (
    <div
      ref={cardRef}
      className={`proj-card proj-card--${side} ${visible ? "proj-card--visible" : ""}`}
    >
      <div className="proj-card__embed">
        {isIframe && !iframeError ? (
          <>
            {!iframeLoaded && (
              <div className="proj-card__fallback">
                <div className="proj-card__fallback-text">loading&hellip;</div>
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
        <a
          href={item.url}
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
        <span className="tag-label">17 Deployed Products</span>
        <h3 className="display-heading display-lg">
          LIVE&shy;BUILDS
        </h3>
      </div>

      <div className="proj-reel__grid">
        {PROJECTS.map((item, i) => (
          <ReelCard key={item.title} item={item} index={i} />
        ))}
      </div>
    </div>
  );
}
