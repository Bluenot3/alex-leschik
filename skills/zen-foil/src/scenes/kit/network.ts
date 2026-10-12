import { packText } from "../../atlas";
import { parseList } from "../../scene";
import type { FoilScene } from "../../types";

const MAX_NODES = 8;
/** d[8..11] = label table (start, count per node); d[12].x = node count; labels from float 52. */
const TABLE_VEC4 = 8;
const COUNT_VEC4 = 12;
const LABEL_FLOAT = 52;

/**
 * network — an agent constellation: your mark as the orchestrating hub,
 * agents on an engraved orbit, and work packets streaming along the links
 * (out to an agent, back with a result), each arrival lighting the node.
 * A faint field of neurons drifts behind. For AI platforms, agent
 * builders, integrations and any hub-and-spoke system.
 */
export const network: FoilScene = {
  id: "network",
  title: "Agent network",
  description: "Your mark as an orchestrating hub with labelled agents on an engraved orbit and packets streaming along the links.",
  aspect: 1.6,
  accent: "#67e8f9",
  still: 5.0,
  params: {
    nodes: { type: "list", default: "RESEARCH, WRITER, ANALYST, DESIGNER, CODER, OPS", description: `Agent labels, comma separated (up to ${MAX_NODES}).` },
    mark: { type: "mark", num: 0, default: "zen", description: "Hub mark." },
    speed: { type: "number", num: 1, default: "1", min: 0, max: 4, description: "Packet speed." },
    headline: { type: "text", slot: 0, default: "ZEN ARSENAL", description: "Title, top left." },
    subline: { type: "text", slot: 1, default: "AGENTS · ORCHESTRATED", description: "Line under the title." },
    status: { type: "text", slot: 2, default: "6 AGENTS ONLINE", description: "Status line, bottom left." },
    micro: { type: "text", slot: 3, default: "ARSENAL.WORLD · AGENT + APP BUILDER · ZEN AI CO · ", description: "Microprint around the hub orbit." },
  },
  data(d, params) {
    const labels = parseList(params.nodes).slice(0, MAX_NODES);
    let f = LABEL_FLOAT;
    labels.forEach((label, i) => {
      const text = label.toUpperCase().slice(0, 18);
      const at = TABLE_VEC4 * 4 + i * 2;
      d[at] = f * 3;
      d[at + 1] = Array.from(text).length;
      f += packText(text, d, f);
    });
    d[COUNT_VEC4 * 4] = labels.length;
  },
  code: /* wgsl */ `
const MAXN: i32 = ${MAX_NODES};

fn nodeLabel(i: i32) -> vec2i {
  let v: vec4f = u.d[${TABLE_VEC4} + i / 2];
  let even: bool = (i % 2) == 0;
  return vec2i(i32(select(v.z, v.x, even) + 0.5), i32(select(v.w, v.y, even) + 0.5));
}

/* Quadratic link a→c bowed through b: (distance, parameter). */
fn linkDist(p: vec2f, a: vec2f, b: vec2f, c: vec2f) -> vec2f {
  var best: f32 = 1e9;
  var bestS: f32 = 0.0;
  var prev: vec2f = a;
  for (var k: i32 = 1; k <= 10; k++) {
    let s: f32 = f32(k) / 10.0;
    let q: vec2f = mix(mix(a, b, s), mix(b, c, s), s);
    let dd: f32 = sdSeg(p, prev, q);
    if (dd < best) {
      best = dd;
      bestS = (f32(k) - 1.0 + segT(p, prev, q)) / 10.0;
    }
    prev = q;
  }
  return vec2f(best, bestS);
}

fn scene(uv: vec2f, p: vec2f) -> vec3f {
  let A: f32 = aspect();
  let t: f32 = tnow();
  let px: f32 = pxs();
  let speed: f32 = numParam(1);
  let slot: i32 = i32(numParam(0));
  let n: i32 = min(i32(u.d[${COUNT_VEC4}].x + 0.5), MAXN);
  let wide: bool = A >= 1.25;
  let H: vec2f = select(vec2f(0.0, -0.1), vec2f(A * 0.06, -0.03), wide);
  let rx: f32 = select(A * 0.36, min(A * 0.33, 0.66), wide);
  let ry: f32 = select(0.24, 0.3, wide);
  let wob: f32 = sin(t * 0.07) * 0.05;

  // ── Background neurons: sparse twinkling points ──
  let cell: vec2f = floor(p * 26.0);
  let jit: vec2f = h22(cell + vec2f(5.0, 9.0));
  let np: vec2f = (cell + 0.2 + jit * 0.6) / 26.0;
  let tw: f32 = 0.5 + 0.5 * sin(t * (0.6 + jit.x) + jit.y * 20.0);
  let neurons: f32 = fillAA(length(p - np) - 0.0018) * step(0.72, h21(cell + vec2f(1.0, 3.0))) * tw;

  // ── Hub ──
  let hd: f32 = length(p - H);
  let hubR: f32 = 0.075;
  let hub: vec2f = brandSeal(p, H, hubR, slot);
  let orbit1: f32 = rosette(p, H, hubR * 1.75, hubR * 0.16, 20.0, 5, 0.3, t * 0.1);
  let orbitT: f32 = ringTextP(p, H, hubR * 2.25, 0.013, 3, t * 0.05, false);
  let orbitL: f32 = lineCov(abs(hd - hubR * 2.05) / px, 0.35) + lineCov(abs(hd - hubR * 2.5) / px, 0.3);
  // The agents' orbit: a dashed engraved ellipse.
  let e: vec2f = (p - H) / vec2f(rx, ry);
  let el: f32 = length(e);
  let ea: f32 = atan2(e.y, e.x);
  let dash: f32 = step(0.45, fract(ea / TAU * 90.0 - t * 0.02));
  let ellipse: f32 = lineCov(abs(el - 1.0) * min(rx, ry) / px, 0.35) * (0.35 + 0.65 * dash);

  var links: f32 = 0.0;
  var trails: f32 = 0.0;
  var packets: f32 = 0.0;
  var nodes: f32 = 0.0;
  var halos: f32 = 0.0;
  var labels: f32 = 0.0;
  for (var i: i32 = 0; i < MAXN; i++) {
    if (i < n) {
      let ang: f32 = -PI * 0.5 + f32(i) / f32(max(n, 1)) * TAU + wob + 0.3;
      let dir: vec2f = vec2f(cos(ang), sin(ang));
      let N: vec2f = H + dir * vec2f(rx, ry) + vec2f(0.0, 0.006 * sin(t * 0.8 + f32(i) * 1.7));
      let side: vec2f = vec2f(-dir.y, dir.x);
      // Links leave from the hub's outer ring, not its face.
      let H0: vec2f = H + dir * vec2f(hubR * 2.5, hubR * 2.5);
      let bend: vec2f = 0.5 * (H0 + N) + side * 0.05 * select(-1.0, 1.0, (i % 2) == 0);
      let ld: vec2f = linkDist(p, H0, bend, N);
      links += lineCov(ld.x / px, 0.35);
      // A packet out (even agents) or back (odd), with a fading trail.
      let ph: f32 = fract(t * 0.22 * speed + f32(i) * 0.37);
      let outward: bool = (i % 2) == 0;
      let s: f32 = select(1.0 - ph, ph, outward);
      let pp: vec2f = mix(mix(H0, bend, s), mix(bend, N, s), s);
      let behind: f32 = select(ld.y - s, s - ld.y, outward);
      trails += lineCov(ld.x / px, 0.8) * step(0.0, behind) * exp(-behind * 9.0) * step(0.03, ph);
      let pd: f32 = length(p - pp);
      packets += fillAA(pd - 0.0045) + exp(-pd * 110.0) * 0.6;
      // The agent: rings that flash as a packet lands (out) or leaves (back).
      let flash: f32 = exp(-ph * 7.0);
      let nd: f32 = length(p - N);
      nodes += lineCov(abs(nd - 0.022) / px, 0.6) + lineCov(abs(nd - 0.016) / px, 0.3) + fillAA(nd - 0.0055);
      halos += exp(-nd * 45.0) * (0.25 + flash * 1.2) + lineCov(abs(nd - 0.024 - ph * 0.07) / px, 0.6) * flash;
      // Label: outward from the node, left- or right-aligned by side.
      let lab: vec2i = nodeLabel(i);
      let ls: f32 = 0.019;
      let lw: f32 = f32(lab.y) * ls * 0.6;
      let right: bool = dir.x >= -0.05;
      let lx: f32 = select(N.x - 0.036 - lw, N.x + 0.036, right);
      let ly: f32 = N.y + ls * 0.5 + select(0.0, 0.03, abs(dir.x) < 0.3) * sign(dir.y);
      labels += textRun(p, vec2f(lx, ly), ls, lab.x, lab.y, 0.1);
    }
  }

  // ── Text ──
  let x0: f32 = -A * 0.5 + 0.075;
  let colW: f32 = select(A - 0.15, A * 0.45, wide);
  let hs: f32 = textFitP(0, colW, 0.05);
  let ss: f32 = textFitP(1, colW, 0.02);
  let reveal: f32 = saturate((intro() - 0.25) / 0.75);
  let xa: f32 = select(-textWidthP(0, hs) * 0.5, x0, wide);
  let head: f32 = textDecodeP(p, vec2f(xa, 0.5 - 0.07), hs, 0, 0.3, reveal);
  let sub: f32 = textRunP(p, vec2f(select(-textWidthP(1, ss) * 0.5, x0, wide), 0.5 - 0.07 - hs - 0.025), ss, 1, 0.05);
  let sts: f32 = textFitP(2, colW, 0.018);
  let blink: f32 = step(0.5, fract(t * 0.9));
  let dotS: f32 = fillAA(length(p - vec2f(x0 + 0.006, -0.5 + 0.072)) - 0.005) * (0.5 + 0.5 * blink);
  let st: f32 = textRunP(p, vec2f(x0 + 0.022, -0.5 + 0.072 + sts * 0.5), sts, 2, 0.05);

  let ink: vec3f = inkCol(p, 1.3);
  let foil: vec3f = holo(foilPhase(p, 2.0) + hd * 2.0);
  var c: vec3f = vec3f(0.0);
  c += mix(u.accent.rgb, silver(), 0.4) * neurons * 0.22;
  c += ink * (orbitL * 0.5 + ellipse * 0.4) + mix(ink, foil, 0.55) * orbit1 * 0.55 + silver() * orbitT * 0.6;
  c += mix(ink, silver(), 0.3) * links * 0.42 + mix(u.accent.rgb, foil, 0.35) * trails * 0.9;
  c += vec3f(0.95, 1.0, 1.0) * packets * 0.9 + mix(u.accent.rgb, silver(), 0.35) * nodes * 0.85 + u.accent.rgb * halos * 0.35;
  c += silver() * labels * 0.78;
  c += mix(silver(), foil, 0.55) * hub.x * 1.05 + u.accent.rgb * hub.y;
  c += mix(silver(), holo(foilPhase(p, 1.4) + 0.3), 0.3) * head + silver() * sub * 0.65;
  c += u.accent.rgb * dotS + mix(u.accent.rgb, silver(), 0.4) * st * 0.8;
  return c;
}
`,
};
