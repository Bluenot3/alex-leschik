import { layoutText } from "../atlas";
import type { FoilScene } from "../types";

const TEXT = layoutText(
  {
    mast: "ZEN WEEKLY",
    dateline: "AI · LITERACY · CULTURE · THE WEEKLY DISPATCH",
    head: "THIS WEEK IN AI",
    subs: "SUBSCRIBERS",
    k: "K+",
    micro: "ZEN WEEKLY · SINCE 2023 · AI LITERACY · YOUTH TECH · HUMAN-MACHINE COLLABORATION · ",
  },
  0,
);
const T = TEXT.at;

/**
 * ZEN Weekly — the flagship dispatch, 20,000+ subscribers.
 * An engraved front page runs through the press line by line, then the
 * issue fans out to subscribers.
 */
export const weekly: FoilScene = {
  id: "weekly",
  still: 6.0,
  data(d) {
    TEXT.write(d);
  },
  code: /* wgsl */ `
const PG: vec2f = vec2f(-0.2, -0.005);
const PH: vec2f = vec2f(0.33, 0.43);

fn scene(uv: vec2f, p: vec2f) -> vec3f {
  let t: f32 = tnow();
  let k: f32 = fract(t / 10.0);
  let q: vec2f = rot2(0.045) * (p - PG);
  let page: f32 = sdBox(q, PH);
  let onPage: f32 = fillAA(page);
  let edge: f32 = stroke(page, 0.7);
  let shadow: f32 = exp(-max(sdBox(q + vec2f(-0.012, 0.016), PH), 0.0) * 60.0) * (1.0 - onPage) * 0.3;

  // Press: ink lands line by line as the impression cylinder passes.
  let pressY: f32 = mix(PH.y + 0.02, -PH.y - 0.03, ease(k / 0.55));
  let printed: f32 = select(sstep(pressY - 0.004, pressY + 0.004, q.y), 1.0, k > 0.56) * (1.0 - ease((k - 0.94) / 0.06));
  let preview: f32 = 0.16;
  let inkAmt: f32 = mix(preview, 1.0, printed);

  // Masthead + rules + dateline.
  let mastSize: f32 = 0.068;
  let mast: f32 = textRun(q, vec2f(-${T.mast.count}.0 * mastSize * 0.3, PH.y - 0.03), mastSize, ${T.mast.start}, ${T.mast.count}, 0.6);
  let rules: f32 = (stroke(q.y - (PH.y - 0.112), 0.7) + stroke(q.y - (PH.y - 0.121), 0.35) + stroke(q.y - (PH.y - 0.152), 0.35)) * step(abs(q.x), PH.x - 0.03);
  let dateline: f32 = textRun(q, vec2f(-${T.dateline.count}.0 * 0.0135 * 0.3, PH.y - 0.124), 0.0135, ${T.dateline.start}, ${T.dateline.count}, 0.0);
  let headline: f32 = textRun(q, vec2f(-PH.x + 0.03, PH.y - 0.168), 0.034, ${T.head.start}, ${T.head.count}, 0.3);

  // Halftone plate (a globe) across two columns.
  let ic: vec2f = vec2f(0.075, PH.y - 0.325);
  let imgBox: f32 = sdBox(q - ic, vec2f(0.215, 0.105));
  let gq: vec2f = (q - ic - vec2f(0.03, 0.0)) / 0.085;
  let gr: f32 = length(gq);
  let globeTone: f32 = select(0.06, saturate(0.25 + 0.7 * sqrt(max(1.0 - gr * gr, 0.0)) * (0.5 + 0.5 * dot(normalize(vec3f(gq, sqrt(max(1.0 - gr * gr, 0.0)))), normalize(vec3f(-0.5, 0.5, 0.7))))), gr < 1.0);
  let land: f32 = sstep(0.02, 0.06, fbm(gq * 1.4 + vec2f(t * 0.05, 0.0), 4)) * step(gr, 1.0);
  let plate: f32 = halftone(q, 0.0072, 0.785, globeTone * (0.7 + land * 0.5)) * fillAA(imgBox) + stroke(imgBox, 0.45);

  // Greeked columns: rows of type as engraved hairline runs.
  let colW: f32 = (PH.x * 2.0 - 0.08) / 3.0;
  let cx: f32 = (q.x + PH.x - 0.03) / (colW + 0.01);
  let col: f32 = floor(cx);
  let inCol: f32 = step(0.0, cx) * step(cx, 3.0) * step(fract(cx), colW / (colW + 0.01));
  let rowH: f32 = 0.0175;
  let ry: f32 = (PH.y - 0.2 - q.y) / rowH;
  let row: f32 = floor(ry);
  let lineLen: f32 = select(0.55 + 0.45 * h21(vec2f(col, row)), 0.6, fract(row / 7.0) > 0.84);
  let word: f32 = step(0.12, h21(vec2f(floor(q.x / 0.018), row + col * 31.0)));
  let typeBar: f32 = sstep(0.2, 0.14, abs(fract(ry) - 0.5)) * step(fract(cx) * (colW + 0.01) / colW, lineLen) * word;
  let underImg: f32 = 1.0 - step(imgBox, 0.012);
  let body: f32 = typeBar * inCol * step(0.0, ry) * step(q.y, PH.y - 0.2) * step(-PH.y + 0.03, q.y) * underImg;
  let gutters: f32 = (stroke(q.x + PH.x - 0.03 - colW - 0.005, 0.3) + stroke(q.x + PH.x - 0.03 - 2.0 * colW - 0.015, 0.3)) * step(q.y, PH.y - 0.2) * step(-PH.y + 0.03, q.y) * underImg;
  let cylinder: f32 = (stroke(q.y - pressY, 1.3) + exp(-abs(q.y - pressY) * 90.0) * 0.5) * step(abs(q.x), PH.x + 0.04) * step(k, 0.56);

  // Dispatch: the issue fans out to subscribers.
  let ox: f32 = 0.16;
  let dk: f32 = saturate((k - 0.5) / 0.45);
  var fan: f32 = 0.0;
  for (var i: i32 = 0; i < 9; i++) {
    let fi: f32 = f32(i);
    let spread: f32 = (fi - 4.0) * 0.1;
    for (var j: i32 = 0; j < 6; j++) {
      let life: f32 = fract(t * 0.22 + fi * 0.137 + f32(j) * 0.167);
      let x: f32 = ox + life * (aspect() * 0.5 - ox);
      let y: f32 = PG.y + spread * life * 1.6 + sin(life * 3.0 + fi) * 0.01;
      fan += fillAA(length(p - vec2f(x, y)) - 0.0034) * sin(life * PI) * dk;
    }
    fan += stroke(p.y - PG.y - spread * (p.x - ox) / (aspect() * 0.5 - ox) * 1.6, 0.25) * step(ox, p.x) * 0.18 * dk;
  }
  let subsX: f32 = aspect() * 0.5 - 0.22;
  let subs: f32 = digitCov(p, vec2f(subsX, 0.44), 0.07, 2, 0.0) + digitCov(p, vec2f(subsX + 0.042, 0.44), 0.07, 0, 0.0)
    + textRun(p, vec2f(subsX + 0.086, 0.43), 0.035, ${T.k.start}, ${T.k.count}, 0.2)
    + textRun(p, vec2f(subsX, 0.355), 0.0155, ${T.subs.start}, ${T.subs.count}, 0.0);
  let micro: f32 = textLoop(p, -0.468, 0.014, ${T.micro.start}, ${T.micro.count}, t * 0.01, 0.0);

  let ink: vec3f = inkCol(p, 1.2);
  let paper: vec3f = vec3f(0.9, 0.88, 0.82);
  var c: vec3f = ink * onPage * 0.05 + ink * edge * 0.7 + ink * shadow * 0.15;
  c += mix(paper, holo(foilPhase(q, 1.5)), 0.25) * (mast * 1.05 + headline * 0.85) * inkAmt;
  c += ink * (rules * 0.8 + dateline * 0.6 + body * 0.55 + gutters * 0.4) * inkAmt;
  c += mix(ink, paper, 0.5) * plate * 0.75 * inkAmt;
  c += holo(foilPhase(p, 2.0) + 0.3) * cylinder * 0.7;
  c += mix(u.accent.rgb, vec3f(1.0), 0.45) * fan * 0.9 + silver() * subs * 0.85;
  c += ink * micro * 0.4;
  return c;
}
`,
};
