import { useEffect, useRef, useState } from "react";
import { ExternalLink } from "lucide-react";

import zenLedger from "@/assets/zen-ledger.jpg";
import zenPartnership from "@/assets/zen-partnership.jpg";
import zenInfrastructure from "@/assets/zen-infrastructure.jpg";
import zenOverview from "@/assets/zen-overview.jpg";
import zenPioneer from "@/assets/zen-pioneer.jpg";

interface Initiative {
  title: string;
  description: string;
  image: string;
  tag: string;
  stats?: { num: string; label: string }[];
  url?: string;
}

const INITIATIVES: Initiative[] = [
  {
    title: "NATIONAL AI LITERACY INFRASTRUCTURE",
    description:
      "Building the first youth AI literacy program in U.S. history. Full deployment across 42 states with 500K+ active users and 1,250+ operational nodes.",
    image: zenLedger,
    tag: "infrastructure · verified",
    stats: [
      { num: "42", label: "States" },
      { num: "500K+", label: "Users" },
      { num: "1.5M+", label: "Transactions" },
    ],
    url: "https://zenai.world",
  },
  {
    title: "BGCGW PARTNERSHIP",
    description:
      "3 years strong with Boys & Girls Clubs of Greater Washington. The AI Pioneer Program — first of its kind — now empowering the next generation nationwide.",
    image: zenPartnership,
    tag: "partnership · milestone",
    stats: [
      { num: "3", label: "Years" },
      { num: "1000+", label: "AI Bots" },
      { num: "3000+", label: "Students" },
    ],
  },
  {
    title: "AI OPPORTUNITY FRAMEWORK",
    description:
      "Infrastructure + Governance. From thermodynamic arbitrage to intelligence-first institutions — coordinating people, capital & compute for resilient workforce development.",
    image: zenInfrastructure,
    tag: "governance · systems",
  },
  {
    title: "ZEN AI ECOSYSTEM",
    description:
      "AI literacy for youth, smart business solutions, blockchain-secured credentials. Bridging the education gap with hands-on workshops, coding courses, and mentorship.",
    image: zenOverview,
    tag: "ecosystem · education",
    stats: [
      { num: "14", label: "Modules" },
      { num: "12", label: "Countries" },
      { num: "62%", label: "Employers Need AI" },
    ],
  },
  {
    title: "AI PIONEER PROGRAM",
    description:
      "8-week intensive: youth ages 13-17 launch fully functioning AI bots in four weeks. API management, real-world applications, ethical AI development — from foundations to deployment.",
    image: zenPioneer,
    tag: "program · pioneer",
    stats: [
      { num: "8", label: "Weeks" },
      { num: "4", label: "Wks to Launch" },
      { num: "∞", label: "Potential" },
    ],
    url: "https://zenai.biz",
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

function ReelCard({ item, index }: { item: Initiative; index: number }) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  const [titleText, setTitleText] = useState(item.title);
  const scrambleRef = useRef<ReturnType<typeof setInterval>>();
  const side = index % 2 === 0 ? "left" : "right";

  useEffect(() => {
    const el = cardRef.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        setVisible(entry.isIntersecting);
      },
      { rootMargin: "100px 0px", threshold: 0.15 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

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

  return (
    <div
      ref={cardRef}
      className={`proj-card proj-card--${side} ${visible ? "proj-card--visible" : ""}`}
    >
      <div className="proj-card__index">
        {String(index + 1).padStart(2, "0")}
      </div>

      <div className="proj-card__embed">
        <img
          src={item.image}
          alt={item.title}
          className="proj-card__image"
          loading="lazy"
        />
        <div className="proj-card__scanlines" />
        <div className="proj-card__overlay" />
      </div>

      <div className="proj-card__meta">
        <div className="proj-card__meta-left">
          <span className="proj-card__tag">{item.tag}</span>
          <h4 className="proj-card__title">{titleText}</h4>
          <p className="proj-card__desc">{item.description}</p>
          {item.stats && (
            <div className="proj-card__stats">
              {item.stats.map((s) => (
                <div key={s.label} className="proj-card__stat">
                  <span className="proj-card__stat-num">{s.num}</span>
                  <span className="proj-card__stat-label">{s.label}</span>
                </div>
              ))}
            </div>
          )}
        </div>
        {item.url && (
          <a
            href={item.url}
            target="_blank"
            rel="noopener noreferrer"
            className="proj-card__link"
          >
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        )}
      </div>
    </div>
  );
}

export default function ScrollProjectReel() {
  return (
    <div className="proj-reel">
      <div className="proj-reel__header">
        <span className="tag-label">ZEN AI Co. Initiatives</span>
        <h3 className="display-heading display-lg">
          THE&shy;WORK
        </h3>
      </div>

      <div className="proj-reel__grid">
        {INITIATIVES.map((item, i) => (
          <ReelCard key={item.title} item={item} index={i} />
        ))}
      </div>
    </div>
  );
}
