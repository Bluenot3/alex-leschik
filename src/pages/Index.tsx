import { useState } from "react";
import { useScrollEngine } from "@/hooks/useScrollEngine";
import CubeScene from "@/components/CubeScene";
import GlassCube from "@/components/GlassCube";
import CubeRain from "@/components/CubeRain";
import AZ1Logo3D from "@/components/AZ1Logo3D";
import Amphitheatre from "@/components/Amphitheatre";
import HUD from "@/components/HUD";
import ImageVortex from "@/components/ImageVortex";
import InteractiveName from "@/components/InteractiveName";
import GalleryShowcase from "@/components/GalleryShowcase";
import ProjectSpotlight from "@/components/ProjectSpotlight";
import CommandDashboard from "@/components/CommandDashboard";
import CrypticDivider from "@/components/CrypticDivider";
import CrypticBackground from "@/components/CrypticBackground";
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
  const [editMode, setEditMode] = useState(false);
  const [cmdOpen, setCmdOpen] = useState(false);

  return (
    <div className="relative">
      <h1 className="sr-only">Alex Leschik — Developer & Creator</h1>

      <CubeScene rotation={cubeRotation} editMode={editMode} />
      <InteractiveName scrollProgress={smoothProgress} />
      <ImageVortex progress={smoothProgress} />
      <HUD
        progress={smoothProgress}
        currentSection={currentSection}
        onDotClick={scrollToSection}
        editMode={editMode}
        onToggleEdit={() => setEditMode((v) => !v)}
        onOpenCmd={() => setCmdOpen(true)}
      />
      <CommandDashboard open={cmdOpen} onClose={() => setCmdOpen(false)} />

      <div className="relative z-[1]">
        {/* S0: Hero */}
        <ScrollSection index={0}>
          <RevealTag>Portfolio — Alex Leschik</RevealTag>
          <RevealBody>
            Developer, creator, builder of things that matter.
            Code projects, creative experiments, and everything in between.
            Scroll to explore the work.
          </RevealBody>
          <RevealCTA onClick={() => scrollToSection(1)}>Enter</RevealCTA>
        </ScrollSection>

        <CrypticDivider lines={4} label="// initializing" />

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
            From the first youth AI literacy program in US history to
            partnerships with Boys & Girls Clubs and NEAR Protocol —
            every project starts with a problem worth solving.
          </RevealBody>
          <RevealStats
            stats={[
              { num: "20+", label: "Projects" },
              { num: "1st", label: "AI Literacy" },
              { num: "∞", label: "Impact" },
            ]}
          />
          <RevealCTA onClick={() => scrollToSection(2)}>Explore</RevealCTA>
        </ScrollSection>

        <CrypticDivider lines={3} label="// deploying flagships" />

        {/* Cryptic background fills white space behind projects */}
        <div className="relative">
          <CrypticBackground rows={30} speed={120} opacity={0.045} className="spotlight-bg" />
          <ProjectSpotlight editMode={editMode} />
        </div>

        <CrypticDivider lines={5} label="// loading modules" />

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

        <div className="relative">
          <CrypticBackground rows={15} speed={150} opacity={0.035} />
          <CrypticDivider lines={6} label="// compiling assets" />
        </div>

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

        <CrypticDivider lines={4} label="// rendering gallery" />

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
          </RevealBody>
          <RevealCTA onClick={() => scrollToSection(5)}>Final turn</RevealCTA>
        </ScrollSection>

        <section className="relative z-[1] py-16 px-6 md:px-12 lg:px-20">
          <GalleryShowcase />
        </section>

        <div className="relative">
          <CrypticBackground rows={25} speed={100} opacity={0.04} />
          <CrypticDivider lines={5} label="// streaming data" />
        </div>

        {/* Cube Rain */}
        <section className="relative z-[1]">
          <CubeRain />
        </section>

        <CrypticDivider lines={3} label="// building identity" />

        {/* AZ1 3D Logo */}
        <section className="relative z-[1] px-6 md:px-12 lg:px-20">
          <AZ1Logo3D progress={Math.max(0, (smoothProgress - 0.45) / 0.2)} />
        </section>

        <CrypticDivider lines={6} label="// entering theatre" />

        {/* Amphitheatre */}
        <section className="relative z-[1]">
          <Amphitheatre progress={Math.max(0, (smoothProgress - 0.65) / 0.2)} />
        </section>

        <CrypticDivider lines={5} label="// glass artifact" />

        {/* Glass Cube */}
        <section className="relative z-[1] flex items-center justify-center py-12">
          <GlassCube />
        </section>

        <div className="relative">
          <CrypticBackground rows={12} speed={130} opacity={0.04} />
          <CrypticDivider lines={3} label="// end transmission" />
        </div>

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
            <a href="https://forms.gle/T4cMKd2TL4CkxGLD8" target="_blank" rel="noopener noreferrer" className="cta-btn">
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
