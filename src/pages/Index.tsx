import { lazy, Suspense, useState, useEffect } from "react";
import { useScrollEngine } from "@/hooks/useScrollEngine";
import CubeScene from "@/components/CubeScene";
import InteractiveName from "@/components/InteractiveName";
import HUD from "@/components/HUD";
import HoloNav from "@/components/HoloNav";
import ContactModal from "@/components/ContactModal";
import CrypticDivider from "@/components/CrypticDivider";
import CrypticBackground from "@/components/CrypticBackground";
import LazySection from "@/components/LazySection";
import SocialLinks from "@/components/SocialLinks";
import CipherSmokeCursor from "@/components/CipherSmokeCursor";
import BootSequence from "@/components/BootSequence";
import LiveMetricsTicker from "@/components/LiveMetricsTicker";
import ScrollProgress from "@/components/ScrollProgress";
import ModelSignatures from "@/components/ModelSignatures";
import SafeVisual from "@/components/SafeVisual";
import ScrollSection, {
  RevealTag,
  RevealHeading,
  RevealBody,
  RevealLine,
  RevealStats,
  RevealCTA,
} from "@/components/ScrollSection";

const loadGlassCube = () => import("@/components/GlassCube");
const loadGlassOrbit = () => import("@/components/GlassOrbit");
const loadCubeRain = () => import("@/components/CubeRain");
const loadAZ1Logo3D = () => import("@/components/AZ1Logo3D");
const loadScrollGallery = () => import("@/components/ScrollGallery");
const loadMediaRoom = () => import("@/components/MediaRoom");
const loadImageVortex = () => import("@/components/ImageVortex");
const loadGalleryShowcase = () => import("@/components/GalleryShowcase");
const loadProjectSpotlight = () => import("@/components/ProjectSpotlight");
const loadSignalConstellation = () => import("@/components/SignalConstellation");
const loadImageTheater = () => import("@/components/ImageTheater");
const loadArsenalShowcase = () => import("@/components/ArsenalShowcase");
const loadZenGenGallery = () => import("@/components/ZenGenGallery");

const GlassCube = lazy(loadGlassCube);
const GlassOrbit = lazy(loadGlassOrbit);
const CubeRain = lazy(loadCubeRain);
const AZ1Logo3D = lazy(loadAZ1Logo3D);
const ScrollGallery = lazy(loadScrollGallery);
const MediaRoom = lazy(loadMediaRoom);
const ImageVortex = lazy(loadImageVortex);
const GalleryShowcase = lazy(loadGalleryShowcase);
const ProjectSpotlight = lazy(loadProjectSpotlight);
const SignalConstellation = lazy(loadSignalConstellation);
const ImageTheater = lazy(loadImageTheater);
const ArsenalShowcase = lazy(loadArsenalShowcase);
const ZenGenGallery = lazy(loadZenGenGallery);

/* Ordered roughly by scroll position — prefetched during idle time after
   first paint so scrolling never hits a chunk-loading gap. */
const CHUNK_PRELOADERS = [
  loadImageVortex,
  loadSignalConstellation,
  loadProjectSpotlight,
  loadMediaRoom,
  loadImageTheater,
  loadArsenalShowcase,
  loadZenGenGallery,
  loadGalleryShowcase,
  loadGlassOrbit,
  loadGlassCube,
  loadAZ1Logo3D,
  loadCubeRain,
  loadScrollGallery,
];

const SECTION_COUNT = 6;

const HERO_SIGNALS = [
  { value: "1st", label: "Youth AI literacy program in U.S. history" },
  { value: "50+", label: "Products and systems shipped to production" },
  { value: "5", label: "Fortune 500 relationships in motion" },
];

const HERO_FEED = [
  "Founded the first youth AI literacy program in U.S. history",
  "50+ products, dashboards, and systems shipped and in use",
  "AI, automation, and Web3 infrastructure built for real institutions",
];

