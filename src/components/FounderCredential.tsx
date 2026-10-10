import { useRef, useState, useEffect, type PointerEvent as ReactPointerEvent } from "react";
import { useInView } from "@/hooks/useInView";
import { prefersReducedMotion, useRafTicker } from "@/hooks/useRafTicker";
import poster640 from "@/assets/founder/alex-leschik-founder-640.webp";
import poster1122 from "@/assets/founder/alex-leschik-founder-1122.webp";
import posterJpg from "@/assets/founder/alex-leschik-founder-1122.jpg";
import zenMark from "@/assets/founder/zen-mark-mask.png";

const FACTS = [
  { num: "42", label: "States" },
  { num: "12", label: "Countries" },
  { num: "Year 4", label: "AI Pioneer Program" },
  { num: "11–18", label: "Student ages · AI agents launched" },
];

const PARTNERS = ["ZEN AI Co.", "Inspect Canada", "NEAR Protocol", "Forward Movers", "thinkrr.ai", "MyEyeDr."];

const MICRO =
  "ALEX LESCHIK · FOUNDER & CEO · ZEN AI CO. · AI PIONEER PROGRAM · FIRST YOUTH AI LITERACY PROGRAM IN U.S. HISTORY · ";

const ALT =
  "Alex Leschik, Founder and CEO of ZEN AI Co. and creator of the AI Pioneer Program, the first youth AI literacy " +
  "program in U.S. history: 42 states, 12 countries, year 4; students ages 11 to 18 launched cloud-hosted AI agents. " +
  "Partners and collaborations: ZEN AI Co., Inspect Canada, NEAR Protocol, Forward Movers, thinkrr.ai and MyEyeDr.";

/**
 * The founder's poster, presented as a laminated credential: a holographic
 * foil and diffraction grating that catch the light as the card tilts, a
 * ZEN security seal standing off the corner, and microprint around the
 * frame. The card follows the pointer on desktop; on touch screens it sways
 * with the scroll (and tilts under a sideways drag).
 */
