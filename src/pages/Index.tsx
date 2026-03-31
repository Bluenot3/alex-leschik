import { useScrollEngine } from "@/hooks/useScrollEngine";
import CubeScene from "@/components/CubeScene";
import HUD from "@/components/HUD";
import ScrollSection, {
  RevealTag,
  RevealHeading,
  RevealBody,
  RevealLine,
  RevealStats,
  RevealCTA,
} from "@/components/ScrollSection";

const SECTION_COUNT = 6;

export default function Index() {
  const { smoothProgress, currentSection, cubeRotation, scrollToSection } =
    useScrollEngine(SECTION_COUNT);

  return (
    <div className="relative">
      {/* SEO */}
      <h1 className="sr-only">Alex Leschik — Developer & Creator</h1>

      {/* 3D Cube Background */}
      <CubeScene rotation={cubeRotation} />

      {/* HUD Overlay */}
      <HUD
        progress={smoothProgress}
        currentSection={currentSection}
        onDotClick={scrollToSection}
      />

      {/* Scroll Sections */}
      <div className="relative z-[1]">
        {/* S0: Hero */}
        <ScrollSection index={0}>
          <RevealTag>Portfolio — Alex Leschik</RevealTag>
          <RevealHeading size="xl">
            BUILD
            <br />
            BREAK
            <br />
            SHIP
          </RevealHeading>
          <RevealBody>
            Developer, creator, builder of things that matter.
            Code projects, creative experiments, and everything in between.
            Scroll to explore the work.
          </RevealBody>
          <RevealCTA onClick={() => scrollToSection(1)}>Enter</RevealCTA>
        </ScrollSection>

        {/* S1: Projects */}
        <ScrollSection index={1} align="right">
          <RevealLine />
          <RevealTag>01 — Projects</RevealTag>
          <RevealHeading>
            CODE
            <br />
            THAT
            <br />
            SHIPS
          </RevealHeading>
          <RevealBody>
            From full-stack applications to experimental tools,
            every project starts with a problem worth solving.
            Clean architecture. Real users. Measurable impact.
          </RevealBody>
          <RevealStats
            stats={[
              { num: "12+", label: "Projects" },
              { num: "50K", label: "Lines" },
              { num: "∞", label: "Curiosity" },
            ]}
          />
          <RevealCTA onClick={() => scrollToSection(2)}>Explore</RevealCTA>
        </ScrollSection>

        {/* S2: Vision */}
        <ScrollSection index={2}>
          <RevealLine />
          <RevealTag>02 — Vision</RevealTag>
          <RevealHeading>
            BEYOND
            <br />
            THE
            <br />
            SCREEN
          </RevealHeading>
          <RevealBody>
            Technology should feel invisible.
            The best interfaces disappear into the experience.
            Every pixel, every interaction — intentional.
          </RevealBody>
          <RevealCTA onClick={() => scrollToSection(3)}>Continue</RevealCTA>
        </ScrollSection>

        {/* S3: Craft */}
        <ScrollSection index={3} align="right">
          <RevealLine />
          <RevealTag>03 — Craft</RevealTag>
          <RevealHeading>
            DETAIL
            <br />
            IS
            <br />
            EVERYTHING
          </RevealHeading>
          <RevealBody>
            The difference between good and exceptional
            lives in the details nobody notices until they're missing.
            Performance, accessibility, polish — non-negotiable.
          </RevealBody>
          <RevealStats
            stats={[
              { num: "6", label: "Frameworks" },
              { num: "360°", label: "Thinking" },
              { num: "24/7", label: "Building" },
            ]}
          />
          <RevealCTA onClick={() => scrollToSection(4)}>See more</RevealCTA>
        </ScrollSection>

        {/* S4: Gallery */}
        <ScrollSection index={4}>
          <RevealLine />
          <RevealTag>04 — Gallery</RevealTag>
          <RevealHeading>
            VISUAL
            <br />
            ARTIFACTS
          </RevealHeading>
          <RevealBody>
            Screenshots, prototypes, design explorations.
            The visual trail of building something from nothing.
            Each face of the cube holds a different story.
          </RevealBody>
          <RevealCTA onClick={() => scrollToSection(5)}>Final turn</RevealCTA>
        </ScrollSection>

        {/* S5: Connect */}
        <ScrollSection index={5} align="right">
          <RevealLine />
          <RevealTag>05 — Connect</RevealTag>
          <RevealHeading>
            LET'S
            <br />
            BUILD
          </RevealHeading>
          <RevealBody>
            Interested in collaborating, hiring, or just saying hello?
            Every great project starts with a conversation.
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
            <a
              href="mailto:hello@alexleschik.com"
              className="cta-btn"
            >
              Get in touch
              <svg viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-3 h-3">
                <path d="M1 6h10M6 1l5 5-5 5" />
              </svg>
            </a>
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
              Back to top
            </button>
          </div>
        </ScrollSection>
      </div>
    </div>
  );
}
