import { lazy, Suspense, useState, useEffect } from "react";
import { useScrollEngine } from "@/hooks/useScrollEngine";
import CubeScene from "@/components/CubeScene";
import InteractiveName from "@/components/InteractiveName";
import HUD from "@/components/HUD";
import HoloNav from "@/components/HoloNav";
import CommandDashboard from "@/components/CommandDashboard";
import ContactModal from "@/components/ContactModal";
import CrypticDivider from "@/components/CrypticDivider";
import CrypticBackground from "@/components/CrypticBackground";
import LazySection from "@/components/LazySection";
import SocialLinks from "@/components/SocialLinks";
import CipherSmokeCursor from "@/components/CipherSmokeCursor";
import BootSequence from "@/components/BootSequence";
import LiveMetricsTicker from "@/components/LiveMetricsTicker";
import ScrollSection, {
  RevealTag,
  RevealHeading,
  RevealBody,
  RevealLine,
  RevealStats,
  RevealCTA,
} from "@/components/ScrollSection";

const GlassCube = lazy(() => import("@/components/GlassCube"));
const GlassOrbit = lazy(() => import("@/components/GlassOrbit"));
const CubeRain = lazy(() => import("@/components/CubeRain"));
const AZ1Logo3D = lazy(() => import("@/components/AZ1Logo3D"));
const ScrollGallery = lazy(() => import("@/components/ScrollGallery"));
const MediaRoom = lazy(() => import("@/components/MediaRoom"));
const ImageVortex = lazy(() => import("@/components/ImageVortex"));
const GalleryShowcase = lazy(() => import("@/components/GalleryShowcase"));
const ProjectSpotlight = lazy(() => import("@/components/ProjectSpotlight"));
const SignalConstellation = lazy(() => import("@/components/SignalConstellation"));
const ImageTheater        = lazy(() => import("@/components/ImageTheater"));
const ArsenalShowcase     = lazy(() => import("@/components/ArsenalShowcase"));

const SECTION_COUNT = 6;

const HERO_SIGNALS = [
  { value: "1st", label: "Youth AI literacy program in US history" },
  { value: "50+", label: "Products, prototypes, and systems shipped" },
  { value: "5", label: "Fortune 500 relationships in orbit" },
];

const HERO_FEED = [
  "First youth AI literacy program in U.S. history",
  "50+ shipped products, prototypes, dashboards, and systems",
  "AI, automation, and Web3 infrastructure built for real users",
];

