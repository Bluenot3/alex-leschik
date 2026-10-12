import type { FoilScene } from "../../types";

/**
 * banner — a banknote border band: interlaced guilloche waves running the
 * full width, a cartouche holding the headline (decoding in), brand seals
 * at both ends and microprint along the edges. Built for wide strips —
 * section headers, dividers, hero bands — from 2:1 out to 8:1.
 */
export const banner: FoilScene = {
  id: "banner",
  title: "Guilloche banner",
  description: "Interlaced guilloche waves across a wide band, a cartouche headline, end seals and edge microprint.",
  aspect: 4,
  accent: "#8fb4ff",
  still: 5.0,
  params: {
    mark: { type: "mark", num: 0, default: "zen", description: "End seals (none to omit)." },
    strands: { type: "number", num: 1, default: "12", min: 3, max: 16, description: "Guilloche strands per rope." },
    speed: { type: "number", num: 2, default: "1", min: 0, max: 4, description: "Wave drift speed." },
    headline: { type: "text", slot: 0, default: "AI PIONEER PROGRAM", description: "Cartouche headline." },
    subline: { type: "text", slot: 1, default: "ZEN AI CO · AI LITERACY", description: "Line under the headline." },
    micro: { type: "text", slot: 2, default: "ZEN AI CO · AI LITERACY · BUILT IN PUBLIC · ", description: "Edge microprint." },
  },
  code: /* wgsl */ `
/* One family of interlaced sine strands around centre line y0. Returns coverage. */
fn waveBand(p: vec2f, y0: f32, amp: f32, freq: f32, n: i32, ph: f32, hw: f32) -> f32 {
  var acc: f32 = 0.0;
  for (var k: i32 = 0; k < 16; k++) {
    if (k < n) {
      // A twisted rope: n strands a whole turn apart, breathing along x.
      let fk: f32 = f32(k) / f32(max(n, 1));
      let s: f32 = p.x * freq + fk * TAU + ph;
      let env: f32 = 0.78 + 0.22 * sin(p.x * freq * 0.25 + ph * 0.3);
      let y: f32 = y0 + amp * env * sin(s);
      let slope: f32 = amp * env * freq * cos(s);
      acc += lineCov(abs(p.y - y) / sqrt(1.0 + slope * slope) / pxs(), hw);
    }
  }
  return saturate(acc);
}

fn scene(uv: vec2f, p: vec2f) -> vec3f {
  let A: f32 = aspect();
  let speed: f32 = numParam(2);
  let t: f32 = tnow() * speed;
  let n: i32 = i32(numParam(1) + 0.5);
  let slot: i32 = i32(numParam(0));
  let hasMark: f32 = select(0.0, 1.0, slot >= 0);
  let px: f32 = pxs();

  // Seals at both ends, sized to the band.
  let sr: f32 = min(0.29, A * 0.075);
  let sx: f32 = A * 0.5 - sr - 0.07;
  let sealL: vec2f = brandSeal(p, vec2f(-sx, 0.0), sr, slot) * hasMark;
  let sealR: vec2f = brandSeal(p, vec2f(sx, 0.0), sr, slot) * hasMark;
  let ringL: f32 = ringTextP(p, vec2f(-sx, 0.0), sr * 1.13, sr * 0.11, 2, t * 0.03, false) * hasMark;
  let ringR: f32 = ringTextP(p, vec2f(sx, 0.0), sr * 1.13, sr * 0.11, 2, -t * 0.03, false) * hasMark;
  let ends: f32 = select(A * 0.5 - 0.03, sx - sr * 1.3, slot >= 0);

  // Cartouche around the headline.
  let inner: f32 = max(ends * 2.0 - 0.16, 0.4);
  let hs: f32 = textFitP(0, inner * 0.82, 0.2);
  let ss: f32 = textFitP(1, inner * 0.7, hs * 0.3);
  let cw: f32 = max(textWidthP(0, hs), textWidthP(1, ss)) * 0.5 + 0.09;
  let ch: f32 = (hs + ss + 0.07) * 0.5 + 0.02;
  let cart: f32 = sdRoundBox(p, vec2f(cw, ch), 0.05);
  let cartIn: f32 = fillAA(cart);
  let cartLine: f32 = stroke(cart, 0.55) + stroke(cart - 0.012, 0.3) * 0.8;

  // Two families of waves, above and below, weaving through each other.
  let mask: f32 = (1.0 - cartIn * 0.9) * sstep(-0.02, 0.08, ends - abs(p.x));
  let wa: f32 = waveBand(p, 0.245, 0.085, 15.0, n, t * 0.35, 0.3);
  let wb: f32 = waveBand(p, -0.245, 0.085, 15.0, n, PI - t * 0.35, 0.3);
  let wc: f32 = waveBand(p, 0.0, 0.3, 3.4, max(n / 2, 3), t * 0.2 + 1.1, 0.24);
  let rails: f32 = lineCov(abs(abs(p.y) - 0.43) / px, 0.5) + lineCov(abs(abs(p.y) - 0.415) / px, 0.28);

  let reveal: f32 = saturate((intro() - 0.25) / 0.75);
  let head: f32 = textDecodeP(p, vec2f(-textWidthP(0, hs) * 0.5, ch - 0.035), hs, 0, 0.35, reveal);
  let sub: f32 = textRunP(p, vec2f(-textWidthP(1, ss) * 0.5, ch - 0.035 - hs - 0.03), ss, 1, 0.0);
  let microT: f32 = textLoopP(p, 0.5 - 0.022, 0.016, 2, t * 0.015, 0.0);
  let microB: f32 = textLoopP(p, -0.5 + 0.038, 0.016, 2, -t * 0.015, 0.0);
  let sweep: f32 = exp(-abs(p.x - (fract(t * 0.06) * 2.0 - 1.0) * A * 0.7) * 6.0);

  let ink: vec3f = inkCol(p, 1.2);
  let foil: vec3f = holo(foilPhase(p, 1.8) + p.x * 0.4);
  var c: vec3f = vec3f(0.0);
  c += mix(ink, foil, 0.55) * (wa + wb) * 0.62 * mask + mix(u.accent.rgb, foil, 0.4) * wc * 0.32 * mask;
  c += mix(ink, silver(), 0.4) * rails * 0.7;
  c += u.accent.rgb * cartIn * 0.025 + mix(ink, silver(), 0.5) * cartLine * 0.85;
  c += mix(silver(), holo(foilPhase(p, 1.4) + 0.3), 0.3 + 0.4 * sweep) * head * (1.0 + 0.3 * sweep);
  c += silver() * sub * 0.7;
  let sealFoil: vec3f = mix(silver(), foil, 0.55);
  c += sealFoil * (sealL.x + sealR.x) + u.accent.rgb * (sealL.y + sealR.y);
  c += silver() * (ringL + ringR) * 0.6 + ink * (microT + microB) * 0.4;
  return c;
}
`,
};