export default function Index() {
  const { smoothProgress, currentSection, cubeRotation, scrollToSection } =
    useScrollEngine(SECTION_COUNT);
  const [editMode, setEditMode] = useState(false);
  const [contactOpen, setContactOpen] = useState(false);

  /* ── Idle prefetch: warm every lazy chunk after first paint ── */
  useEffect(() => {
    let cancelled = false;
    let idleId: number | undefined;
    const ric: typeof requestIdleCallback =
      typeof requestIdleCallback === "function"
        ? requestIdleCallback
        : ((cb: IdleRequestCallback) =>
            window.setTimeout(() => cb({ didTimeout: true, timeRemaining: () => 0 } as IdleDeadline), 250)) as typeof requestIdleCallback;

    const queue = [...CHUNK_PRELOADERS];
    const pump = () => {
      if (cancelled || queue.length === 0) return;
      const next = queue.shift()!;
      next()
        .catch(() => {})
        .finally(() => {
          if (!cancelled) idleId = ric(pump, { timeout: 1500 }) as unknown as number;
        });
    };

    const start = () => {
      idleId = ric(pump, { timeout: 2000 }) as unknown as number;
    };

    if (document.readyState === "complete") start();
    else window.addEventListener("load", start, { once: true });

    return () => {
      cancelled = true;
      window.removeEventListener("load", start);
      if (idleId !== undefined && typeof cancelIdleCallback === "function") cancelIdleCallback(idleId);
    };
  }, []);

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
    <div className="relative portfolio-shell" data-sigil="ordo-ab-chao">
      <h1 className="sr-only">Alex Leschik — Founder of ZEN AI Co. Creator of the first youth AI literacy program in U.S. history.</h1>
      {/* As above, so below. — the structure is the message */}

      {/* Boot terminal overlay — first visit only */}
      <BootSequence />

      {/* Reading-position hairline */}
      <ScrollProgress />

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
      />

      {contactOpen && <ContactModal onClose={() => setContactOpen(false)} />}
      <HoloNav onNavigate={scrollToSection} />

      <div className="relative z-[1]">
        <section id="s0" data-scroll-section className="hero-poster">
          <CrypticBackground rows={12} speed={180} opacity={0.07} />

          <div className="hero-poster__content">
            <div className="hero-poster__eyebrow">
              Alex Leschik <span aria-hidden="true" title="ordo ab chao">△</span> systems · software · education · creative technology
            </div>

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
              I turn early ideas into deployed systems that students, institutions, and teams actually use — AI literacy
              programs, agentic applications, automation, dashboards, and credentialing infrastructure.
            </p>

            <div className="hero-poster__actions">
              <button type="button" className="cta-btn" onClick={() => scrollToSection(3)}>
                Explore the work
              </button>
              <button type="button" className="cta-btn-muted" onClick={() => scrollToSection(2)}>
                See the architecture
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
            <div className="hero-poster__transmission-head" data-marker="G">
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

        <CrypticDivider lines={4} label="// ordo ab chao" />

        <SocialLinks />

        <CrypticDivider lines={3} label="// as above, so below" />

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
              The point is durable leverage — historic AI literacy work, institutional partnerships, and product systems
              built to survive real users, real teams, and real scale.
            </RevealBody>
            <RevealStats
              stats={[
                { num: "1st", label: "Historic education milestone" },
                { num: "30K", label: "National members reached" },
                { num: "7", label: "Industries crossed" },
              ]}
            />
            <RevealCTA onClick={() => scrollToSection(2)}>Follow the thread</RevealCTA>
          </ScrollSection>
        </div>

        <CrypticDivider lines={3} label="// solve et coagula" />

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
              This portfolio is organized around what actually shipped: public impact, execution, interfaces, labs, and
              partnerships — the connective tissue between education, automation, and AI deployment.
            </p>
          </div>

          <Suspense fallback={<div style={{ minHeight: "400px" }} />}>
            <SignalConstellation onExploreWork={() => scrollToSection(3)} />
          </Suspense>
        </section>

        <CrypticDivider lines={5} label="// the third degree" />

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
              This is the proof layer — 50+ shipped projects: AI literacy infrastructure, production dashboards,
              generative tools, automation systems, and experiments that graduated into real products.
            </RevealBody>
            <RevealStats
              stats={[
                { num: "50+", label: "Projects shipped" },
                { num: "5", label: "Fortune 500 relationships" },
                { num: "33", label: "Active systems in orbit" },
              ]}
            />
            <RevealCTA onClick={() => scrollToSection(4)}>Enter the archive</RevealCTA>
          </ScrollSection>
        </div>

        <LazySection className="relative" rootMargin="1400px 0px">
          <CrypticBackground rows={15} speed={120} opacity={0.06} className="spotlight-bg" />
          <Suspense fallback={<div style={{ minHeight: "80vh" }} />}>
            <ProjectSpotlight editMode={editMode} />
          </Suspense>
        </LazySection>

        <CrypticDivider lines={4} label="// as seen, as spoken" />

        <LazySection className="relative" rootMargin="2500px 0px">
          <CrypticBackground rows={8} speed={140} opacity={0.04} />
          <Suspense fallback={<div style={{ minHeight: "500px" }} />}>
            <MediaRoom />
          </Suspense>
        </LazySection>

        <CrypticDivider lines={4} label="// the eye keeps records" />

        <div className="relative">
          <CrypticBackground rows={8} speed={130} opacity={0.04} />
          <Suspense fallback={<div style={{ minHeight: "640px" }} />}>
            <ImageTheater />
          </Suspense>
        </div>

        <CrypticDivider lines={3} label="// arsenal.world" />

        <LazySection className="relative" rootMargin="1400px 0px">
          <CrypticBackground rows={10} speed={115} opacity={0.05} />
          <Suspense fallback={<div style={{ minHeight: "680px" }} />}>
            <ArsenalShowcase />
          </Suspense>
        </LazySection>

        <CrypticDivider lines={4} label="// zen-gen online" />

        {/* Generative archive — owner-fed, four ways to read it */}
        <LazySection className="relative" rootMargin="1200px 0px">
          <Suspense fallback={<div style={{ minHeight: "90vh" }} />}>
            <ZenGenGallery />
          </Suspense>
        </LazySection>

        <CrypticDivider lines={5} label="// vitriol · the inner work" />

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
              Beyond client work, the lab holds motion studies, media systems, archives, and visual experiments — the
              reason none of the production work ever looks interchangeable.
            </RevealBody>
            <RevealCTA onClick={() => scrollToSection(5)}>Open a channel</RevealCTA>
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
                <SafeVisual label="orbital field offline">
                  <Suspense fallback={<div style={{ minHeight: "520px" }} />}>
                    <GlassOrbit />
                  </Suspense>
                </SafeVisual>
              </LazySection>
            </div>

            <div className="artifact-lab__item artifact-lab__item--narrow artifact-lab__item--centered">
              <div className="artifact-lab__label">Glass artifact · v2</div>
              <LazySection className="relative z-[1] flex items-center justify-center py-12">
                <SafeVisual label="glass artifact offline">
                  <Suspense fallback={<div style={{ minHeight: "300px" }} />}>
                    <GlassCube />
                  </Suspense>
                </SafeVisual>
              </LazySection>
            </div>

            <div className="artifact-lab__item artifact-lab__item--narrow">
              <div className="artifact-lab__label">Identity object</div>
              <LazySection className="relative z-[1] px-6 md:px-12 lg:px-20">
                <SafeVisual label="identity object offline">
                  <Suspense fallback={<div style={{ minHeight: "300px" }} />}>
                    <AZ1Logo3D progress={Math.max(0, (smoothProgress - 0.45) / 0.2)} />
                  </Suspense>
                </SafeVisual>
              </LazySection>
            </div>

            <div className="artifact-lab__item artifact-lab__item--wide">
              <div className="artifact-lab__label">Generative field</div>
              <LazySection className="relative z-[1]">
                <SafeVisual label="generative field offline">
                  <Suspense fallback={<div style={{ minHeight: "400px" }} />}>
                    <CubeRain />
                  </Suspense>
                </SafeVisual>
              </LazySection>
            </div>

          </div>
        </section>

        <CrypticDivider lines={3} label="// let there be light" />

        <div className="relative">
          <CrypticBackground rows={8} speed={125} opacity={0.04} />
          <Suspense fallback={<div style={{ minHeight: "640px" }} />}>
            <ScrollGallery />
          </Suspense>
        </div>

        <CrypticDivider lines={4} label="// on the level, on the square" />

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
              If the problem matters, the interface matters, and the system has to hold after launch — we should talk.
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

        <CrypticDivider lines={3} label="// the ledger remains open" />

        {/* Guestbook of the LLM era — every model signs on its way out */}
        <ModelSignatures />
      </div>

      {/* Live technical metrics strip — fixed bottom */}
      <LiveMetricsTicker />
    </div>
  );
}