export default function Index() {
  const { smoothProgress, currentSection, cubeRotation, scrollToSection } =
    useScrollEngine(SECTION_COUNT);
  const [editMode, setEditMode] = useState(false);
  const [cmdOpen, setCmdOpen] = useState(false);
  const [contactOpen, setContactOpen] = useState(false);

  /* ── Magnetic cursor + spotlight for CTA buttons ─────────── */
  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      const btns = document.querySelectorAll<HTMLElement>(".cta-btn, .cta-btn-muted");
      btns.forEach(btn => {
        const r  = btn.getBoundingClientRect();
        // Spotlight
        btn.style.setProperty("--cx", `${((e.clientX - r.left) / r.width  * 100).toFixed(1)}%`);
        btn.style.setProperty("--cy", `${((e.clientY - r.top)  / r.height * 100).toFixed(1)}%`);
        // Magnetic pull
        const cx   = r.left + r.width  / 2;
        const cy   = r.top  + r.height / 2;
        const dx   = e.clientX - cx;
        const dy   = e.clientY - cy;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const radius = 100;
        if (dist < radius) {
          const t = (1 - dist / radius) * 0.28;
          btn.style.setProperty("--mx", `${(dx * t).toFixed(2)}px`);
          btn.style.setProperty("--my", `${(dy * t).toFixed(2)}px`);
        } else {
          btn.style.setProperty("--mx", "0px");
          btn.style.setProperty("--my", "0px");
        }
      });
    };
    window.addEventListener("mousemove", onMove, { passive: true });
    return () => window.removeEventListener("mousemove", onMove);
  }, []);

  return (
    <div className="relative portfolio-shell">
      <h1 className="sr-only">Alex Leschik — Founder of ZEN AI Co. Creator of the first youth AI literacy program in U.S. history.</h1>

      {/* Boot terminal overlay — first visit only */}
      <BootSequence />

      {/* Viewport corner indicators */}
      <div className="viewport-corners" aria-hidden="true">
        <div className="vc vc--tl" />
        <div className="vc vc--tr" />
        <div className="vc vc--bl" />
        <div className="vc vc--br" />
      </div>

      <CipherSmokeCursor variant="pearl" intensity="cinematic" />
      <CubeScene rotation={cubeRotation} editMode={editMode} shifted={smoothProgress > 0.05} />
      <InteractiveName scrollProgress={smoothProgress} />

      <Suspense fallback={null}>
        <ImageVortex progress={smoothProgress} />
      </Suspense>

      <HUD
        progress={smoothProgress}
        currentSection={currentSection}
        onDotClick={scrollToSection}
        editMode={editMode}
        onToggleEdit={() => setEditMode((value) => !value)}
        onOpenCmd={() => setCmdOpen(true)}
      />

      <CommandDashboard open={cmdOpen} onClose={() => setCmdOpen(false)} />
      {contactOpen && <ContactModal onClose={() => setContactOpen(false)} />}
      <HoloNav onNavigate={scrollToSection} />

      <div className="relative z-[1]">
        <section id="s0" data-scroll-section className="hero-poster">
          <CrypticBackground rows={12} speed={180} opacity={0.07} />

          <div className="hero-poster__content">
            <div className="hero-poster__eyebrow">Alex Leschik // systems, software, education, creative technology</div>

            <div className="hero-poster__headline-block">
              <p className="hero-poster__lead">Software architect. Founder. Builder of products that become infrastructure.</p>
              <h2 className="hero-poster__title display-heading">
                BUILT THE FIRST
                <br />
                YOUTH AI LITERACY
                <br />
                PROGRAM IN U.S. HISTORY
              </h2>
            </div>

            <p className="hero-poster__body">
              I turn early ideas into deployed systems that students, institutions, teams, and communities can actually use,
              from AI literacy programs to agentic apps, automation, dashboards, and credentials.
            </p>

            <div className="hero-poster__actions">
              <button type="button" className="cta-btn" onClick={() => scrollToSection(3)}>
                Explore the work
              </button>
              <button type="button" className="cta-btn-muted" onClick={() => scrollToSection(2)}>
                Map the system
              </button>
            </div>

            <div className="hero-poster__signal-grid">
              {HERO_SIGNALS.map((signal) => (
                <div key={signal.label} className="hero-poster__signal">
                  <span className="hero-poster__signal-value">{signal.value}</span>
                  <span className="hero-poster__signal-label">{signal.label}</span>
                </div>
              ))}
            </div>
          </div>

          <aside className="hero-poster__transmission" aria-label="Current transmission">
            <div className="hero-poster__transmission-head">
              <span className="hero-poster__transmission-label">Transmission</span>
              <span className="hero-poster__transmission-live">Live</span>
            </div>

            <div className="hero-poster__transmission-grid">
              {HERO_FEED.map((item, index) => (
                <div key={item} className="hero-poster__transmission-item">
                  <span className="hero-poster__transmission-index">{String(index + 1).padStart(2, "0")}</span>
                  <p>{item}</p>
                </div>
              ))}
            </div>
          </aside>
        </section>

        <CrypticDivider lines={4} label="// origin locked" />

        <SocialLinks />

        <CrypticDivider lines={3} label="// network mapped" />

        <div className="relative">
          <CrypticBackground rows={10} speed={112} opacity={0.05} />
          <ScrollSection index={1} align="right" ghost="SIGNAL">
            <RevealLine />
            <RevealTag>01 - Signal</RevealTag>
            <RevealHeading>
              NOT CONTENT
              <br />
              REAL
              <br />
              SYSTEMS
            </RevealHeading>
            <RevealBody>
              The point is durable leverage. Historic AI literacy work, institutional partnerships, and product systems that
              can survive real use, real teams, and real scale.
            </RevealBody>
            <RevealStats
              stats={[
                { num: "1st", label: "Historic education milestone" },
                { num: "30K", label: "National members" },
                { num: "Multi", label: "Industries crossed" },
              ]}
            />
            <RevealCTA onClick={() => scrollToSection(2)}>Trace the orbit</RevealCTA>
          </ScrollSection>
        </div>

        <CrypticDivider lines={3} label="// mapping vectors" />

        <section id="s2" data-scroll-section className="constellation-section">
          <CrypticBackground rows={12} speed={138} opacity={0.06} />

          <div className="constellation-section__header">
            <span className="tag-label">02 - Constellation</span>
            <h2 className="constellation-section__title display-heading">
              THE WORK
              <br />
              HAS A STRUCTURE
            </h2>
            <p className="constellation-section__body">
              The portfolio is organized by what actually shipped: public impact, execution, interfaces, labs, partnerships,
              and systems that connect education, automation, and AI deployment.
            </p>
          </div>

          <Suspense fallback={<div style={{ minHeight: "400px" }} />}>
            <SignalConstellation onExploreWork={() => scrollToSection(3)} />
          </Suspense>
        </section>

        <CrypticDivider lines={5} label="// deploying flagships" />

        <div className="relative">
          <CrypticBackground rows={10} speed={118} opacity={0.05} />
          <ScrollSection index={3} ghost="WORK">
            <RevealLine />
            <RevealTag>03 - Work</RevealTag>
            <RevealHeading>
              PRODUCTS
              <br />
              WITH
              <br />
              GRAVITY
            </RevealHeading>
            <RevealBody>
              This is the proof layer: 50+ shipped projects, AI literacy infrastructure, production dashboards, generative
              tools, automation systems, and experiments that became real products.
            </RevealBody>
            <RevealStats
              stats={[
                { num: "50+", label: "Projects shipped" },
                { num: "5", label: "Fortune 500 ties" },
                { num: "24/7", label: "Prototype cadence" },
              ]}
            />
            <RevealCTA onClick={() => scrollToSection(4)}>Open the archive</RevealCTA>
          </ScrollSection>
        </div>

        <LazySection className="relative" rootMargin="400px 0px">
          <CrypticBackground rows={15} speed={120} opacity={0.06} className="spotlight-bg" />
          <Suspense fallback={<div style={{ minHeight: "80vh" }} />}>
            <ProjectSpotlight editMode={editMode} />
          </Suspense>
        </LazySection>

        <CrypticDivider lines={4} label="// as seen on" />

        <LazySection className="relative" rootMargin="2500px 0px">
          <CrypticBackground rows={8} speed={140} opacity={0.04} />
          <Suspense fallback={<div style={{ minHeight: "500px" }} />}>
            <MediaRoom />
          </Suspense>
        </LazySection>

        <CrypticDivider lines={4} label="// visual archive" />

        <div className="relative">
          <CrypticBackground rows={8} speed={130} opacity={0.04} />
          <Suspense fallback={<div style={{ minHeight: "640px" }} />}>
            <ImageTheater />
          </Suspense>
        </div>

        <CrypticDivider lines={3} label="// arsenal.world" />

        <LazySection className="relative" rootMargin="400px 0px">
          <CrypticBackground rows={10} speed={115} opacity={0.05} />
          <Suspense fallback={<div style={{ minHeight: "680px" }} />}>
            <ArsenalShowcase />
          </Suspense>
        </LazySection>

        <CrypticDivider lines={5} label="// opening the lab" />

        <div className="relative">
          <CrypticBackground rows={10} speed={142} opacity={0.05} />
          <ScrollSection index={4} align="right" ghost="LAB">
            <RevealLine />
            <RevealTag>04 - Lab</RevealTag>
            <RevealHeading>
              ARTIFACTS,
              <br />
              ENGINES,
              <br />
              SIGNAL
            </RevealHeading>
            <RevealBody>
              Beyond client-facing builds, the lab captures motion studies, media systems, archives, and visual experiments
              that keep the production work from ever looking interchangeable.
            </RevealBody>
            <RevealCTA onClick={() => scrollToSection(5)}>Start a conversation</RevealCTA>
          </ScrollSection>
        </div>

        <LazySection className="relative z-[1] py-16 px-6 md:px-12 lg:px-20">
          <Suspense fallback={<div style={{ minHeight: "400px" }} />}>
            <GalleryShowcase />
          </Suspense>
        </LazySection>

        <section className="artifact-lab">
          <div className="artifact-lab__grid">
            <div className="artifact-lab__item artifact-lab__item--wide">
              <div className="artifact-lab__label">Glass system · orbital field</div>
              <LazySection className="relative z-[1]">
                <Suspense fallback={<div style={{ minHeight: "520px" }} />}>
                  <GlassOrbit />
                </Suspense>
              </LazySection>
            </div>

            <div className="artifact-lab__item artifact-lab__item--narrow artifact-lab__item--centered">
              <div className="artifact-lab__label">Glass artifact · v2</div>
              <LazySection className="relative z-[1] flex items-center justify-center py-12">
                <Suspense fallback={<div style={{ minHeight: "300px" }} />}>
                  <GlassCube />
                </Suspense>
              </LazySection>
            </div>

            <div className="artifact-lab__item artifact-lab__item--narrow">
              <div className="artifact-lab__label">Identity object</div>
              <LazySection className="relative z-[1] px-6 md:px-12 lg:px-20">
                <Suspense fallback={<div style={{ minHeight: "300px" }} />}>
                  <AZ1Logo3D progress={Math.max(0, (smoothProgress - 0.45) / 0.2)} />
                </Suspense>
              </LazySection>
            </div>

            <div className="artifact-lab__item artifact-lab__item--wide">
              <div className="artifact-lab__label">Generative field</div>
              <LazySection className="relative z-[1]">
                <Suspense fallback={<div style={{ minHeight: "400px" }} />}>
                  <CubeRain />
                </Suspense>
              </LazySection>
            </div>

          </div>
        </section>

        <CrypticDivider lines={3} label="// visual field" />

        <div className="relative">
          <CrypticBackground rows={8} speed={125} opacity={0.04} />
          <Suspense fallback={<div style={{ minHeight: "640px" }} />}>
            <ScrollGallery />
          </Suspense>
        </div>

        <CrypticDivider lines={4} label="// opening channel" />

        <div className="relative">
          <CrypticBackground rows={10} speed={110} opacity={0.05} />
          <ScrollSection index={5} align="right" ghost="CONTACT">
            <RevealLine />
            <RevealTag>05 - Contact</RevealTag>
            <RevealHeading>
              BUILD THE
              <br />
              NEXT
              <br />
              IMPOSSIBLE THING
            </RevealHeading>
            <RevealBody>
              If the problem matters, the interface matters, and the system has to hold up after launch, we should talk.
            </RevealBody>

            <div
              data-reveal
              className="mt-7 flex items-center gap-3 justify-end"
              style={{
                opacity: 0,
                transform: "translateY(10px)",
                transition: "opacity 0.5s ease 0.35s, transform 0.5s ease 0.35s",
              }}
            >
              <button
                type="button"
                className="cta-btn"
                onClick={() => setContactOpen(true)}
              >
                Start the conversation
                <svg viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-3 h-3">
                  <path d="M1 6h10M6 1l5 5-5 5" />
                </svg>
              </button>
            </div>

            <div
              data-reveal
              className="mt-4 flex items-center gap-3 justify-end"
              style={{
                opacity: 0,
                transform: "translateY(10px)",
                transition: "opacity 0.5s ease 0.45s, transform 0.5s ease 0.45s",
              }}
            >
              <button onClick={() => scrollToSection(0)} className="cta-btn-muted">
                <svg viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-3 h-3">
                  <path d="M11 6H1M6 11L1 6l5-5" />
                </svg>
                Return to origin
              </button>
            </div>
          </ScrollSection>
        </div>
      </div>

      {/* Live technical metrics strip — fixed bottom */}
      <LiveMetricsTicker />
    </div>
  );
}