export default function FounderCredential() {
  const reduced = useRef(prefersReducedMotion()).current;
  const { ref: sectionRef, inView } = useInView<HTMLElement>({ rootMargin: "120px 0px" });
  const cardRef = useRef<HTMLDivElement>(null);
  const [minted, setMinted] = useState(reduced);
  /* Light position (mx, my in 0–1), tilt (rx, ry in degrees) and foil
     strength (o): `cur` eases toward `goal`. */
  const s = useRef({
    cur: { mx: 0.5, my: 0.4, rx: 0, ry: 0, o: 0.3 },
    goal: { mx: 0.5, my: 0.4, rx: 0, ry: 0, o: 0.3 },
    hover: false,
    t0: 0,
  });

  /* The card mints in the first time it comes into view. */
  useEffect(() => {
    if (inView) setMinted(true);
  }, [inView]);

  /* Light and tilt follow the shared page clock, only while on screen. */
  useRafTicker((now) => {
    const card = cardRef.current;
    if (!card) return;
    const st = s.current;
    const { cur, goal } = st;
    if (!st.t0) st.t0 = now;
    if (!st.hover) {
      // At rest the light drifts, and the card leans with its place on screen.
      const r = card.getBoundingClientRect();
      const vh = window.innerHeight || 1;
      const k = Math.max(-1, Math.min(1, (r.top + r.height / 2 - vh / 2) / (vh / 2)));
      const t = (now - st.t0) / 1000;
      goal.mx = 0.5 + 0.34 * Math.sin(t * 0.33);
      goal.my = 0.42 + 0.2 * Math.cos(t * 0.27) - k * 0.18;
      goal.rx = k * 6;
      goal.ry = Math.sin(t * 0.33) * 4.5;
      goal.o = 0.38;
    }
    const a = st.hover ? 0.16 : 0.06;
    cur.mx += (goal.mx - cur.mx) * a;
    cur.my += (goal.my - cur.my) * a;
    cur.rx += (goal.rx - cur.rx) * a;
    cur.ry += (goal.ry - cur.ry) * a;
    cur.o += (goal.o - cur.o) * a;
    const style = card.style;
    style.setProperty("--mx", cur.mx.toFixed(4));
    style.setProperty("--my", cur.my.toFixed(4));
    style.setProperty("--rx", cur.rx.toFixed(3));
    style.setProperty("--ry", cur.ry.toFixed(3));
    style.setProperty("--o", cur.o.toFixed(3));
  }, inView && !reduced);

  const onMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (reduced) return;
    const r = e.currentTarget.getBoundingClientRect();
    const x = Math.max(0, Math.min(1, (e.clientX - r.left) / r.width));
    const y = Math.max(0, Math.min(1, (e.clientY - r.top) / r.height));
    const { goal } = s.current;
    s.current.hover = true;
    goal.mx = x;
    goal.my = y;
    goal.rx = (0.5 - y) * 16;
    goal.ry = (x - 0.5) * 22;
    goal.o = 1;
  };
  const onLeave = () => {
    s.current.hover = false;
  };

  return (
    <section ref={sectionRef} className="founder" aria-labelledby="founder-title">
      <div className="founder__inner">
        <div className="founder__copy">
          <span className="tag-label">Founder · ZEN AI Co.</span>
          <h2 id="founder-title" className="display-heading display-lg founder__title">
            FOUNDER
            <br />
            &amp; CEO
          </h2>
          <p className="founder__lead">
            Alex Leschik founded ZEN AI Co. and created the AI Pioneer Program — the first youth AI literacy program
            in U.S. history, run with the Boys &amp; Girls Clubs of Greater Washington and now in its fourth year.
          </p>
          <ul className="founder__facts">
            {FACTS.map((f) => (
              <li key={f.label}>
                <span className="founder__fact-num">{f.num}</span>
                <span className="founder__fact-label">{f.label}</span>
              </li>
            ))}
          </ul>
          <div className="founder__partners">
            <span className="founder__partners-label">Partners &amp; collaborations</span>
            <ul>
              {PARTNERS.map((p) => (
                <li key={p}>{p}</li>
              ))}
            </ul>
          </div>
        </div>

        <div
          ref={cardRef}
          className="founder-card"
          data-minted={minted ? "" : undefined}
          onPointerMove={onMove}
          onPointerLeave={onLeave}
          onPointerCancel={onLeave}
          onPointerUp={(e) => e.pointerType !== "mouse" && onLeave()}
        >
          <div className="founder-card__mint">
            <div className="founder-card__body">
              <div className="founder-card__frame">
                <span className="founder-card__micro founder-card__micro--top" aria-hidden="true">
                  {MICRO.repeat(3)}
                </span>
                <span className="founder-card__micro founder-card__micro--bottom" aria-hidden="true">
                  {MICRO.repeat(3)}
                </span>
                <span className="founder-card__micro founder-card__micro--left" aria-hidden="true">
                  {MICRO.repeat(3)}
                </span>
                <span className="founder-card__micro founder-card__micro--right" aria-hidden="true">
                  {MICRO.repeat(3)}
                </span>
                <div className="founder-card__face">
                  <picture>
                    <source
                      type="image/webp"
                      srcSet={`${poster640} 640w, ${poster1122} 1122w`}
                      sizes="(max-width: 860px) 86vw, 460px"
                    />
                    <img
                      src={posterJpg}
                      width={1122}
                      height={1402}
                      alt={ALT}
                      loading="lazy"
                      decoding="async"
                      draggable={false}
                    />
                  </picture>
                  <span className="founder-card__foil" aria-hidden="true" />
                  <span className="founder-card__grating" aria-hidden="true" />
                  <span className="founder-card__glare" aria-hidden="true" />
                  <span className="founder-card__sweep" aria-hidden="true" />
                </div>
              </div>
              <span className="founder-card__seal" aria-hidden="true">
                <span
                  className="founder-card__seal-mark"
                  style={{ WebkitMaskImage: `url(${zenMark})`, maskImage: `url(${zenMark})` }}
                />
              </span>
            </div>
          </div>
          <span className="founder-card__shadow" aria-hidden="true" />
        </div>
      </div>
    </section>
  );
}
