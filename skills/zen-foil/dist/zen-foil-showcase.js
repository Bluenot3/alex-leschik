/* eslint-disable */
/*! zen-foil 1.0.0 — engraved-hologram GPU plates (WebGPU + WebGL2). DM Mono subset: SIL OFL 1.1. */
import{defineScene as Je}from"./zen-foil.js";import{layoutText as Ce,projectUS as S}from"./zen-foil.js";var T=[[-77.04,38.91],[-76.61,39.29],[-77.44,37.54],[-75.17,39.95],[-74,40.71],[-80,40.44],[-80.84,35.23],[-71.06,42.36],[-83.05,42.33],[-84.39,33.75],[-86.78,36.16],[-81.38,28.54],[-87.63,41.88],[-90.2,38.63],[-80.19,25.76],[-90.07,29.95],[-94.58,39.1],[-93.27,44.98],[-95.94,41.26],[-96.8,32.78],[-95.37,29.76],[-97.74,30.27],[-104.99,39.74],[-106.65,35.08],[-111.89,40.76],[-112.07,33.45],[-115.14,36.17],[-116.2,43.62],[-118.24,34.05],[-122.42,37.77],[-122.68,45.52],[-122.33,47.61]],O=Ce({label:"WASHINGTON, D.C.",micro:"THE FIRST YOUTH AI LITERACY PROGRAM IN UNITED STATES HISTORY \xB7 ZEN AI CO \xB7 ",cert:"ZEN AI CERTIFIED",idp:"ZEN-AIL-2026-",ver:"VERIFIED \xB7 ZENAI.WORLD"},64),{label:P,micro:I,cert:N,idp:L,ver:$}=O.at,D={id:"pioneer",still:6.4,data(e){let l=S(T[0][0],T[0][1]);T.map(([t,f])=>S(t,f)).map((t,f)=>({q:t,i:f,dist:f===0?-1:Math.hypot(t[0]-l[0],(t[1]-l[1])*.5)})).sort((t,f)=>t.dist-f.dist).forEach(({q:t},f)=>{e[f*2]=t[0],e[f*2+1]=t[1]}),O.write(e)},code:`fn usNode(i: i32) -> vec2f {
let v: vec4f = u.d[i / 2];
return select(v.zw, v.xy, (i % 2) == 0);
}
fn arcDist(p: vec2f, a: vec2f, b: vec2f, bulge: f32) -> vec2f {
let c: vec2f = b - a;
let len: f32 = max(length(c), 1e-4);
let m: vec2f = 0.5 * (a + b);
var n: vec2f = vec2f(-c.y, c.x) / len;
n = select(n, -n, n.y < 0.0);
let s: f32 = len * bulge;
let r: f32 = (len * len * 0.25 + s * s) / (2.0 * s);
let ctr: vec2f = m - n * (r - s);
let pa: vec2f = a - ctr;
let pb: vec2f = b - ctr;
let pp: vec2f = p - ctr;
let total: f32 = atan2(pa.x * pb.y - pa.y * pb.x, dot(pa, pb));
let ang: f32 = atan2(pa.x * pp.y - pa.y * pp.x, dot(pa, pp));
let t: f32 = ang / total;
let onArc: bool = (t >= 0.0) && (t <= 1.0);
let dArc: f32 = abs(length(pp) - r);
let dEnd: f32 = min(length(p - a), length(p - b));
return vec2f(select(dEnd, dArc, onArc), saturate(t));
}
fn scene(uv: vec2f, p: vec2f) -> vec3f {
let W: f32 = min(aspect() * 1.3, 2.35);
let org: vec2f = vec2f(-W * 0.5, W * 0.25 - 0.015);
let toQ: vec2f = vec2f(1.0 / W, -2.0 / W);
let q: vec2f = (p - org) * toQ;
let sd: f32 = mapD(q) * W;
let dc: vec2f = org + usNode(0) / toQ;
let t: f32 = tnow();
let cyc: f32 = fract(t / 10.0);
let fade: f32 = 1.0 - sstep(0.86, 0.995, cyc);
let inside: f32 = fillAA(sd);
let dDC: f32 = length(p - dc);
let relief: f32 = fbm(p * 6.0 + vec2f(3.0, 1.0), 4);
let tone: f32 = saturate(0.14 + exp(-dDC * 2.6) * 0.52 + relief * 0.42);
let hatch: f32 = engrave(p.y + relief * 0.01, 0.0105, tone) * inside;
let coast: f32 = stroke(sd, 0.7);
let outside: f32 = sstep(-pxs(), pxs(), sd);
let rings: f32 = engraveP(sd, 0.0105, 0.12, pxs()) * outside * (1.0 - sstep(0.0, 0.09, sd));
var arcs: f32 = 0.0;
var heads: f32 = 0.0;
var nodes: f32 = 0.0;
var blooms: f32 = 0.0;
for (var i: i32 = 1; i < 32; i++) {
let np: vec2f = org + usNode(i) / toQ;
let delay: f32 = f32(i) / 31.0 * 0.6;
let k: f32 = saturate((cyc - delay) / 0.14);
let span: f32 = length(np - dc);
let mid: f32 = length(p - 0.5 * (dc + np));
if (mid < span * 0.62 + 0.03) {
let ad: vec2f = arcDist(p, dc, np, 0.17);
let drawn: f32 = 1.0 - sstep(k - 0.02, k, ad.y);
arcs += stroke(ad.x, 0.32) * drawn * step(0.0001, k) * (0.3 + 0.7 * (1.0 - k));
heads += exp(-ad.x / pxs() * 0.55) * exp(-abs(ad.y - k) * 60.0) * (1.0 - step(0.999, k)) * step(0.0001, k);
}
let arrive: f32 = step(0.999, k);
let since: f32 = max(cyc - delay - 0.14, 0.0);
let dn: f32 = length(p - np);
nodes += fillAA(dn - 0.0036) * (0.3 + 0.7 * arrive);
blooms += stroke(dn - since * 0.28, 0.55) * arrive * exp(-since * 10.0);
}
let seal: vec2f = zenSeal(p, dc, 0.036);
let beacon: f32 = stroke(dDC - 0.036 - fract(t * 0.35) * 0.08, 0.5) * (1.0 - fract(t * 0.35));
let arrivals: f32 = clamp(floor((cyc - 0.14) / 0.6 * 31.0) + 1.0, 0.0, 31.0);
let idn: i32 = 117 + i32(floor(t / 10.0)) * 31 + i32(arrivals);
let cx0: f32 = -aspect() * 0.5 + 0.05;
let certL: f32 = textRun(p, vec2f(cx0, -0.268), 0.025,${N.start},${N.count}, 0.15);
let idL: f32 = textRun(p, vec2f(cx0, -0.314), 0.031,${L.start},${L.count}, 0.0);
var idD: f32 = 0.0;
var pw: i32 = 10000;
for (var j: i32 = 0; j < 5; j++) {
idD += digitCov(p, vec2f(cx0 + (13.0 + f32(j)) * 0.031 * 0.6, -0.314), 0.031, (idn / pw) % 10, 0.0);
pw = pw / 10;
}
let verL: f32 = textRun(p, vec2f(cx0, -0.37), 0.018,${$.start},${$.count}, 0.0);
let tick: f32 = exp(-fract(cyc * 31.0 / 0.6) * 6.0) * step(0.14, cyc) * step(cyc, 0.74);
let label: f32 = textRun(p, dc + vec2f(0.026, 0.04), 0.024,${P.start},${P.count}, 0.0);
let micro: f32 = textLoop(p, -0.462, 0.017,${I.start},${I.count}, t * 0.012, 0.0);
let ink: vec3f = inkCol(p, 1.3);
var c: vec3f = ink * (hatch * 0.62 + coast * 0.95 + rings * 0.42);
c += holo(foilPhase(p, 2.2) + 0.25) * arcs * 1.1 * fade;
c += vec3f(1.0, 0.95, 0.86) * (heads * 1.3 + blooms * 0.8) * fade;
c += mix(ink, vec3f(1.0), 0.6) * nodes * 0.9;
let foil: vec3f = mix(vec3f(1.0, 0.9, 0.7), holo(foilPhase(p, 2.0) + 0.1), 0.35);
c += foil * seal.x * 1.1 + vec3f(1.0, 0.93, 0.8) * beacon * 0.7 + u.accent.rgb * (exp(-dDC * 26.0) * 0.5 + seal.y);
c += silver() * label * 0.85 + ink * micro * 0.45;
c += vec3f(0.95, 0.82, 0.55) * certL * 0.95 + silver() * (idL * 0.8 + verL * 0.5);
c += mix(silver(), vec3f(1.0, 0.95, 0.8), tick) * idD * (0.8 + 0.4 * tick);
return c;
}`};import{layoutText as Se}from"./zen-foil.js";var Pe=[-77.04,38.91],C=[[-79.38,43.65],[-.13,51.51],[13.4,52.52],[55.27,25.2],[103.82,1.35],[139.69,35.69]],z=[[-87.63,41.88],[-84.39,33.75],[-96.8,32.78],[-104.99,39.74],[-118.24,34.05],[-122.33,47.61],[-80.19,25.76],[-93.27,44.98]],Ie=C.length+z.length,B=Se({bgc:"BOYS & GIRLS CLUBS",of:"OF GREATER WASHINGTON",x:"\xD7",program:"AI PIONEER PROGRAM",reach:"42 STATES \xB7 12 COUNTRIES",dc:"D.C.",micro:"BOYS & GIRLS CLUBS OF GREATER WASHINGTON \xD7 ZEN AI CO \xB7 AI PIONEER PROGRAM \xB7 "},60),s=B.at;function q([e,l]){let k=e*Math.PI/180,t=l*Math.PI/180;return[Math.cos(t)*Math.sin(k),Math.sin(t),Math.cos(t)*Math.cos(k)]}var H={id:"dmv",still:7,data(e){let l=q(Pe);e.set(l,0),[...C,...z].forEach((k,t)=>{let f=q(k),A=l[0]*f[0]+l[1]*f[1]+l[2]*f[2],Te=Math.acos(Math.max(-1,Math.min(1,A))),y=[f[0]-l[0]*A,f[1]-l[1]*A,f[2]-l[2]*A],E=Math.hypot(y[0],y[1],y[2])||1;e.set([y[0]/E,y[1]/E,y[2]/E,Te],(1+t)*4)}),B.write(e)},code:`const GLOBE_C: vec2f = vec2f(0.25, -0.045);
const GLOBE_R: f32 = 0.38;
const N_HUBS: i32 =${C.length};
const N_ARCS: i32 =${Ie};
const BGC_BLUE: vec3f = vec3f(0.18, 0.58, 0.92);
fn gView(w: vec3f, cy: f32, sy: f32, cx: f32, sx: f32) -> vec3f {
let a: vec3f = vec3f(w.x * cy + w.z * sy, w.y, -w.x * sy + w.z * cy);
return vec3f(a.x, a.y * cx - a.z * sx, a.y * sx + a.z * cx);
}
fn gWorld(v: vec3f, cy: f32, sy: f32, cx: f32, sx: f32) -> vec3f {
let a: vec3f = vec3f(v.x, v.y * cx + v.z * sx, -v.y * sx + v.z * cx);
return vec3f(a.x * cy - a.z * sy, a.y, a.x * sy + a.z * cy);
}
fn gScreen(v: vec3f) -> vec2f { return GLOBE_C + v.xy * GLOBE_R; }
fn gVisible(v: vec3f) -> bool { return (v.z >= 0.0) || (dot(v.xy, v.xy) > 1.0); }
fn handsMark(p: vec2f, c: vec2f, s: f32) -> vec2f {
let d: f32 = logoDist(LOGO_BGC, p, c, s);
let fill: f32 = saturate(0.5 - d / pxs());
let glow: f32 = exp(-max(d, 0.0) / (s * 0.08));
return vec2f(fill, glow);
}
fn scene(uv: vec2f, p: vec2f) -> vec3f {
let t: f32 = tnow();
let lon0: f32 = (-30.0 + 24.0 * sin(t * 0.06)) * (PI / 180.0);
let tilt: f32 = 0.36;
let cy: f32 = cos(-lon0);
let sy: f32 = sin(-lon0);
let cx: f32 = cos(tilt);
let sx: f32 = sin(tilt);
let L: vec3f = normalize(vec3f(-0.55, 0.62, 0.58));
let q: vec2f = (p - GLOBE_C) / GLOBE_R;
let r2: f32 = dot(q, q);
let rr: f32 = sqrt(r2);
let disk: f32 = saturate((1.0 - rr) * GLOBE_R / pxs() + 0.5);
let z: f32 = sqrt(max(1.0 - r2, 0.0));
let n: vec3f = vec3f(q, z);
let wd: vec3f = gWorld(n, cy, sy, cx, sx);
let ll: vec2f = lonLat(wd);
let ld: f32 = worldD(ll);
let lw: f32 = max(fwidth(ld), 1e-5);
let land: f32 = saturate(0.5 - ld / lw) * disk;
let coast: f32 = saturate(1.0 - abs(ld) / lw) * disk;
let lam: f32 = saturate(dot(n, L));
let lines: f32 = engrave(ll.y, 1.25, 0.18 + 0.5 * (1.0 - lam));
let glon: f32 = abs(fract(ll.x / 15.0 + 0.5) - 0.5) * 15.0;
let glat: f32 = abs(fract(ll.y / 15.0 + 0.5) - 0.5) * 15.0;
let grat: f32 = (saturate(1.0 - glon / max(fwidth(ll.x), 1e-4)) + saturate(1.0 - glat / max(fwidth(ll.y), 1e-4))) * disk;
let rimIn: f32 = pow(1.0 - z, 3.0) * disk;
let atmo: f32 = exp(-max(rr - 1.0, 0.0) * GLOBE_R * 26.0) * (1.0 - disk);
let spec: f32 = pow(saturate(dot(reflect(vec3f(0.0, 0.0, -1.0), n), L)), 40.0) * disk * (1.0 - land);
let A: vec3f = u.d[0].xyz;
let va: vec3f = gView(A, cy, sy, cx, sx);
let dcP: vec2f = gScreen(va);
let dcOn: f32 = select(0.0, 1.0, va.z > 0.0);
var arcs: f32 = 0.0;
var trail: f32 = 0.0;
var marks: f32 = 0.0;
var glow: f32 = 0.0;
var rings: f32 = 0.0;
for (var i: i32 = 0; i < N_ARCS; i++) {
let arc: vec4f = u.d[1 + i];
let C: vec3f = arc.xyz;
let om: f32 = arc.w;
let hub: bool = i < N_HUBS;
let lift: f32 = select(0.03 + 0.05 * om, 0.05 + 0.13 * om / PI, hub);
let ph: f32 = fract(t / select(7.0, 10.0, hub) + f32(i) * 0.173);
let head: f32 = saturate(ph / 0.6);
let live: f32 = 1.0 - sstep(0.78, 1.0, ph);
let mid: vec3f = gView((A * cos(om * 0.5) + C * sin(om * 0.5)) * (1.0 + lift), cy, sy, cx, sx);
let midP: vec2f = gScreen(mid);
let reach: f32 = length(gScreen(va) - midP) + 0.05;
if (length(p - midP) < reach + 0.06) {
let da: f32 = om / 12.0;
let cd: f32 = cos(da);
let sd: f32 = sin(da);
var P: vec3f = A;
var Q: vec3f = C;
var prev: vec2f = dcP;
var prevOn: bool = va.z >= 0.0;
var best: f32 = 1e9;
var bestS: f32 = 0.0;
for (var k: i32 = 1; k <= 12; k++) {
let nP: vec3f = P * cd + Q * sd;
Q = Q * cd - P * sd;
P = nP;
let s: f32 = f32(k) / 12.0;
let v: vec3f = gView(P * (1.0 + lift * 4.0 * s * (1.0 - s)), cy, sy, cx, sx);
let sp: vec2f = gScreen(v);
let on: bool = gVisible(v);
if (on && prevOn) {
let dseg: f32 = sdSeg(p, prev, sp);
if (dseg < best) {
best = dseg;
bestS = (f32(k) - 1.0 + segT(p, prev, sp)) / 12.0;
}
}
prev = sp;
prevOn = on;
}
let w: f32 = select(0.35, 0.55, hub);
arcs += lineCov(best / pxs(), w) * 0.5;
trail += lineCov(best / pxs(), w + 0.35) * sstep(head - 0.35, head, bestS) * step(bestS, head) * live;
}
let hs: f32 = head;
let hv: vec3f = gView((A * cos(om * hs) + C * sin(om * hs)) * (1.0 + lift * 4.0 * hs * (1.0 - hs)), cy, sy, cx, sx);
let hp: vec2f = gScreen(hv);
let travelling: f32 = select(0.0, 1.0, gVisible(hv)) * sstep(0.0, 0.04, ph) * (1.0 - sstep(0.56, 0.62, ph));
if (hub) {
let hm: vec2f = handsMark(p, hp, 0.075 + 0.018 * hv.z);
marks += hm.x * travelling;
glow += hm.y * travelling * 0.5;
} else {
glow += exp(-length(p - hp) * 160.0) * travelling;
}
let dv: vec3f = gView(A * cos(om) + C * sin(om), cy, sy, cx, sx);
let ring: f32 = sstep(0.6, 0.64, ph) * (1.0 - sstep(0.64, 0.9, ph));
let rad: f32 = 0.006 + (ph - 0.6) * 0.09;
let dd: f32 = length(p - gScreen(dv));
rings += (lineCov(abs(dd - rad) / pxs(), 0.6) * ring + fillAA(dd - 0.0045) * 0.6) * select(0.0, 1.0, dv.z > 0.0);
}
let db: f32 = length(p - dcP);
let beacon: f32 = (fillAA(db - 0.007) + exp(-db * 70.0) * (0.5 + 0.5 * sin(t * 2.2)) + lineCov(abs(db - 0.016 - fract(t * 0.6) * 0.03) / pxs(), 0.5) * (1.0 - fract(t * 0.6))) * dcOn;
let dcLabel: f32 = textRun(p, dcP + vec2f(-0.062, 0.03), 0.021,${s.dc.start},${s.dc.count}, 0.0) * dcOn;
let zd: f32 = logoDist(LOGO_ZEN, p, vec2f(-0.63, 0.205), 0.15);
let zen: f32 = saturate(0.5 - zd / pxs());
let zenHatch: f32 = engrave(p.x + p.y, 0.0055, 0.6);
let xg: f32 = textRun(p, vec2f(-0.558, 0.226), 0.042,${s.x.start}, 1, 0.0);
let bm: vec2f = handsMark(p, vec2f(-0.40, 0.20), 0.22);
let bgcHatch: f32 = engrave(p.x * 0.7 - p.y, 0.0052, 0.62);
let l1: f32 = textRun(p, vec2f(-0.735, 0.075), 0.034,${s.bgc.start},${s.bgc.count}, 0.25);
let l2: f32 = textRun(p, vec2f(-0.735, 0.032), 0.0235,${s.of.start},${s.of.count}, 0.0);
let l3: f32 = textRun(p, vec2f(-0.735, -0.05), 0.026,${s.program.start},${s.program.count}, 0.15);
let l4: f32 = textRun(p, vec2f(-0.735, -0.092), 0.021,${s.reach.start},${s.reach.count}, 0.0);
let micro: f32 = textLoop(p, -0.462, 0.017,${s.micro.start},${s.micro.count}, t * 0.012, 0.0);
let ink: vec3f = inkCol(p, 1.5);
let foil: vec3f = holo(foilPhase(p, 2.2) + 0.15);
let blue: vec3f = mix(BGC_BLUE, foil, 0.35);
var c: vec3f = vec3f(0.0);
c += vec3f(0.012, 0.03, 0.06) * disk * (0.4 + lam);
c += mix(vec3f(0.55, 0.68, 0.86), foil, 0.3) * land * (0.12 + lines * (0.35 + 0.55 * lam));
c += mix(silver(), foil, 0.5) * coast * 0.55;
c += BGC_BLUE * grat * 0.07 * (1.0 - land);
c += mix(BGC_BLUE, vec3f(0.7, 0.85, 1.0), 0.4) * (rimIn * 0.45 + atmo * 0.55);
c += vec3f(0.9, 0.95, 1.0) * spec * 0.25;
c += mix(BGC_BLUE, silver(), 0.35) * arcs;
c += mix(vec3f(0.75, 0.9, 1.0), foil, 0.3) * trail * 1.2;
c += blue * (marks * (0.75 + 0.25 * bgcHatch) + glow * 0.5);
c += vec3f(1.0, 0.92, 0.75) * rings * 0.8;
c += vec3f(1.0, 0.95, 0.85) * beacon + silver() * dcLabel * 0.8;
c += mix(silver(), foil, 0.4) * zen * (0.45 + 0.55 * zenHatch) + silver() * xg * 0.6;
c += blue * (bm.x * (0.55 + 0.45 * bgcHatch) + bm.y * 0.12);
c += silver() * (l1 * 0.95 + l2 * 0.6) + mix(BGC_BLUE, silver(), 0.4) * (l3 * 0.9 + l4 * 0.6) + ink * micro * 0.45;
return c;
}`};import{layoutText as Ne}from"./zen-foil.js";var G=Ne({lanes:"SHARD 0SHARD 1SHARD 2SHARD 3",block:"BLOCK",mark:"NEAR \xD7 ZEN AI CO",micro:"NEAR PROTOCOL \xD7 ZEN AI CO \xB7 SHARDED \xB7 DECENTRALIZED AI LITERACY \xB7 "},0),{lanes:Le,block:M,mark:U,micro:j}=G.at,F={id:"near",still:2.8,data(e){G.write(e)},code:`fn cabinet(p: vec2f, c: vec2f, hs: vec2f, o: vec2f) -> vec4f {
let a: vec2f = c + vec2f(-hs.x, hs.y);
let b: vec2f = c + vec2f(hs.x, hs.y);
let r: vec2f = c + vec2f(hs.x, -hs.y);
var e: f32 = abs(sdBox(p - c, hs));
e = min(e, sdSeg(p, a, a + o));
e = min(e, sdSeg(p, b, b + o));
e = min(e, sdSeg(p, r, r + o));
e = min(e, sdSeg(p, a + o, b + o));
e = min(e, sdSeg(p, b + o, r + o));
let fm: f32 = fillAA(sdBox(p - c, hs));
let qa: vec2f = p - a;
let tb: f32 = qa.y / o.y;
let ta: f32 = (qa.x - tb * o.x) / (2.0 * hs.x);
let tm: f32 = step(0.0, tb) * step(tb, 1.0) * step(0.0, ta) * step(ta, 1.0);
let qr: vec2f = p - r;
let sb: f32 = qr.x / o.x;
let sa: f32 = (qr.y - sb * o.y) / (2.0 * hs.y);
let sm: f32 = step(0.0, sb) * step(sb, 1.0) * step(0.0, sa) * step(sa, 1.0);
return vec4f(e, fm, tm * (1.0 - fm), sm * (1.0 - fm) * (1.0 - tm));
}
fn scene(uv: vec2f, p: vec2f) -> vec3f {
let t: f32 = tnow();
let period: f32 = 1.2;
let ph: f32 = fract(t / period);
let height: f32 = floor(t / period);
let colX: f32 = -0.07;
let ax: f32 = aspect() * 0.5;
let o: vec2f = vec2f(0.016, 0.012);
var lines: f32 = 0.0;
var faces: f32 = 0.0;
var edges: f32 = 0.0;
var glow: f32 = 0.0;
let laneHover: f32 = clamp(floor((0.36 - mouseP().y) / 0.15 + 0.5), 0.0, 3.0);
for (var i: i32 = 0; i < 4; i++) {
let ly: f32 = 0.33 - f32(i) * 0.15;
let hot: f32 = 1.0 + 0.6 * hov() * step(abs(f32(i) - laneHover), 0.1);
lines += stroke(p.y - ly + 0.033, 0.35) * step(p.x, colX) * step(-ax + 0.17, p.x) * 0.6;
let spacing: f32 = 0.2;
let s: f32 = (p.x - colX) / spacing + 1.0 - ph + f32(i) * 0.13;
let n: f32 = floor(s + 0.5);
let cx: f32 = colX + (n - 1.0 + ph - f32(i) * 0.13) * spacing;
let valid: f32 = step(n, 0.5) * step(-ax + 0.2, cx);
let fb: vec4f = cabinet(p, vec2f(cx, ly), vec2f(0.034, 0.02), o);
edges += stroke(fb.x, 0.45) * valid * hot;
faces += (fb.y * engrave(p.x * 0.6 + p.y, 0.006, 0.22) + fb.z * 0.18 + fb.w * engrave(p.y, 0.004, 0.3)) * valid * hot;
glow += exp(-abs(p.x - colX) * 60.0) * exp(-abs(p.y - ly) * 30.0) * sstep(0.75, 1.0, ph);
}
let colLine: f32 = stroke(p.x - colX - 0.06, 0.4) * step(-0.26, p.y) * step(p.y, 0.42);
let sweep: f32 = exp(-abs(p.y - mix(0.42, -0.26, ease(ph * 1.25))) * 80.0) * stroke(p.x - colX - 0.06, 1.2);
let chainY: f32 = -0.33;
let slot: f32 = 0.19;
let shift: f32 = ease(saturate((ph - 0.02) / 0.3)) * slot;
let k: f32 = floor((colX + shift - p.x) / slot + 0.5);
let bx: f32 = colX + shift - k * slot;
let bvalid: f32 = step(-0.5, k) * step(-ax, bx);
let cb: vec4f = cabinet(p, vec2f(bx, chainY), vec2f(0.058, 0.045), o * 1.5);
edges += stroke(cb.x, 0.6) * bvalid;
faces += (cb.y * engrave(p.y + p.x * 0.3, 0.0055, 0.18) + cb.z * 0.25 + cb.w * engrave(p.x, 0.0035, 0.3)) * bvalid;
let link: f32 = stroke(p.y - chainY - 0.008, 0.35) + stroke(p.y - chainY + 0.008, 0.35);
let gap: f32 = step(0.058, abs(p.x - bx)) * step(-ax, p.x) * step(p.x, colX + 0.06 + shift);
edges += link * gap * 0.7;
let fresh: f32 = exp(-length(p - vec2f(colX + shift, chainY)) * 14.0) * (1.0 - ph);
let hexCell: vec2f = floor((p - vec2f(bx - 0.05, chainY - 0.03)) / vec2f(0.0114, 0.018));
let hq: vec2f = fract((p - vec2f(bx - 0.05, chainY - 0.03)) / vec2f(0.0114, 0.018));
let inHex: f32 = step(0.0, hexCell.x) * step(hexCell.x, 8.0) * step(0.0, hexCell.y) * step(hexCell.y, 2.0) * cb.y * bvalid;
let hv: f32 = h21(hexCell + vec2f(k - height, 3.0) * 17.0);
let hcode: i32 = select(16 + i32(hv * 10.0), 33 + i32(fract(hv * 7.31) * 6.0), hv > 0.62);
let hexG: f32 = glyphCov(hcode, vec2f((hq.x - 0.5) * 0.6 + 0.5, 1.0 - hq.y), 0.018, 0.0) * inHex;
var digits: f32 = 0.0;
let num: f32 = 451203.0 + height;
for (var j: i32 = 0; j < 6; j++) {
let pw: f32 = pow(10.0, f32(5 - j));
let dg: i32 = i32(floor(num / pw) - 10.0 * floor(num / (pw * 10.0)));
digits += digitCov(p, vec2f(colX - 0.08 + f32(j) * 0.0186, -0.405), 0.031, dg, 0.0);
}
let blockLabel: f32 = textRun(p, vec2f(colX - 0.08, -0.375), 0.016,${M.start},${M.count}, 0.0);
var laneLabels: f32 = 0.0;
for (var i: i32 = 0; i < 4; i++) {
laneLabels += textRun(p, vec2f(-ax + 0.045, 0.345 - f32(i) * 0.15), 0.016,${Le.start}+ i * 7, 7, 0.0);
}
let micro: f32 = textLoop(p, 0.478, 0.015,${j.start},${j.count}, -t * 0.01, 0.0);
let nc: vec2f = vec2f(ax - 0.29, 0.05);
let ns: f32 = 0.6;
let nd: f32 = logoDist(LOGO_NEAR, p, nc, ns);
let cell: f32 = 0.0195;
let gq: vec2f = (p - nc) / cell;
let gi: vec2f = floor(gq);
let gf: vec2f = fract(gq) - vec2f(0.5);
let gcen: vec2f = nc + (gi + vec2f(0.5)) * cell;
let inN: f32 = step(logoDist(LOGO_NEAR, gcen, nc, ns), -cell * 0.2);
let build: f32 = fract(t / 14.0);
let order: f32 = h21(gi + vec2f(31.0, 7.0)) * 0.35 + (gcen.y - nc.y + 0.25) * 1.1;
let since: f32 = build * 1.4 - order;
let placed: f32 = step(0.0, since) * (1.0 - sstep(0.93, 1.0, build));
let pop: f32 = exp(-max(since, 0.0) * 30.0) * placed;
let bxd: f32 = sdBox(gf, vec2f(0.36)) * cell;
let mosaic: f32 = saturate(0.5 - bxd / pxs()) * inN * placed;
let mosaicEdge: f32 = lineCov(abs(bxd) / pxs(), 0.3) * inN * placed;
let ghost: f32 = lineCov(abs(bxd) / pxs(), 0.22) * inN * (1.0 - placed) * 0.3;
let outline: f32 = stroke(nd, 0.55) + stroke(nd - 0.012, 0.3) * 0.5;
let mosaicTone: f32 = engrave(p.x * 0.5 + p.y, 0.005, 0.5);
let markTxt: f32 = textRun(p, vec2f(nc.x - 0.135, nc.y - 0.27), 0.024,${U.start},${U.count}, 0.1);
let zs: vec2f = zenSeal(p, vec2f(nc.x + 0.185, nc.y - 0.258), 0.026);
let ink: vec3f = inkCol(p, 1.6);
var c: vec3f = mix(ink, silver(), 0.25) * (edges * 1.25 + faces * 0.8 + lines * 0.6 + colLine * 0.7);
let mint: vec3f = mix(u.accent.rgb, vec3f(0.85, 1.0, 0.95), 0.35);
c += mix(mint, holo(foilPhase(p, 2.0) + 0.3), 0.3) * (mosaic * (0.35 + 0.4 * mosaicTone) + mosaicEdge * 0.7 + ghost);
c += vec3f(1.0, 1.0, 0.95) * pop * inN * 0.9;
c += mix(silver(), mint, 0.4) * outline * 0.85;
c += silver() * markTxt * 0.85 + mix(silver(), holo(foilPhase(p, 2.0)), 0.4) * zs.x * 0.8;
c += holo(foilPhase(p, 2.4) + 0.1) * (sweep * 1.2 + glow * 1.1 + fresh * 0.9);
c += mix(u.accent.rgb, vec3f(1.0), 0.45) * (digits * 0.95 + hexG * 0.6);
c += silver() * (blockLabel + laneLabels) * 0.6 + ink * micro * 0.4;
return c;
}`};import{layoutText as $e}from"./zen-foil.js";var Y=$e({summit:"SUMMIT",head:"TRAILHEAD",camp:"CAMP",north:"N",scale:"0    1    2 MI",micro:"PARKPULSE \xB7 LIVE TRAIL CONDITIONS \xB7 VISITOR INSIGHTS \xB7 RANGER NETWORK \xB7 "},0),i=Y.at,X={id:"parks",still:9,data(e){Y.write(e)},code:`fn terrain(p: vec2f) -> f32 {
let m: vec2f = p - vec2f(0.14, 0.07);
let massif: f32 = 0.62 * exp(-dot(m * vec2f(1.0, 1.35), m * vec2f(1.0, 1.35)) * 5.5);
let ridge: f32 = 0.16 * exp(-pow(abs(p.y - 0.42 * p.x - 0.02) * 6.0, 2.0));
let valley: f32 = -0.12 * exp(-dot(p - vec2f(-0.42, -0.2), p - vec2f(-0.42, -0.2)) * 9.0);
return massif + ridge + valley + fbm(p * 2.6 + vec2f(5.2, 1.3), 5) * 0.22 + 0.13;
}
fn trailPt(i: i32) -> vec2f {
if (i == 0) { return vec2f(-0.62, -0.36); }
if (i == 1) { return vec2f(-0.45, -0.29); }
if (i == 2) { return vec2f(-0.33, -0.16); }
if (i == 3) { return vec2f(-0.21, -0.1); }
if (i == 4) { return vec2f(-0.09, -0.03); }
if (i == 5) { return vec2f(0.03, 0.015); }
return vec2f(0.14, 0.07);
}
fn trailD(p: vec2f) -> vec2f {
var best: f32 = 1e9;
var along: f32 = 0.0;
var acc: f32 = 0.0;
for (var i: i32 = 0; i < 6; i++) {
let a: vec2f = trailPt(i);
let b: vec2f = trailPt(i + 1);
let seg: f32 = sdSeg(p, a, b);
let len: f32 = length(b - a);
if (seg < best) {
best = seg;
along = acc + segT(p, a, b) * len;
}
acc += len;
}
return vec2f(best, along / max(acc, 1e-4));
}
fn scene(uv: vec2f, p: vec2f) -> vec3f {
let t: f32 = tnow();
let h: f32 = terrain(p);
let e: f32 = 0.004;
let gx: f32 = terrain(p + vec2f(e, 0.0)) - h;
let gy: f32 = terrain(p + vec2f(0.0, e)) - h;
let nrm: vec3f = normalize(vec3f(-gx / e, -gy / e, 1.6));
let sun: vec3f = normalize(vec3f(-0.6, 0.55, 0.6));
let shadeAmt: f32 = saturate(1.0 - dot(nrm, sun));
let water: f32 = sstep(0.052, 0.044, h);
let land: f32 = 1.0 - water;
let contour: f32 = engrave(h, 0.028, 0.07) * land;
let index: f32 = engrave(h, 0.14, 0.05) * land;
let hach: f32 = engrave(dot(p, vec2f(0.7, 0.7)), 0.0075, shadeAmt * shadeAmt * 0.55) * land;
let shore: f32 = stroke((h - 0.048) / max(length(vec2f(gx, gy)) / e, 0.05), 0.6);
let lake: f32 = water * engrave(p.y + sin(p.x * 30.0 + t * 0.6) * 0.0015, 0.0085, 0.18);
let tr: vec2f = trailD(p);
let dash: f32 = step(0.45, fract(tr.y * 46.0 - t * 0.5));
let trail: f32 = stroke(tr.x, 0.9) * dash;
let hikerT: f32 = fract(t * 0.035);
let hikerA: f32 = abs(tr.y - hikerT);
let hiker: f32 = fillAA(tr.x - 0.006) * exp(-hikerA * 220.0) + exp(-tr.x * 160.0) * exp(-hikerA * 60.0) * 0.6;
var pings: f32 = 0.0;
for (var i: i32 = 0; i < 3; i++) {
let c: vec2f = select(select(vec2f(0.42, -0.24), vec2f(-0.62, -0.36), i == 1), vec2f(0.14, 0.07), i == 0);
let dd: f32 = length(p - c);
let ring: f32 = fract(t * 0.45 + f32(i) * 0.33);
pings += stroke(dd - ring * 0.07, 0.5) * (1.0 - ring) + fillAA(dd - 0.0055);
}
let rose: vec2f = p - vec2f(aspect() * 0.5 - 0.1, 0.36);
let rr: f32 = length(rose);
let ra: f32 = atan2(rose.x, rose.y);
let star: f32 = fillAA(rr - 0.05 * (0.35 + 0.65 * pow(abs(cos(ra * 2.0)), 9.0))) * 0.8;
let roseRing: f32 = stroke(rr - 0.06, 0.45) + stroke(rr - 0.066, 0.3);
let ticks: f32 = stroke(rr - 0.063, 1.6) * step(0.93, fract(ra / TAU * 32.0 + 0.5));
let scaleBar: f32 = stroke(p.y + 0.4, 0.5) * step(-aspect() * 0.5 + 0.06, p.x) * step(p.x, -aspect() * 0.5 + 0.26)
+ fillAA(sdBox(p - vec2f(-aspect() * 0.5 + 0.11, -0.4), vec2f(0.05, 0.004)));
let labels: f32 = textRun(p, vec2f(0.165, 0.115), 0.019,${i.summit.start},${i.summit.count}, 0.0)
+ textRun(p, vec2f(-0.6, -0.375), 0.017,${i.head.start},${i.head.count}, 0.0)
+ textRun(p, vec2f(0.44, -0.205), 0.017,${i.camp.start},${i.camp.count}, 0.0)
+ textRun(p, vec2f(aspect() * 0.5 - 0.1066, 0.465), 0.022,${i.north.start}, 1, 0.3)
+ textRun(p, vec2f(-aspect() * 0.5 + 0.055, -0.41), 0.014,${i.scale.start},${i.scale.count}, 0.0);
let micro: f32 = textLoop(p, -0.465, 0.015,${i.micro.start},${i.micro.count}, t * 0.01, 0.0);
let ink: vec3f = inkCol(p, 1.2);
let high: vec3f = holo(h * 2.2 + foilPhase(p, 0.6));
var c: vec3f = mix(ink, high, 0.35) * (contour * 0.5 + index * 0.85) + ink * hach * 0.42;
c += vec3f(0.5, 0.75, 1.0) * (lake * 0.45 + shore * 0.7);
c += vec3f(1.0, 0.72, 0.42) * trail * 0.95 + vec3f(1.0, 0.95, 0.85) * hiker * 1.4;
c += mix(u.accent.rgb, vec3f(1.0), 0.4) * pings * 0.8;
c += silver() * (star + roseRing * 0.7 + ticks * 0.5 + scaleBar * 0.7 + labels * 0.75) + ink * micro * 0.4;
return c;
}`};import{layoutText as Oe}from"./zen-foil.js";var W=Oe({prompt:"> a glass flask holding a tiny supernova",step:"STEP",of:"/30",seed:"SEED",micro:"SPARKLAB AI \xB7 PROMPT \xB7 SAMPLE \xB7 ITERATE \xB7 NO-CODE CREATIVE LAB \xB7 "},0),a=W.at,V={id:"spark",still:7.6,data(e){W.write(e)},code:`fn flaskD(p: vec2f) -> f32 {
let neck: f32 = sdBox(p - vec2f(0.0, 0.205), vec2f(0.028, 0.06));
let y: f32 = clamp(p.y, -0.21, 0.15);
let w: f32 = mix(0.19, 0.03, (y + 0.21) / 0.36);
let body: f32 = max(abs(p.x) - w, abs(p.y + 0.03) - 0.18);
let rim: f32 = sdRoundBox(p - vec2f(0.0, 0.268), vec2f(0.042, 0.009), 0.006);
return min(min(neck, body) - 0.008, rim);
}
fn sparkTone(p: vec2f, seed: f32) -> f32 {
let fd: f32 = flaskD(p);
let inside: f32 = sstep(0.004, -0.004, fd);
let level: f32 = -0.03 + 0.008 * sin(p.x * 40.0 + tnow() * 1.6);
let liquid: f32 = inside * sstep(level + 0.004, level - 0.004, p.y);
let c: vec2f = p - vec2f(0.0, -0.115);
let r: f32 = length(c);
let rays: f32 = pow(abs(cos(atan2(c.y, c.x) * (3.0 + floor(h11(seed) * 4.0)) + seed)), 18.0) * exp(-r * 9.0);
let core: f32 = exp(-r * 30.0);
let nebula: f32 = saturate(core + rays * 0.9 + fbm(c * 14.0 + vec2f(seed), 3) * 0.6 * exp(-r * 7.0));
let glass: f32 = exp(-abs(fd) * 160.0) * 0.8;
return saturate(glass + liquid * (0.28 + nebula * 0.9) + inside * (1.0 - liquid) * 0.05);
}
fn scene(uv: vec2f, p: vec2f) -> vec3f {
let t: f32 = tnow();
let cyc: f32 = t / 10.0;
let k: f32 = fract(cyc);
let seed: f32 = floor(cyc) * 7.13 + 1.0;
let a: f32 = ease((k - 0.16) / 0.52) * (1.0 - ease((k - 0.92) / 0.08));
let q: vec2f = p - vec2f(-0.08, -0.04);
let cell: f32 = mix(0.05, 0.0068, ease(a * 1.05));
let rq: vec2f = rot2(0.4) * q / cell;
let id: vec2f = floor(rq);
let cc: vec2f = (rot2(-0.4) * ((id + 0.5) * cell));
let noiseT: f32 = h21(id + vec2f(seed * 31.0, seed * 7.0)) * (0.35 + 0.65 * vnoise(cc * 7.0 + seed));
let tgt: f32 = sparkTone(cc, seed);
let tone: f32 = mix(noiseT * 0.75, tgt, saturate(a * 1.25 - 0.1));
let f: vec2f = fract(rq) - 0.5;
let rad: f32 = sqrt(saturate(tone)) * 0.52;
let dotsAA: f32 = saturate((rad - length(f)) * cell / pxs() + 0.5);
let frameBox: f32 = sdBox(q, vec2f(0.33, 0.33));
let inFrame: f32 = fillAA(frameBox);
let dots: f32 = mix(PI * rad * rad, dotsAA, sstep(2.0, 4.0, cell / pxs())) * inFrame;
let fd: f32 = flaskD(q);
let lineArt: f32 = (stroke(fd, 0.8) + engrave(q.y, 0.007, 0.3) * fillAA(fd) * sstep(-0.02, -0.05, q.y)) * sstep(0.82, 1.0, a);
let frame: f32 = stroke(frameBox, 0.5) + stroke(sdBox(q, vec2f(0.345, 0.345)), 0.3) * 0.6;
let bar: f32 = sdRoundBox(p - vec2f(0.0, 0.405), vec2f(aspect() * 0.5 - 0.05, 0.032), 0.012);
let promptBox: f32 = stroke(bar, 0.5);
let typed: i32 = i32(clamp((k - 0.02) * 260.0, 0.0,${a.prompt.count}.0));
let promptText: f32 = textRun(p, vec2f(-aspect() * 0.5 + 0.075, 0.42), 0.028,${a.prompt.start}, typed, 0.0);
let caretX: f32 = -aspect() * 0.5 + 0.075 + f32(typed) * 0.028 * 0.6 + 0.008;
let caret: f32 = fillAA(sdBox(p - vec2f(caretX, 0.405), vec2f(0.006, 0.013))) * step(0.5, fract(t * 1.8));
let stepN: i32 = i32(floor(a * 30.0 + 0.001));
let sx: f32 = 0.34;
let hud: f32 = textRun(p, vec2f(sx, 0.2), 0.02,${a.step.start},${a.step.count}, 0.0)
+ digitCov(p, vec2f(sx, 0.16), 0.05, stepN / 10, 0.0)
+ digitCov(p, vec2f(sx + 0.03, 0.16), 0.05, stepN % 10, 0.0)
+ textRun(p, vec2f(sx + 0.064, 0.13), 0.02,${a.of.start},${a.of.count}, 0.0)
+ textRun(p, vec2f(sx, 0.02), 0.016,${a.seed.start},${a.seed.count}, 0.0);
var seedDigits: f32 = 0.0;
let sn: f32 = 40000.0 + floor(h11(seed) * 59999.0);
for (var j: i32 = 0; j < 5; j++) {
let pw: f32 = pow(10.0, f32(4 - j));
seedDigits += digitCov(p, vec2f(sx + f32(j) * 0.0168, -0.005), 0.028, i32(floor(sn / pw) - 10.0 * floor(sn / (pw * 10.0))), 0.0);
}
let meter: f32 = fillAA(sdBox(p - vec2f(sx + 0.075, -0.08), vec2f(0.075, 0.003))) * 0.25
+ fillAA(sdBox(p - vec2f(sx + 0.075 * a, -0.08), vec2f(0.075 * a, 0.003)));
let micro: f32 = textLoop(p, -0.462, 0.016,${a.micro.start},${a.micro.count}, t * 0.012, 0.0);
let ink: vec3f = inkCol(p, 1.4);
let hot: vec3f = mix(vec3f(1.0, 0.78, 0.45), holo(foilPhase(q, 3.0)), 0.35);
let glow: f32 = exp(-length(q - vec2f(0.0, -0.115)) * 9.0) * a;
var c: vec3f = mix(ink * 0.8, hot, saturate(tone * 1.2 - 0.25)) * dots * 0.95;
c += silver() * lineArt * 0.55 + hot * glow * 0.35;
c += ink * (frame * 0.7 + promptBox * 0.55) + silver() * (promptText * 0.9 + caret * 0.8 + hud * 0.75 + seedDigits * 0.55 + meter * 0.8);
c += ink * micro * 0.4;
return c;
}`};import{layoutText as De}from"./zen-foil.js";var K=De({capA:"NO. 07 \xB7 ETCHING",capB:"NO. 12 \xB7 OIL ON LINEN",capC:"NO. 21 \xB7 STUDY",micro:"CURATEPRO \xB7 CURATE \xB7 SHOWCASE \xB7 SELL \xB7 GALLERY-GRADE PRESENTATION FOR ARTISTS \xB7 "},0),v=K.at,Z={id:"gallery",still:4,data(e){K.write(e)},code:`fn artA(q: vec2f) -> f32 {
let ridge: f32 = 0.1 + 0.18 * abs(sin(q.x * 3.1 + 0.4)) * (1.0 - abs(q.x) * 0.8) - 0.05 * sin(q.x * 9.0);
let mtn: f32 = sstep(0.0, -0.01, q.y - ridge + 0.2);
return mtn * engrave(q.x * 0.8 + q.y, 0.03, 0.35) + stroke(q.y - ridge + 0.2, 0.5) * 2.0;
}
fn artB(q: vec2f, t: f32) -> f32 {
let sun: f32 = fillAA((length(q - vec2f(0.0, 0.08)) - 0.12) * 0.3) * engrave(q.y, 0.022, 0.5);
let sea: f32 = step(q.y, -0.02) * engrave(q.y + sin(q.x * 10.0 + t) * 0.006, 0.018, 0.22);
return sun + sea + stroke((q.y + 0.02) * 0.3, 0.5);
}
fn artC(q: vec2f) -> f32 {
let r: f32 = length(q - vec2f(0.04, 0.02));
return engraveP(r, 0.035, 0.2, pxs() * 3.4) * step(r, 0.24) + stroke((r - 0.2) * 0.3, 0.6) + stroke(sdSeg(q, vec2f(-0.25, -0.2), vec2f(0.2, 0.25)) * 0.3, 0.5);
}
fn frameArt(p: vec2f, c: vec2f, hs: vec2f, kind: i32, t: f32) -> vec2f {
let q: vec2f = (p - c) / hs.y * 0.3;
let box: f32 = sdBox(p - c, hs);
let outer: f32 = stroke(box - 0.012, 0.9) + stroke(box - 0.004, 0.4);
let inner: f32 = fillAA(box);
let art: f32 = select(select(artC(q), artB(q, t), kind == 1), artA(q), kind == 0) * inner;
return vec2f(outer, art);
}
fn scene(uv: vec2f, p: vec2f) -> vec3f {
let t: f32 = tnow();
let vp: vec2f = vec2f(0.0, 0.06);
let wall: vec2f = vec2f(0.5, 0.29);
let wc: vec2f = vec2f(0.0, 0.05);
let onWall: f32 = fillAA(sdBox(p - wc, wall));
let below: f32 = sstep(wc.y - wall.y + 0.002, wc.y - wall.y - 0.002, p.y);
let dy: f32 = max(vp.y - p.y, 1e-3);
let z: f32 = 0.34 / dy;
let fx: f32 = (p.x - vp.x) * z;
let boards: f32 = engraveP(fx, 0.16, 0.035, max(fwidth(fx), 1e-5)) * below;
let joints: f32 = engraveP(z + floor(fx / 0.16) * 0.37, 0.9, 0.018, max(fwidth(z), 1e-5)) * below;
let fog: f32 = saturate(1.0 / (z * 0.55));
let above: f32 = sstep(wc.y + wall.y - 0.002, wc.y + wall.y + 0.002, p.y);
let zc: f32 = 0.3 / max(p.y - vp.y, 1e-3);
let track: f32 = engraveP(zc, 0.7, 0.04, max(fwidth(zc), 1e-5)) * above * stroke(p.x * zc * 0.04, 2.5);
let side: f32 = (1.0 - onWall) * (1.0 - below) * (1.0 - above);
let sideLines: f32 = engrave(atan2(p.y - vp.y, abs(p.x - vp.x)), 0.05, 0.08) * side * 0.6;
let corner: f32 = stroke(sdSeg(p, wc + wall, vec2f(aspect(), wc.y + wall.y + (aspect() - wall.x) * 0.55)), 0.5)
+ stroke(sdSeg(p, wc + vec2f(-wall.x, wall.y), vec2f(-aspect(), wc.y + wall.y + (aspect() - wall.x) * 0.55)), 0.5)
+ stroke(sdSeg(p, wc + vec2f(wall.x, -wall.y), vec2f(aspect(), wc.y - wall.y - (aspect() - wall.x) * 0.9)), 0.5)
+ stroke(sdSeg(p, wc - wall, vec2f(-aspect(), wc.y - wall.y - (aspect() - wall.x) * 0.9)), 0.5);
let wallEdge: f32 = stroke(sdBox(p - wc, wall), 0.6);
let fa: vec2f = frameArt(p, vec2f(-0.3, 0.07), vec2f(0.1, 0.12), 0, t);
let fb: vec2f = frameArt(p, vec2f(0.0, 0.09), vec2f(0.13, 0.15), 1, t);
let fc: vec2f = frameArt(p, vec2f(0.29, 0.06), vec2f(0.09, 0.11), 2, t);
let frames: f32 = fa.x + fb.x + fc.x;
let art: f32 = fa.y + fb.y + fc.y;
let idle: vec2f = vec2f(sin(t * 0.32) * 0.3, 0.08);
let aim: vec2f = mix(idle, mouseP(), hov());
let sd: vec2f = (p - aim) * vec2f(1.0, 0.75);
let spot: f32 = exp(-dot(sd, sd) * 14.0);
let cone: f32 = exp(-pow((p.x - aim.x) * 3.0 / max(p.y - aim.y + 0.35, 0.05), 2.0)) * sstep(aim.y, 0.5, p.y) * 0.18;
let sale: f32 = fract(t / 9.0);
let dotA: f32 = fillAA(length(p - vec2f(-0.21, -0.075)) - 0.0075) * step(0.2, sale);
let dotB: f32 = fillAA(length(p - vec2f(0.12, -0.085)) - 0.0075) * step(0.5, sale);
let dotC: f32 = fillAA(length(p - vec2f(0.37, -0.07)) - 0.0075) * step(0.78, sale);
let pop: f32 = stroke(length(p - vec2f(0.12, -0.085)) - (sale - 0.5) * 0.5, 0.6) * step(0.5, sale) * exp(-(sale - 0.5) * 30.0);
let caps: f32 = textRun(p, vec2f(-0.4, -0.083), 0.0125,${v.capA.start},${v.capA.count}, 0.0)
+ textRun(p, vec2f(-0.13, -0.093), 0.0125,${v.capB.start},${v.capB.count}, 0.0)
+ textRun(p, vec2f(0.2, -0.083), 0.0125,${v.capC.start},${v.capC.count}, 0.0);
let micro: f32 = textLoop(p, -0.468, 0.015,${v.micro.start},${v.micro.count}, t * 0.01, 0.0);
let ink: vec3f = inkCol(p, 1.2);
let warm: vec3f = vec3f(1.0, 0.9, 0.74);
let lit: f32 = 0.35 + spot * 1.4;
var c: vec3f = ink * (boards * 0.4 * fog + joints * 0.3 * fog + track * 0.35 + sideLines * 0.35 + corner * 0.5 + wallEdge * 0.55);
c += mix(ink, silver(), 0.5) * frames * (0.55 + spot * 0.8);
c += mix(ink, warm, 0.45) * art * lit * 0.75;
c += warm * (spot * 0.06 * onWall + cone);
c += vec3f(1.0, 0.33, 0.32) * (dotA + dotB + dotC + pop);
c += silver() * caps * 0.55 + ink * micro * 0.4;
return c;
}`};import{layoutText as qe}from"./zen-foil.js";var _=qe({axes:"INNOVATION  METHOD     DATA     IMPACT    DESIGN   DELIVERY ",teams:"TEAM 04TEAM 11TEAM 07TEAM 19TEAM 02",score:"CONSENSUS",judges:"3 JUDGES",micro:"STEMSCORE \xB7 RUBRICS \xB7 BLIND JUDGING \xB7 LIVE LEADERBOARD \xB7 COMPETITION PIPELINE \xB7 "},0),d=_.at,Q={id:"stem",still:5,data(e){_.write(e)},code:`const RC: vec2f = vec2f(-0.27, -0.03);
const RR: f32 = 0.3;
fn judgeScore(j: i32, i: i32) -> f32 {
let t: f32 = tnow();
return 0.38 + 0.56 * vnoise(vec2f(f32(i) * 3.1 + f32(j) * 11.7, t * 0.22 + f32(j) * 0.7));
}
fn axisDir(i: i32) -> vec2f {
let a: f32 = PI * 0.5 - f32(i) * TAU / 6.0;
return vec2f(cos(a), sin(a));
}
fn radarV(j: i32, i: i32) -> vec2f {
let ii: i32 = i % 6;
var s: f32 = 0.0;
if (j == 3) {
s = (judgeScore(0, ii) + judgeScore(1, ii) + judgeScore(2, ii)) / 3.0;
} else {
s = judgeScore(j, ii);
}
return RC + axisDir(ii) * RR * s;
}
fn radarEdge(p: vec2f, j: i32) -> f32 {
var d: f32 = 1e9;
for (var i: i32 = 0; i < 6; i++) {
d = min(d, sdSeg(p, radarV(j, i), radarV(j, i + 1)));
}
return d;
}
fn radarInside(p: vec2f, j: i32) -> f32 {
let q: vec2f = p - RC;
let a: f32 = fract(0.25 - atan2(q.y, q.x) / TAU + 1.0) * 6.0;
let k: i32 = i32(floor(a)) % 6;
let v0: vec2f = radarV(j, k);
let v1: vec2f = radarV(j, k + 1);
let e: vec2f = v1 - v0;
let sideC: f32 = e.x * (RC.y - v0.y) - e.y * (RC.x - v0.x);
let sideP: f32 = e.x * (p.y - v0.y) - e.y * (p.x - v0.x);
return step(0.0, sideC * sideP);
}
fn scene(uv: vec2f, p: vec2f) -> vec3f {
let t: f32 = tnow();
let q: vec2f = p - RC;
let rho: f32 = max(max(abs(q.x), abs(dot(q, vec2f(0.5, 0.8660254)))), abs(dot(q, vec2f(-0.5, 0.8660254)))) / 0.8660254;
var web: f32 = 0.0;
for (var l: i32 = 1; l <= 5; l++) {
web += stroke((rho - RR * f32(l) * 0.2) * 0.87, select(0.35, 0.6, l == 5));
}
var spokes: f32 = 0.0;
for (var i: i32 = 0; i < 6; i++) {
spokes += stroke(sdSeg(p, RC, RC + axisDir(i) * RR), 0.35);
}
let ang: f32 = atan2(q.y, q.x);
let weave: f32 = engraveP(rho + 0.006 * sin(ang * 18.0 + rho * 60.0), 0.012, 0.08, pxs()) * step(rho, RR) * 0.35;
let j0: f32 = stroke(radarEdge(p, 0), 0.45);
let j1: f32 = stroke(radarEdge(p, 1), 0.45) * step(0.5, fract(ang * 9.0 + t * 0.3));
let j2: f32 = stroke(radarEdge(p, 2), 0.7) * step(0.72, fract(ang * 24.0));
let inside: f32 = radarInside(p, 3);
let fillC: f32 = inside * engrave(p.x * 0.5 - p.y, 0.0075, 0.3);
let edgeC: f32 = stroke(radarEdge(p, 3), 0.9);
var verts: f32 = 0.0;
for (var i: i32 = 0; i < 6; i++) {
verts += fillAA(length(p - radarV(3, i)) - 0.0065);
}
var labels: f32 = 0.0;
for (var i: i32 = 0; i < 6; i++) {
let anchor: vec2f = RC + axisDir(i) * (RR + 0.048);
let ls: f32 = 0.0165;
labels += textRun(p, anchor + vec2f(-3.0 * ls, ls * 0.5), ls,${d.axes.start}+ i * 10, 10, 0.0);
}
let bx: f32 = 0.13;
let bw: f32 = aspect() * 0.5 - 0.06 - bx - 0.12;
var best: f32 = 0.0;
for (var i: i32 = 0; i < 5; i++) {
best = max(best, vnoise(vec2f(f32(i) * 5.3, t * 0.18)));
}
var board: f32 = 0.0;
var lead: f32 = 0.0;
var nums: f32 = 0.0;
for (var i: i32 = 0; i < 5; i++) {
let y: f32 = 0.26 - f32(i) * 0.115;
let v: f32 = vnoise(vec2f(f32(i) * 5.3, t * 0.18));
let isLead: f32 = step(best - 0.0001, v);
let score: f32 = 70.0 + 28.0 * v;
let len: f32 = bw * (score - 60.0) / 40.0;
let bar: f32 = fillAA(sdBox(p - vec2f(bx + len * 0.5, y - 0.03), vec2f(len * 0.5, 0.006)));
let track: f32 = stroke(sdBox(p - vec2f(bx + bw * 0.5, y - 0.03), vec2f(bw * 0.5, 0.006)), 0.3);
board += track * 0.5 + bar * (1.0 - isLead) + textRun(p, vec2f(bx, y + 0.012), 0.017,${d.teams.start}+ i * 7, 7, 0.0) * 0.8;
lead += bar * isLead;
let sx: f32 = bx + bw + 0.02;
let s10: i32 = i32(floor(score * 10.0 + 0.5));
nums += digitCov(p, vec2f(sx, y - 0.012), 0.032, (s10 / 100) % 10, 0.0)
+ digitCov(p, vec2f(sx + 0.0192, y - 0.012), 0.032, (s10 / 10) % 10, 0.0)
+ fillAA(length(p - vec2f(sx + 0.041, y - 0.04)) - 0.002)
+ digitCov(p, vec2f(sx + 0.046, y - 0.012), 0.032, s10 % 10, 0.0);
}
var total: f32 = 0.0;
for (var i: i32 = 0; i < 6; i++) {
total += (judgeScore(0, i) + judgeScore(1, i) + judgeScore(2, i)) / 3.0;
}
let pct: i32 = i32(floor(total / 6.0 * 1000.0 + 0.5));
let hx: f32 = -aspect() * 0.5 + 0.05;
let head: f32 = textRun(p, vec2f(hx, 0.45), 0.017,${d.score.start},${d.score.count}, 0.0)
+ textRun(p, vec2f(hx, 0.335), 0.014,${d.judges.start},${d.judges.count}, 0.0)
+ digitCov(p, vec2f(hx, 0.425), 0.06, (pct / 100) % 10, 0.0)
+ digitCov(p, vec2f(hx + 0.036, 0.425), 0.06, (pct / 10) % 10, 0.0)
+ fillAA(length(p - vec2f(hx + 0.077, 0.372)) - 0.003)
+ digitCov(p, vec2f(hx + 0.083, 0.425), 0.06, pct % 10, 0.0);
let micro: f32 = textLoop(p, -0.465, 0.015,${d.micro.start},${d.micro.count}, t * 0.01, 0.0);
let ink: vec3f = inkCol(p, 1.5);
let gold: vec3f = vec3f(1.0, 0.82, 0.48);
var c: vec3f = ink * (web * 0.5 + spokes * 0.4 + weave * 0.6);
c += holo(0.1 + foilPhase(p, 1.0)) * j0 * 0.7 + holo(0.45 + foilPhase(p, 1.0)) * j1 * 0.7 + holo(0.75 + foilPhase(p, 1.0)) * j2 * 0.8;
c += mix(ink, u.accent.rgb, 0.5) * fillC * 0.55 + mix(u.accent.rgb, vec3f(1.0), 0.5) * (edgeC * 1.1 + verts);
c += ink * board * 0.75 + gold * lead * 0.95 + silver() * (nums * 0.8 + labels * 0.6 + head * 0.85);
c += ink * micro * 0.4;
return c;
}`};import{layoutText as ze}from"./zen-foil.js";var Be=[["I10","ESSENTIAL HYPERTENSION"],["E11.9","TYPE 2 DIABETES"],["J45.909","ASTHMA, UNCOMPLICATED"],["R07.9","CHEST PAIN, UNSPEC."],["Z00.00","ADULT GENERAL EXAM"],["K21.9","GERD W/O ESOPHAGITIS"],["F41.1","GENERALIZED ANXIETY"],["N39.0","UTI, SITE NOT SPEC."]].map(([e,l])=>e.padEnd(8," ")+l.padEnd(22," ").slice(0,22)).join(""),J=ze({rows:Be,head:"ICD-10-CM LOOKUP",lock:"AES-256",bpm:"BPM",micro:"MEDCODE \xB7 INTELLIGENT CODE LOOKUP \xB7 ENCRYPTED WORKFLOWS \xB7 HIPAA-MINDED \xB7 "},0),n=J.at,ee={id:"medcode",still:3.1,data(e){J.write(e)},code:`fn ecg(tau: f32) -> f32 {
let f: f32 = fract(tau / 0.8333);
let pw: f32 = 0.09 * exp(-pow((f - 0.12) / 0.03, 2.0));
let qw: f32 = -0.08 * exp(-pow((f - 0.232) / 0.012, 2.0));
let rw: f32 = 0.66 * exp(-pow((f - 0.255) / 0.0145, 2.0));
let sw: f32 = -0.18 * exp(-pow((f - 0.28) / 0.014, 2.0));
let tw: f32 = 0.17 * exp(-pow((f - 0.47) / 0.05, 2.0));
return pw + qw + rw + sw + tw;
}
fn traceAt(x: f32, t: f32, hx: f32, left: f32, width: f32, sweepT: f32) -> vec2f {
var behind: f32 = hx - x;
behind = select(behind + width, behind, behind >= 0.0);
let tau: f32 = t - behind / width * sweepT;
return vec2f(x, -0.07 + ecg(tau) * 0.42);
}
fn sdHeart(q: vec2f) -> f32 {
let r: vec2f = vec2f(abs(q.x), q.y);
let a: f32 = length(r - vec2f(0.25, 0.75)) - 0.35355339;
let m: f32 = 0.5 * max(r.x + r.y, 0.0);
let b: f32 = sqrt(min(dot(r - vec2f(0.0, 1.0), r - vec2f(0.0, 1.0)), dot(r - vec2f(m), r - vec2f(m)))) * sign(r.x - r.y);
return select(b, a, r.y + r.x > 1.0);
}
fn scene(uv: vec2f, p: vec2f) -> vec3f {
let t: f32 = tnow();
let left: f32 = -aspect() * 0.5 + 0.05;
let right: f32 = 0.07;
let width: f32 = right - left;
let base: f32 = -0.07;
let inPanel: f32 = step(left, p.x) * step(p.x, right) * step(-0.36, p.y) * step(p.y, 0.3);
let gx: f32 = p.x - left;
let gy: f32 = p.y + 0.36;
let minor: f32 = max(engraveP(gx, 0.022, 0.05, pxs()), engraveP(gy, 0.022, 0.05, pxs()));
let major: f32 = max(engraveP(gx, 0.11, 0.025, pxs()), engraveP(gy, 0.11, 0.025, pxs()));
let paper: f32 = (minor * 0.35 + major * 0.8) * inPanel;
let sweepT: f32 = 3.6;
let hx: f32 = left + fract(t / sweepT) * width;
var behind: f32 = hx - p.x;
behind = select(behind + width, behind, behind >= 0.0);
let hpx: f32 = pxs() * 1.25;
var dist: f32 = 1e9;
var prev: vec2f = traceAt(p.x - 2.0 * hpx, t, hx, left, width, sweepT);
for (var k: i32 = -1; k <= 2; k++) {
let cur: vec2f = traceAt(p.x + f32(k) * hpx, t, hx, left, width, sweepT);
dist = min(dist, sdSeg(p, prev, cur));
prev = cur;
}
let age: f32 = behind / width;
let phosphor: f32 = exp(-age * 2.6) * sstep(0.0, 0.035, behind);
let trace: f32 = (stroke(dist, 0.9) + halo(dist, 140.0) * 0.4) * phosphor * inPanel;
let headY: f32 = base + ecg(t) * 0.42;
let head: f32 = exp(-length(p - vec2f(hx, headY)) * 120.0) + fillAA(length(p - vec2f(hx, headY)) - 0.005);
let frame: f32 = stroke(sdBox(p - vec2f((left + right) * 0.5, -0.03), vec2f(width * 0.5, 0.33)), 0.6);
let beat: f32 = exp(-fract(t / 0.8333 - 0.255) * 9.0);
let hs: f32 = 0.034 * (1.0 + beat * 0.22);
let heart: f32 = fillAA(sdHeart((p - vec2f(left + 0.045, 0.218)) / hs) * hs);
let bpmD: f32 = digitCov(p, vec2f(left + 0.08, 0.265), 0.056, 7, 0.0) + digitCov(p, vec2f(left + 0.1136, 0.265), 0.056, 2, 0.0)
+ textRun(p, vec2f(left + 0.153, 0.236), 0.016,${n.bpm.start},${n.bpm.count}, 0.0);
let cx: f32 = 0.13;
let activeRow: f32 = floor(t / 1.6667 + 0.0001) - 8.0 * floor(t / 13.3336);
var table: f32 = 0.0;
var hot: f32 = 0.0;
for (var i: i32 = 0; i < 8; i++) {
let y: f32 = 0.22 - f32(i) * 0.072;
let on: f32 = 1.0 - step(0.5, abs(f32(i) - activeRow));
let row: f32 = textRun(p, vec2f(cx, y), 0.0185,${n.rows.start}+ i * 30, 30, select(0.0, 0.25, on > 0.5));
table += row * (1.0 - on) * 0.55;
hot += row * on;
}
let selY: f32 = 0.22 - activeRow * 0.072 - 0.0095;
let sel: f32 = stroke(sdRoundBox(p - vec2f(cx + 0.17, selY), vec2f(0.19, 0.022), 0.008), 0.5);
let selGlow: f32 = exp(-abs(p.y - selY) * 70.0) * step(cx - 0.02, p.x) * step(p.x, cx + 0.36) * 0.12;
let rules: f32 = stroke(p.y - 0.268, 0.4) * step(cx, p.x) * step(p.x, aspect() * 0.5 - 0.05);
let headLbl: f32 = textRun(p, vec2f(cx, 0.31), 0.017,${n.head.start},${n.head.count}, 0.0);
let lp: vec2f = p - vec2f(aspect() * 0.5 - 0.17, 0.295);
let lockBody: f32 = sdRoundBox(lp, vec2f(0.016, 0.012), 0.003);
let shackle: f32 = abs(length((lp - vec2f(0.0, 0.012)) * vec2f(1.0, 0.9)) - 0.011) - 0.0025;
let lock: f32 = fillAA(lockBody) + fillAA(max(shackle, -(lp.y - 0.012)));
let lockLbl: f32 = textRun(p, vec2f(aspect() * 0.5 - 0.145, 0.305), 0.015,${n.lock.start},${n.lock.count}, 0.0);
let micro: f32 = textLoop(p, -0.465, 0.015,${n.micro.start},${n.micro.count}, t * 0.01, 0.0);
let ink: vec3f = inkCol(p, 1.4);
let phos: vec3f = mix(u.accent.rgb, vec3f(0.85, 1.0, 0.95), 0.35);
var c: vec3f = ink * (paper * 0.4 + frame * 0.6 + rules * 0.4);
c += phos * trace * 1.15 + vec3f(1.0) * head;
c += vec3f(1.0, 0.45, 0.48) * heart * (0.6 + beat * 0.6) + silver() * bpmD * 0.85;
c += ink * table + mix(phos, vec3f(1.0), 0.4) * hot * (0.8 + beat * 0.3) + phos * (sel * 0.7 + selGlow);
c += silver() * (headLbl * 0.7 + lock * 0.75 + lockLbl * 0.6) + ink * micro * 0.4;
c += zenStamp(p);
return c;
}`};import{layoutText as He}from"./zen-foil.js";var te=He({plain:"PATIENT RECORD 0472",lp:"PLAINTEXT",lc:"CIPHERTEXT",lk:"KEY",micro:"CLINICALCIPHER \xB7 ENCRYPT \xB7 DECODE \xB7 CLINICAL WORKFLOWS WITH PRECISION \xB7 "},0),o=te.at,le={id:"cipher",still:4.4,data(e){te.write(e)},code:`const DC: vec2f = vec2f(-0.3, -0.01);
fn keyShift(k: f32) -> f32 {
let v: f32 = k * 7.0 + 3.0;
return v - 26.0 * floor(v / 26.0);
}
fn ringGlyph(p: vec2f, rIn: f32, rOut: f32, rot: f32) -> f32 {
let d: vec2f = p - DC;
let r: f32 = length(d);
let a: f32 = atan2(d.x, d.y);
let s: f32 = fract(a / TAU + 1.0) * 26.0 + rot;
let j: i32 = i32(floor(s)) % 26;
let h: f32 = rOut - rIn;
let arc: f32 = TAU * r / 26.0;
let q: vec2f = vec2f(0.5 + (fract(s) - 0.5) * arc / h, (rOut - r) / h);
let inside: bool = (r > rIn) && (r < rOut);
return select(0.0, glyphCov(33 + j, q, h, 0.0), inside);
}
fn scene(uv: vec2f, p: vec2f) -> vec3f {
let t: f32 = tnow();
let key: f32 = floor(t / 3.2);
let k: f32 = fract(t / 3.2);
let s0: f32 = keyShift(key - 1.0);
let s1: f32 = keyShift(key);
let delta: f32 = s1 - s0 - 26.0 * floor((s1 - s0) / 26.0);
let turning: f32 = ease(k / 0.28);
let rot: f32 = s0 + delta * turning;
let shift: i32 = i32(s1 + 0.5);
let d: vec2f = p - DC;
let r: f32 = length(d);
let a: f32 = atan2(d.x, d.y);
let outer: f32 = ringGlyph(p, 0.292, 0.352, 0.0);
let inner: f32 = ringGlyph(p, 0.218, 0.278, rot);
let rims: f32 = stroke(r - 0.36, 0.8) + stroke(r - 0.288, 0.5) + stroke(r - 0.282, 0.5) + stroke(r - 0.212, 0.8) + stroke(r - 0.368, 0.35);
let sep: f32 = fract(a / TAU * 26.0 + 0.5);
let ticks: f32 = stroke(min(sep, 1.0 - sep) * TAU * r / 26.0, 0.35) * step(0.288, r) * step(r, 0.36);
let sepIn: f32 = fract(a / TAU * 26.0 + 0.5 + rot);
let ticksIn: f32 = stroke(min(sepIn, 1.0 - sepIn) * TAU * r / 26.0, 0.35) * step(0.212, r) * step(r, 0.282);
let knurl: f32 = stroke(r - 0.392, 1.6) * step(0.55, fract(a / TAU * 120.0)) * 0.7;
var rosette: f32 = 0.0;
for (var i: i32 = 0; i < 7; i++) {
let fi: f32 = f32(i);
let rr: f32 = 0.13 + 0.035 * sin(a * 9.0 + fi * 0.9 + rot * 0.24) + fi * 0.006;
rosette += stroke(r - rr, 0.35);
}
rosette *= step(r, 0.205);
let crossD: f32 = min(sdBox(d, vec2f(0.022, 0.065)), sdBox(d, vec2f(0.065, 0.022)));
let crossInk: f32 = stroke(crossD, 0.7) + fillAA(crossD) * engrave(d.x + d.y, 0.0065, 0.35);
let hub: f32 = fillAA(crossD) * 0.15;
let tri: vec2f = p - DC - vec2f(0.0, 0.405);
let pointer: f32 = fillAA(max(abs(tri.x) * 1.4 + tri.y * 0.8, -tri.y - 0.02) - 0.0);
let px0: f32 = 0.16;
let size: f32 = 0.034;
let adv: f32 = size * 0.6;
let plain: f32 = textRun(p, vec2f(px0, 0.215), size,${o.plain.start},${o.plain.count}, 0.0);
let lx: f32 = (p.x - px0) / adv;
let ly: f32 = (0.065 - p.y) / size;
let ci: i32 = i32(floor(lx));
let inRow: bool = (lx >= 0.0) && (ly >= 0.0) && (ly <= 1.0) && (ci <${o.plain.count});
let pc: i32 = charAt(${o.plain.start}+ clamp(ci, 0,${o.plain.count-1}));
let isLetter: bool = (pc >= 33) && (pc <= 58);
let enc: i32 = select(pc, 33 + ((pc - 33 + shift) % 26), isLetter);
let scr: bool = (turning < 0.999) && (h21(vec2f(f32(ci), floor(t * 18.0))) < (1.0 - turning)) && isLetter;
let shown: i32 = select(enc, 33 + i32(h21(vec2f(f32(ci) + 7.0, floor(t * 22.0))) * 26.0), scr);
let cq: vec2f = vec2f((fract(lx) - 0.5) * 0.6 + 0.5, ly);
let cipherRow: f32 = select(0.0, glyphCov(shown, cq, size, 0.0), inRow && (pc > 0));
let labels: f32 = textRun(p, vec2f(px0, 0.275), 0.016,${o.lp.start},${o.lp.count}, 0.0)
+ textRun(p, vec2f(px0, 0.125), 0.016,${o.lc.start},${o.lc.count}, 0.0)
+ textRun(p, vec2f(px0, -0.07), 0.016,${o.lk.start},${o.lk.count}, 0.0);
let keyD: f32 = digitCov(p, vec2f(px0, -0.095), 0.062, shift / 10, 0.0) + digitCov(p, vec2f(px0 + 0.038, -0.095), 0.062, shift % 10, 0.0);
let link: f32 = stroke(p.y - 0.1, 0.35) * step(px0, p.x) * step(p.x, px0 + 0.4) * 0.5;
let micro: f32 = textLoop(p, -0.465, 0.015,${o.micro.start},${o.micro.count}, t * 0.01, 0.0);
let ink: vec3f = inkCol(p, 1.4);
let keyCol: vec3f = mix(u.accent.rgb, vec3f(1.0), 0.35);
var c: vec3f = ink * (rims * 0.75 + ticks * 0.5 + ticksIn * 0.5 + knurl * 0.5 + rosette * 0.55 + link);
c += silver() * outer * 0.85 + keyCol * inner * (0.85 + 0.4 * (1.0 - turning));
c += mix(ink, vec3f(1.0, 0.5, 0.5), 0.5) * crossInk * 0.9 + vec3f(1.0, 0.45, 0.45) * hub;
c += keyCol * pointer + silver() * (plain * 0.85 + labels * 0.55 + keyD * 0.8);
c += holo(foilPhase(p, 2.0) + f32(shift) * 0.04) * cipherRow * 1.1;
c += ink * micro * 0.4;
c += zenStamp(p);
return c;
}`};import{layoutText as Me}from"./zen-foil.js";var p=42,fe=["> explain photosynthesis to a 12-year-old","Plants are solar-powered chefs. They catch","sunlight with chlorophyll, pull in water","and CO2, and cook them into sugar,","breathing out the oxygen we use."].map(e=>e.padEnd(p," ").slice(0,p)),ce=Me({body:fe.join(""),cands:"sunlightlight   energy  rays    photons ",title:"zen://prompt-playground",next:"NEXT TOKEN",micro:"ZEN AI \xB7 MODULE 1 \xB7 PIONEERS AGES 11-18 \xB7 "},0),x=ce.at,re={id:"terminal",still:9,data(e){ce.write(e)},code:`fn scene(uv: vec2f, p: vec2f) -> vec3f {
let t: f32 = tnow();
let cyc: f32 = t - 12.0 * floor(t / 12.0);
let ax: f32 = aspect() * 0.5;
let wl: f32 = -ax + 0.05;
let wr: f32 = 0.27;
let win: f32 = sdRoundBox(p - vec2f((wl + wr) * 0.5, 0.0), vec2f((wr - wl) * 0.5, 0.42), 0.02);
let frame: f32 = stroke(win, 0.7);
let bar: f32 = stroke(p.y - 0.355, 0.45) * step(wl, p.x) * step(p.x, wr);
var dots: f32 = 0.0;
for (var i: i32 = 0; i < 3; i++) {
dots += fillAA(length(p - vec2f(wl + 0.035 + f32(i) * 0.03, 0.388)) - 0.0075);
}
let title: f32 = textRun(p, vec2f(wl + 0.14, 0.4), 0.018,${x.title.start},${x.title.count}, 0.0);
let size: f32 = 0.029;
let lead: f32 = 0.062;
let x0: f32 = wl + 0.035;
let y0: f32 = 0.31;
let promptN: f32 = clamp((cyc - 0.2) * 34.0, 0.0,${fe[0].trimEnd().length}.0);
let streamN: f32 = floor(clamp((cyc - 2.2) * 36.0, 0.0,${p*4}.0) / 4.0) * 4.0;
let ln: f32 = floor((y0 - p.y) / lead);
let row: i32 = i32(ln);
let shownN: f32 = select(streamN - f32(row - 1) *${p}.0, promptN, row == 0);
let lineY: f32 = y0 - ln * lead;
let validRow: bool = (ln >= 0.0) && (ln <= 4.0);
let rowText: f32 = textRun(p, vec2f(x0, lineY), size,${x.body.start}+ clamp(row, 0, 4) *${p}, i32(clamp(shownN, 0.0,${p}.0)), 0.0);
let glyphs: f32 = select(0.0, rowText, validRow);
let isPrompt: f32 = select(0.0, 1.0, row == 0);
let streaming: bool = cyc > 2.2;
let headRow: f32 = select(0.0, 1.0 + floor(min(streamN,${p*4-1}.0) /${p}.0), streaming);
let headCol: f32 = select(promptN, streamN - (headRow - 1.0) *${p}.0, streaming);
let caretP: vec2f = vec2f(x0 + headCol * size * 0.6 + 0.008, y0 - headRow * lead - size * 0.5);
let caret: f32 = fillAA(sdBox(p - caretP, vec2f(0.0075, 0.0135))) * step(0.45, fract(t * 1.7));
let thinking: f32 = step(1.7, cyc) * step(cyc, 2.2);
var spin: f32 = 0.0;
for (var i: i32 = 0; i < 3; i++) {
spin += fillAA(length(p - vec2f(x0 + f32(i) * 0.02, y0 - lead - 0.012)) - 0.004) * (0.4 + 0.6 * step(0.5, fract(t * 3.0 - f32(i) * 0.33)));
}
spin *= thinking;
let inside: f32 = fillAA(win);
let scan: f32 = 0.82 + 0.18 * sin(p.y / pxs() * PI * 0.66);
let px0: f32 = 0.33;
let pw: f32 = ax - 0.05 - px0;
let settle: f32 = sstep(18.0, 42.0, streamN);
let chosen: f32 = step(42.0, streamN) * (1.0 - step(70.0, streamN));
var panel: f32 = 0.0;
var chosenInk: f32 = 0.0;
for (var i: i32 = 0; i < 5; i++) {
let y: f32 = 0.24 - f32(i) * 0.1;
let truth: f32 = select(select(select(select(0.03, 0.05, i == 3), 0.07, i == 2), 0.12, i == 1), 0.71, i == 0);
let noiseP: f32 = 0.08 + 0.3 * vnoise(vec2f(f32(i) * 4.1, t * 1.3));
let prob: f32 = mix(noiseP, truth, settle);
let lbl: f32 = textRun(p, vec2f(px0, y + 0.014), 0.019,${x.cands.start}+ i * 8, 8, 0.0);
let barW: f32 = pw * prob;
let barD: f32 = fillAA(sdBox(p - vec2f(px0 + barW * 0.5, y - 0.03), vec2f(barW * 0.5, 0.0055)));
let track: f32 = stroke(sdBox(p - vec2f(px0 + pw * 0.5, y - 0.03), vec2f(pw * 0.5, 0.0055)), 0.3) * 0.5;
let pct: i32 = i32(floor(prob * 100.0 + 0.5));
let dg: f32 = digitCov(p, vec2f(px0 + pw - 0.04, y + 0.016), 0.024, (pct / 10) % 10, 0.0) + digitCov(p, vec2f(px0 + pw - 0.0256, y + 0.016), 0.024, pct % 10, 0.0);
let isTop: f32 = select(0.0, 1.0, i == 0);
panel += lbl * 0.7 + barD * (1.0 - isTop * chosen) + track + dg * 0.6;
chosenInk += (barD + lbl) * isTop * chosen;
}
let nextLbl: f32 = textRun(p, vec2f(px0, 0.37), 0.017,${x.next.start},${x.next.count}, 0.0);
let micro: f32 = textLoop(p, -0.465, 0.015,${x.micro.start},${x.micro.count}, t * 0.01, 0.0);
let ink: vec3f = inkCol(p, 1.3);
let phos: vec3f = mix(u.accent.rgb, vec3f(0.82, 1.0, 0.9), 0.3);
var c: vec3f = ink * (frame * 0.8 + bar * 0.45) + vec3f(1.0, 0.55, 0.45) * dots * 0.6 + silver() * title * 0.6;
c += mix(phos, vec3f(1.0, 0.86, 0.6), isPrompt * 0.6) * glyphs * scan * 1.05;
c += phos * (caret * 0.9 + spin * 0.8) + phos * inside * 0.02;
c += ink * panel * 0.8 + mix(vec3f(1.0, 0.86, 0.55), holo(foilPhase(p, 2.0)), 0.25) * chosenInk + silver() * nextLbl * 0.65;
c += ink * micro * 0.4;
c += zenStamp(p);
return c;
}`};import{layoutText as Ue}from"./zen-foil.js";var se=Ue({prompt:"> a ringed ocean world with violet forests",gen:"GENERATING WORLD",micro:"PROMPT A PLANET \xB7 ZEN AI PIONEER CURRICULUM \xB7 DALL\xB7E 3 \xB7 GPT-IMAGE \xB7 FLUX \xB7 "},0),w=se.at,oe={id:"planet",still:3,data(e){se.write(e)},code:`const PC: vec2f = vec2f(-0.12, 0.02);
const PR: f32 = 0.3;
fn landAt(n: vec3f, seed: f32) -> f32 {
let a: f32 = fbm(n.xy * 2.1 + vec2f(seed, seed * 0.37), 5);
let b: f32 = fbm(n.yz * 2.1 + vec2f(seed * 0.61, 4.0), 4);
let c: f32 = fbm(n.zx * 2.1 + vec2f(9.0, seed), 4);
return (a + b + c) / 3.0;
}
fn ringMask(p: vec2f) -> vec2f {
let q: vec2f = rot2(-0.38) * (p - PC);
let e: vec2f = vec2f(q.x, q.y / 0.24) / PR;
let r: f32 = length(e);
let band: f32 = sstep(1.35, 1.37, r) * sstep(1.98, 1.95, r) * (1.0 - sstep(1.62, 1.66, r) * sstep(1.7, 1.66, r) * 0.85);
return vec2f(band, step(0.0, -q.y));
}
fn scene(uv: vec2f, p: vec2f) -> vec3f {
let t: f32 = tnow();
let gen: f32 = t / 11.0;
let seedNew: f32 = floor(gen) * 3.71 + 2.0;
let seedOld: f32 = seedNew - 3.71;
let sweepK: f32 = fract(gen);
let sweepY: f32 = mix(PC.y + PR + 0.03, PC.y - PR - 0.03, ease(sweepK / 0.22));
let regen: f32 = step(sweepK, 0.24);
let d: vec2f = (p - PC) / PR;
let rr: f32 = dot(d, d);
let onDisk: f32 = fillAA((sqrt(rr) - 1.0) * PR);
let z: f32 = sqrt(max(1.0 - rr, 0.0));
let spin: f32 = t * 0.06 + u.tilt.x * 0.25;
let n0: vec3f = vec3f(d.x, d.y, z);
let n: vec3f = vec3f(n0.x * cos(spin) + n0.z * sin(spin), n0.y, -n0.x * sin(spin) + n0.z * cos(spin));
let useNew: bool = (regen < 0.5) || (p.y > sweepY);
let seed: f32 = select(seedOld, seedNew, useNew);
let land: f32 = landAt(n, seed);
let isLand: f32 = sstep(-0.012, 0.008, land);
let light: vec3f = normalize(vec3f(-0.55, 0.45, 0.7));
let lam: f32 = saturate(dot(n0, light));
let dark: f32 = 1.0 - lam;
let lat: f32 = asin(clamp(n.y, -1.0, 1.0));
let ocean: f32 = engrave(lat, 0.045, 0.16 + lam * 0.22) * (1.0 - isLand);
let relief: f32 = engrave(land, 0.03, 0.25) * isLand + isLand * lam * 0.12;
let lon: f32 = atan2(n.x, n.z);
let night: f32 = engrave(lon * 0.6 + lat, 0.06, dark * dark * 0.4) * dark;
let rim: f32 = pow(1.0 - z, 3.0);
let atmo: f32 = exp(-max(sqrt(rr) - 1.0, 0.0) * PR * 60.0) * (1.0 - onDisk) * step(1.0, rr) + rim * 0.6 * onDisk;
let rm: vec2f = ringMask(p);
let ringQ: vec2f = rot2(-0.38) * (p - PC);
let ringLines: f32 = engraveP(length(vec2f(ringQ.x, ringQ.y / 0.24)) / PR, 0.045, 0.32, pxs() / PR * 1.8);
let ringVis: f32 = rm.x * ringLines * select(1.0 - onDisk, 1.0, rm.y > 0.5);
let ringShadow: f32 = 1.0 - 0.55 * rm.x * onDisk * step(rm.y, 0.5);
let mo: vec2f = PC + vec2f(cos(t * 0.23) * 0.52, sin(t * 0.23) * 0.12 + 0.12);
let md: f32 = length(p - mo) - 0.035;
let moonFront: f32 = step(0.0, sin(t * 0.23));
let moonVis: f32 = select(1.0 - onDisk, 1.0, moonFront > 0.5);
let moon: f32 = (fillAA(md) * engrave(p.y - mo.y + (p.x - mo.x) * 0.4, 0.006, 0.35) + stroke(md, 0.6)) * moonVis;
let sweepLine: f32 = stroke(p.y - sweepY, 1.2) * regen * onDisk + exp(-abs(p.y - sweepY) * 80.0) * regen * onDisk * 0.4;
let stars: f32 = step(0.997, h21(floor(uv * u.res.xy / 2.0) + vec2f(3.0, 1.0))) * (1.0 - onDisk) * (0.5 + 0.5 * sin(t * 2.0 + h21(floor(uv * 90.0)) * 6.0));
let promptTxt: f32 = textRun(p, vec2f(-aspect() * 0.5 + 0.05, -0.385), 0.022,${w.prompt.start},${w.prompt.count}, 0.0);
let genTxt: f32 = textRun(p, vec2f(-aspect() * 0.5 + 0.05, 0.45), 0.016,${w.gen.start},${w.gen.count}, 0.0) * regen * step(0.5, fract(t * 2.0));
let micro: f32 = textLoop(p, -0.468, 0.014,${w.micro.start},${w.micro.count}, t * 0.01, 0.0);
let ink: vec3f = inkCol(p, 1.2);
let violet: vec3f = vec3f(0.72, 0.52, 1.0);
let sea: vec3f = mix(u.accent.rgb, vec3f(0.45, 0.75, 1.0), 0.4);
var c: vec3f = (sea * ocean * 0.75 + mix(violet, vec3f(0.85, 0.75, 1.0), lam) * relief * 0.95) * onDisk * (0.35 + lam * 0.85) * ringShadow;
c += ink * night * 0.25 * onDisk;
c += holo(rim * 1.8 + foilPhase(p, 1.0)) * atmo * 0.85;
c += mix(ink, holo(foilPhase(ringQ, 2.0) + 0.3), 0.5) * ringVis * 0.8;
c += silver() * moon * 0.8 + silver() * stars * 0.7;
c += mix(sea, vec3f(1.0), 0.5) * sweepLine;
c += silver() * (promptTxt * 0.8 + genTxt * 0.6) + ink * micro * 0.4;
c += zenStamp(p);
return c;
}`};import{layoutText as je}from"./zen-foil.js";var ie=je({concept:"CONCEPT 03 \xB7 HANDHELD",w:"152",h:"84",r:"R7",sketch:"SKETCH",render:"RENDER",screen:"ZEN",micro:"PROMPT A PROTOTYPE \xB7 ZEN AI PIONEERS \xB7 DESIGN CONCEPTS FROM DAY ONE \xB7 "},0),c=ie.at,ae={id:"proto",still:4,data(e){ie.write(e)},code:`const BC: vec2f = vec2f(0.0, 0.0);
fn bodyD(p: vec2f) -> f32 { return sdRoundBox(p - BC, vec2f(0.36, 0.2), 0.07); }
fn screenD(p: vec2f) -> f32 { return sdRoundBox(p - vec2f(0.0, 0.035), vec2f(0.15, 0.112), 0.014); }
fn padD(p: vec2f) -> f32 {
let q: vec2f = p - vec2f(-0.255, -0.01);
return min(sdRoundBox(q, vec2f(0.048, 0.015), 0.004), sdRoundBox(q, vec2f(0.015, 0.048), 0.004));
}
fn btnD(p: vec2f) -> f32 {
return min(length(p - vec2f(0.265, 0.012)) - 0.024, length(p - vec2f(0.215, -0.045)) - 0.024);
}
fn pillD(p: vec2f) -> f32 {
return min(sdRoundBox(p - vec2f(-0.035, -0.155), vec2f(0.022, 0.007), 0.007), sdRoundBox(p - vec2f(0.035, -0.155), vec2f(0.022, 0.007), 0.007));
}
fn arrowHead(p: vec2f, tip: vec2f, dir: vec2f) -> f32 {
let q: vec2f = p - tip;
let along: f32 = dot(q, -dir);
let across: f32 = abs(dot(q, vec2f(-dir.y, dir.x)));
return fillAA(max(across - along * 0.32, along - 0.018));
}
fn scene(uv: vec2f, p: vec2f) -> vec3f {
let t: f32 = tnow();
let k: f32 = fract(t / 9.0);
let sx: f32 = mix(-aspect() * 0.5 - 0.05, aspect() * 0.5 + 0.05, ease((k - 0.08) / 0.62));
let rendered: f32 = sstep(sx + 0.003, sx - 0.003, p.x) * (1.0 - ease((k - 0.9) / 0.1));
let sketch: f32 = 1.0 - rendered;
let bd: f32 = bodyD(p);
let sd: f32 = screenD(p);
let pd: f32 = padD(p);
let bt: f32 = btnD(p);
let pl: f32 = pillD(p);
let outline: f32 = stroke(bd, 0.55) + stroke(sd, 0.45) + stroke(pd, 0.45) + stroke(bt, 0.45) + stroke(pl, 0.45);
let grid: f32 = max(engraveP(p.x, 0.025, 0.04, pxs()), engraveP(p.y, 0.025, 0.04, pxs())) * 0.5
+ max(engraveP(p.x, 0.125, 0.02, pxs()), engraveP(p.y, 0.125, 0.02, pxs()));
let centre: f32 = (stroke(p.x, 0.35) * step(abs(p.y), 0.3) + stroke(p.y - 0.035, 0.35) * step(abs(p.x), 0.45)) * step(0.4, fract((p.x + p.y) * 22.0));
let dimY: f32 = -0.27;
let dimH: f32 = stroke(p.y - dimY, 0.4) * step(-0.36, p.x) * step(p.x, 0.36)
+ stroke(p.x + 0.36, 0.4) * step(dimY - 0.015, p.y) * step(p.y, -0.21)
+ stroke(p.x - 0.36, 0.4) * step(dimY - 0.015, p.y) * step(p.y, -0.21)
+ arrowHead(p, vec2f(-0.36, dimY), vec2f(-1.0, 0.0)) + arrowHead(p, vec2f(0.36, dimY), vec2f(1.0, 0.0));
let dimX: f32 = 0.45;
let dimV: f32 = stroke(p.x - dimX, 0.4) * step(-0.2, p.y) * step(p.y, 0.2)
+ stroke(p.y - 0.2, 0.4) * step(0.39, p.x) * step(p.x, dimX + 0.015)
+ stroke(p.y + 0.2, 0.4) * step(0.39, p.x) * step(p.x, dimX + 0.015)
+ arrowHead(p, vec2f(dimX, 0.2), vec2f(0.0, 1.0)) + arrowHead(p, vec2f(dimX, -0.2), vec2f(0.0, -1.0));
let leader: f32 = stroke(sdSeg(p, vec2f(-0.31, 0.15), vec2f(-0.42, 0.27)), 0.4) + stroke(sdSeg(p, vec2f(-0.42, 0.27), vec2f(-0.5, 0.27)), 0.4);
let dimText: f32 = textRun(p, vec2f(-0.03, dimY + 0.035), 0.022,${c.w.start},${c.w.count}, 0.0)
+ textRun(p, vec2f(dimX + 0.02, 0.012), 0.022,${c.h.start},${c.h.count}, 0.0)
+ textRun(p, vec2f(-0.5, 0.305), 0.022,${c.r.start},${c.r.count}, 0.0);
let blueprint: f32 = grid * 0.35 + centre * 0.5 + dimH + dimV + leader + dimText;
let e: f32 = 0.004;
let bnx: f32 = bodyD(p + vec2f(e, 0.0)) - bd;
let bny: f32 = bodyD(p + vec2f(0.0, e)) - bd;
let bevel: f32 = sstep(-0.03, 0.0, bd);
let facing: f32 = saturate(0.5 + 0.5 * dot(normalize(vec2f(bnx, bny) + vec2f(1e-5)), vec2f(-0.7, 0.7))) * bevel;
let bodyIn: f32 = fillAA(bd) * (1.0 - fillAA(sd - 0.006));
let shading: f32 = engrave(p.x * 0.55 + p.y, 0.0068, 0.2 + facing * 0.55 - fillAA(sd - 0.02) * 0.1) * bodyIn;
let glassIn: f32 = fillAA(sd);
let sq: vec2f = (p - vec2f(0.0, 0.035)) / vec2f(0.15, 0.112);
let pix: vec2f = floor(sq * vec2f(24.0, 18.0));
let sunP: f32 = step(length(pix - vec2f(5.0, 5.0 + sin(t) * 1.5)), 3.2);
let hills: f32 = step(pix.y, -6.0 + 2.0 * sin(pix.x * 0.5 + t * 1.5));
let screenPx: f32 = (sunP + hills * 0.6) * glassIn * step(0.2, fract(sq.y * 9.0 * 2.0)) * 0.9;
let screenTxt: f32 = textRun(p, vec2f(-0.03, 0.135), 0.03,${c.screen.start},${c.screen.count}, 0.2) * glassIn;
let glare: f32 = glassIn * sstep(0.08, 0.0, abs(dot(p - vec2f(0.0, 0.035), vec2f(0.7, 0.7)) - 0.05 + u.tilt.x * 0.04)) * 0.18;
let ctrls: f32 = fillAA(pd) * (0.5 + 0.5 * engrave(p.y, 0.005, 0.5)) + fillAA(bt) * (0.6 + 0.4 * sstep(0.0, -0.02, bt)) + fillAA(pl) * 0.6;
let spec: f32 = exp(-length(p - vec2f(0.255, 0.024)) * 160.0) + exp(-length(p - vec2f(0.205, -0.033)) * 160.0);
let shadow: f32 = (1.0 - fillAA(bd)) * exp(-max(bodyD(p + vec2f(-0.02, 0.035)), 0.0) * 40.0) * 0.25;
let sweepGlow: f32 = exp(-abs(p.x - sx) * 90.0) * step(k, 0.72) * step(0.06, k);
let tags: f32 = (textRun(p, vec2f(sx - 0.115, 0.44), 0.016,${c.render.start},${c.render.count}, 0.0) + textRun(p, vec2f(sx + 0.02, 0.44), 0.016,${c.sketch.start},${c.sketch.count}, 0.0)) * step(k, 0.72) * step(0.08, k);
let conceptLbl: f32 = textRun(p, vec2f(-aspect() * 0.5 + 0.05, 0.45), 0.017,${c.concept.start},${c.concept.count}, 0.0);
let micro: f32 = textLoop(p, -0.468, 0.014,${c.micro.start},${c.micro.count}, t * 0.01, 0.0);
let ink: vec3f = inkCol(p, 1.3);
let cyan: vec3f = vec3f(0.42, 0.82, 1.0);
var c: vec3f = cyan * (blueprint * 0.55 + outline * 0.9) * sketch;
c += (mix(ink, silver(), 0.4) * (shading * 0.8 + outline * 0.6) + silver() * ctrls * 0.55 + vec3f(1.0) * spec * 0.8) * rendered;
c += (mix(u.accent.rgb, vec3f(0.6, 1.0, 0.85), 0.4) * screenPx * 0.7 + silver() * screenTxt + holo(foilPhase(p, 3.0)) * glare) * rendered;
c += vec3f(0.0) * shadow + holo(foilPhase(p, 2.0) + 0.2) * sweepGlow * 0.8;
c += silver() * (tags * 0.7 + conceptLbl * 0.7) + ink * micro * 0.4;
c += zenStamp(p);
return c;
}`};import{layoutText as Ge}from"./zen-foil.js";var ne=Ge({mast:"ZEN WEEKLY",dateline:"AI \xB7 LITERACY \xB7 CULTURE \xB7 THE WEEKLY DISPATCH",head:"THIS WEEK IN AI",subs:"SUBSCRIBERS",k:"K+",micro:"ZEN WEEKLY \xB7 SINCE 2023 \xB7 AI LITERACY \xB7 YOUTH TECH \xB7 HUMAN-MACHINE COLLABORATION \xB7 "},0),r=ne.at,pe={id:"weekly",still:6,data(e){ne.write(e)},code:`const PG: vec2f = vec2f(-0.2, -0.005);
const PH: vec2f = vec2f(0.33, 0.43);
fn scene(uv: vec2f, p: vec2f) -> vec3f {
let t: f32 = tnow();
let k: f32 = fract(t / 10.0);
let q: vec2f = rot2(0.045) * (p - PG);
let page: f32 = sdBox(q, PH);
let onPage: f32 = fillAA(page);
let edge: f32 = stroke(page, 0.7);
let shadow: f32 = exp(-max(sdBox(q + vec2f(-0.012, 0.016), PH), 0.0) * 60.0) * (1.0 - onPage) * 0.3;
let pressY: f32 = mix(PH.y + 0.02, -PH.y - 0.03, ease(k / 0.55));
let printed: f32 = select(sstep(pressY - 0.004, pressY + 0.004, q.y), 1.0, k > 0.56) * (1.0 - ease((k - 0.94) / 0.06));
let preview: f32 = 0.16;
let inkAmt: f32 = mix(preview, 1.0, printed);
let mastSize: f32 = 0.068;
let mast: f32 = textRun(q, vec2f(-${r.mast.count}.0 * mastSize * 0.3, PH.y - 0.03), mastSize,${r.mast.start},${r.mast.count}, 0.6);
let rules: f32 = (stroke(q.y - (PH.y - 0.112), 0.7) + stroke(q.y - (PH.y - 0.121), 0.35) + stroke(q.y - (PH.y - 0.152), 0.35)) * step(abs(q.x), PH.x - 0.03);
let dateline: f32 = textRun(q, vec2f(-${r.dateline.count}.0 * 0.0135 * 0.3, PH.y - 0.124), 0.0135,${r.dateline.start},${r.dateline.count}, 0.0);
let headline: f32 = textRun(q, vec2f(-PH.x + 0.03, PH.y - 0.168), 0.034,${r.head.start},${r.head.count}, 0.3);
let ic: vec2f = vec2f(0.075, PH.y - 0.325);
let imgBox: f32 = sdBox(q - ic, vec2f(0.215, 0.105));
let gq: vec2f = (q - ic - vec2f(0.03, 0.0)) / 0.085;
let gr: f32 = length(gq);
let globeTone: f32 = select(0.06, saturate(0.25 + 0.7 * sqrt(max(1.0 - gr * gr, 0.0)) * (0.5 + 0.5 * dot(normalize(vec3f(gq, sqrt(max(1.0 - gr * gr, 0.0)))), normalize(vec3f(-0.5, 0.5, 0.7))))), gr < 1.0);
let land: f32 = sstep(0.02, 0.06, fbm(gq * 1.4 + vec2f(t * 0.05, 0.0), 4)) * step(gr, 1.0);
let plate: f32 = halftone(q, 0.0072, 0.785, globeTone * (0.7 + land * 0.5)) * fillAA(imgBox) + stroke(imgBox, 0.45);
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
+ textRun(p, vec2f(subsX + 0.086, 0.43), 0.035,${r.k.start},${r.k.count}, 0.2)
+ textRun(p, vec2f(subsX, 0.355), 0.0155,${r.subs.start},${r.subs.count}, 0.0);
let micro: f32 = textLoop(p, -0.468, 0.014,${r.micro.start},${r.micro.count}, t * 0.01, 0.0);
let ink: vec3f = inkCol(p, 1.2);
let paper: vec3f = vec3f(0.9, 0.88, 0.82);
var c: vec3f = ink * onPage * 0.05 + ink * edge * 0.7 + ink * shadow * 0.15;
c += mix(paper, holo(foilPhase(q, 1.5)), 0.25) * (mast * 1.05 + headline * 0.85) * inkAmt;
c += ink * (rules * 0.8 + dateline * 0.6 + body * 0.55 + gutters * 0.4) * inkAmt;
c += mix(ink, paper, 0.5) * plate * 0.75 * inkAmt;
c += holo(foilPhase(p, 2.0) + 0.3) * cylinder * 0.7;
c += mix(u.accent.rgb, vec3f(1.0), 0.45) * fan * 0.9 + silver() * subs * 0.85;
c += ink * micro * 0.4;
c += zenStamp(p);
return c;
}`};import{layoutText as Fe}from"./zen-foil.js";var ve=Fe({code1:"function draw() {",code2:"  field.flow(noise(x, y, t));",code3:"}",micro:"CANVASFORGE \xB7 P5.JS CREATIVE ENGINE \xB7 GENERATIVE ART \xB7 INTERACTIVE VISUALIZATION \xB7 "},0),m=ve.at,de={id:"forge",still:7,data(e){ve.write(e)},code:`fn psi(p: vec2f, t: f32) -> f32 {
let w: vec2f = p * 1.55 + vec2f(t * 0.035, -t * 0.02);
let warp: vec2f = vec2f(fbm(w + vec2f(1.7, 9.2), 3), fbm(w + vec2f(8.3, 2.8), 3));
return fbm(w + warp * 0.9, 5) + p.y * 0.18;
}
fn scene(uv: vec2f, p: vec2f) -> vec3f {
let t: f32 = tnow();
let mp: vec2f = mouseP();
let lens: f32 = exp(-dot(p - mp, p - mp) * 30.0) * hov();
let s: f32 = psi(p + (p - mp) * lens * 0.08, t);
let spacing: f32 = 0.0145;
let band: f32 = floor(s / spacing);
let lines: f32 = engrave(s, spacing, 0.24);
let cyc: f32 = fract(t / 16.0);
let order: f32 = fract(band * 0.618034) * 0.86 + (p.x / aspect() + 0.5) * 0.12;
let drawn: f32 = sstep(cyc * 1.12 - 0.03, cyc * 1.12 - 0.06, order);
let wet: f32 = exp(-max(cyc * 1.12 - 0.045 - order, 0.0) * 60.0) * drawn;
let fadeOut: f32 = 1.0 - ease((cyc - 0.93) / 0.07);
let carriageX: f32 = mix(-aspect() * 0.5, aspect() * 0.5, fract(cyc * 7.0));
let carriage: f32 = stroke(p.x - carriageX, 0.4) * 0.35 + exp(-abs(p.x - carriageX) * 50.0) * 0.08;
let rail: f32 = stroke(p.y - 0.455, 0.6) + stroke(p.y - 0.445, 0.3);
let head: f32 = fillAA(sdRoundBox(p - vec2f(carriageX, 0.45), vec2f(0.018, 0.012), 0.004));
let panel: f32 = sdRoundBox(p - vec2f(-aspect() * 0.5 + 0.2, -0.33), vec2f(0.17, 0.065), 0.01);
let panelIn: f32 = fillAA(panel);
let code: f32 = textRun(p, vec2f(-aspect() * 0.5 + 0.05, -0.28), 0.0165,${m.code1.start},${m.code1.count}, 0.0)
+ textRun(p, vec2f(-aspect() * 0.5 + 0.05, -0.31), 0.0165,${m.code2.start},${m.code2.count}, 0.0)
+ textRun(p, vec2f(-aspect() * 0.5 + 0.05, -0.34), 0.0165,${m.code3.start},${m.code3.count}, 0.0);
let micro: f32 = textLoop(p, -0.468, 0.014,${m.micro.start},${m.micro.count}, t * 0.01, 0.0);
let inkA: vec3f = holo(band * 0.071 + foilPhase(p, 0.6));
let inkB: vec3f = mix(u.accent.rgb, vec3f(1.0, 0.8, 0.55), fract(band * 0.37));
let inkC: vec3f = mix(inkA, inkB, 0.45);
var c: vec3f = inkC * lines * (0.18 + 0.82 * drawn) * fadeOut * (1.0 - panelIn * 0.85);
c += vec3f(1.0, 0.95, 0.85) * lines * wet * 0.6 * fadeOut;
c += silver() * (carriage + rail * 0.5 + head * 0.8);
c += inkCol(p, 1.0) * stroke(panel, 0.5) * 0.7 + silver() * code * 0.75 + vec3f(0.01, 0.015, 0.03) * panelIn;
c += inkCol(p, 1.0) * micro * 0.4;
return c;
}`};import{layoutText as Ye}from"./zen-foil.js";var xe=Ye({scale:"\u221E  10  5  3  2  1.5  1 M",f:"F/",mm:"50MM \xB7 1:1.4",micro:"INSPIRELENS \xB7 CAPTURE \xB7 CURATE \xB7 SHARE THE VISUAL MOMENTS THAT MATTER \xB7 "},0),h=xe.at,me={id:"lens",still:2.2,data(e){xe.write(e)},code:`const LC: vec2f = vec2f(0.16, -0.01);
fn fstop(i: f32) -> f32 {
return select(select(select(select(select(8.0, 5.6, i < 4.5), 4.0, i < 3.5), 2.8, i < 2.5), 2.0, i < 1.5), 1.4, i < 0.5);
}
fn heptagon(q: vec2f, r: f32, rot: f32) -> f32 {
var d: f32 = -1e9;
for (var i: i32 = 0; i < 7; i++) {
let a: f32 = rot + f32(i) * TAU / 7.0;
d = max(d, dot(q, vec2f(cos(a), sin(a))) - r);
}
return d;
}
fn scene(uv: vec2f, p: vec2f) -> vec3f {
let t: f32 = tnow();
let d: vec2f = p - LC;
let r: f32 = length(d);
let a: f32 = atan2(d.y, d.x);
let stepT: f32 = t / 1.6;
let idx: f32 = floor(stepT) - 6.0 * floor(stepT / 6.0);
let nextIdx: f32 = select(idx + 1.0, 0.0, idx > 4.5);
let blend: f32 = ease((fract(stepT) - 0.7) / 0.3);
let fNow: f32 = mix(fstop(idx), fstop(nextIdx), blend);
let apR: f32 = 0.2 * 1.4 / fNow;
let bladeRot: f32 = 0.35 / fNow + t * 0.02;
let opening: f32 = heptagon(d, apR, bladeRot);
let inOpen: f32 = fillAA(opening);
var nearest: f32 = 1e9;
var bladeAng: f32 = 0.0;
for (var i: i32 = 0; i < 7; i++) {
let ba: f32 = bladeRot + f32(i) * TAU / 7.0;
let dd: f32 = dot(d, vec2f(cos(ba), sin(ba))) - apR;
let better: bool = (dd > 0.0) && (dd < nearest);
nearest = select(nearest, dd, better);
bladeAng = select(bladeAng, ba, better);
}
let bladeZone: f32 = (1.0 - inOpen) * step(r, 0.25);
let bladeHatch: f32 = engraveP(dot(d, vec2f(cos(bladeAng), sin(bladeAng))), 0.006, 0.22, pxs()) * bladeZone;
let bladeEdges: f32 = stroke(opening, 0.8) * step(r, 0.25);
var seams: f32 = 0.0;
for (var i: i32 = 0; i < 7; i++) {
let ba: f32 = bladeRot + f32(i) * TAU / 7.0;
let corner: vec2f = vec2f(cos(ba + PI / 7.0), sin(ba + PI / 7.0)) * apR / cos(PI / 7.0);
let dir: vec2f = normalize(vec2f(cos(ba + PI / 7.0 + 1.25), sin(ba + PI / 7.0 + 1.25)));
seams += stroke(sdSeg(d, corner, corner + dir * 0.3), 0.4) * bladeZone;
}
let g1: f32 = exp(-abs(length(d - vec2f(-0.05, 0.06) - u.tilt.xy * 0.03) - 0.07) * 90.0);
let g2: f32 = exp(-abs(length(d - vec2f(0.04, -0.03) + u.tilt.xy * 0.02) - 0.035) * 120.0);
let glass: f32 = (g1 + g2 * 0.8) * inOpen;
let deep: f32 = inOpen * 0.06;
let rings: f32 = stroke(r - 0.25, 0.9) + stroke(r - 0.262, 0.4) + stroke(r - 0.3, 0.6) + stroke(r - 0.35, 0.5) + stroke(r - 0.43, 0.9) + stroke(r - 0.442, 0.4);
let knurl: f32 = step(0.36, r) * step(r, 0.425) * (0.35 + 0.65 * step(0.5, fract(a / TAU * 160.0 + r * 3.0)));
let focusRot: f32 = sin(t * 0.25) * 0.4 + u.tilt.x * 0.3;
let scaleTxt: f32 = ringText(p, LC, 0.325, 0.022,${h.scale.start},${h.scale.count}, focusRot - 1.05, true);
let ticks: f32 = stroke(r - 0.2725, 1.4) * step(0.85, fract((a + focusRot) / TAU * 48.0)) * 0.8;
let mmTxt: f32 = ringText(p, LC, 0.272, 0.016,${h.mm.start},${h.mm.count}, PI * 0.78, true);
let index: f32 = fillAA(sdBox(d - vec2f(0.0, 0.353), vec2f(0.004, 0.012)));
var bokeh: f32 = 0.0;
var bokehHue: f32 = 0.0;
for (var i: i32 = 0; i < 9; i++) {
let fi: f32 = f32(i);
let c: vec2f = vec2f(-aspect() * 0.5 + 0.08 + h11(fi * 7.1) * 0.62, -0.42 + fract(h11(fi * 3.3) + t * 0.012 * (0.5 + h11(fi))) * 0.9);
let rad: f32 = 0.025 + h11(fi * 1.9) * 0.05;
let hd: f32 = heptagon(p - c, rad, 0.3);
let disc: f32 = (fillAA(hd) * 0.18 + stroke(hd, 0.6) * 0.5) * step(0.47, r);
bokeh += disc;
bokehHue += disc * fi;
}
let fx: f32 = -aspect() * 0.5 + 0.06;
let fLbl: f32 = textRun(p, vec2f(fx, 0.44), 0.05,${h.f.start},${h.f.count}, 0.3);
let f10: i32 = i32(floor(fNow * 10.0 + 0.5));
let showTenth: bool = (f10 % 10) != 0;
let whole: i32 = f10 / 10;
let fd: f32 = digitCov(p, vec2f(fx + 0.06, 0.44), 0.05, whole, 0.3)
+ select(0.0, fillAA(length(p - vec2f(fx + 0.093, 0.398)) - 0.0035) + digitCov(p, vec2f(fx + 0.1, 0.44), 0.05, f10 % 10, 0.3), showTenth);
let micro: f32 = textLoop(p, -0.468, 0.014,${h.micro.start},${h.micro.count}, t * 0.01, 0.0);
let ink: vec3f = inkCol(p, 1.3);
var c: vec3f = ink * (rings * 0.8 + knurl * 0.32 + ticks * 0.6) + silver() * (scaleTxt * 0.9 + mmTxt * 0.6 + index);
c += mix(ink, silver(), 0.35) * (bladeHatch * 0.5 + bladeEdges * 0.9 + seams * 0.35);
c += holo(foilPhase(d, 3.0) + r * 4.0) * glass * 0.9 + mix(u.accent.rgb, vec3f(0.2, 0.25, 0.4), 0.5) * deep;
c += holo(bokehHue * 0.13 + foilPhase(p, 0.5)) * bokeh * 0.75;
c += silver() * (fLbl + fd) * 0.85 + ink * micro * 0.4;
return c;
}`};var he={id:"gravity",still:3.2,code:`fn ggSheet(xz: vec2f, pm: vec2f) -> f32 {
let t: f32 = tnow() * 0.42;
let c: vec2f = vec2f(cos(t), sin(t));
let a: vec2f = xz - c * 0.40;
let b: vec2f = xz + c * 0.29;
let m: vec2f = xz - pm;
return -0.040 / sqrt(dot(a, a) + 0.011) - 0.055 / sqrt(dot(b, b) + 0.013) - 0.026 * hov() / sqrt(dot(m, m) + 0.010);
}
fn scene(uv: vec2f, p: vec2f) -> vec3f {
let ro: vec3f = vec3f(0.0, 1.1, -1.9);
let ta: vec3f = vec3f(0.0, -0.45, 0.25);
let fw: vec3f = normalize(ta - ro);
let rt: vec3f = normalize(cross(vec3f(0.0, 1.0, 0.0), fw));
let up: vec3f = cross(fw, rt);
let rd: vec3f = normalize(fw * 1.55 + rt * p.x + up * p.y);
let mp: vec2f = mouseP();
let rdm: vec3f = normalize(fw * 1.55 + rt * mp.x + up * mp.y);
let pm: vec2f = ro.xz + rdm.xz * (-ro.y / min(rdm.y, -0.05));
let hit: bool = rd.y < -0.01;
var lo: f32 = -ro.y / min(rd.y, -0.01);
var hi: f32 = lo;
var done: bool = false;
for (var i: i32 = 0; i < 44; i++) {
if (!done) {
let pos: vec3f = ro + rd * hi;
if (pos.y < ggSheet(pos.xz, pm)) {
done = true;
} else {
lo = hi;
hi = hi + 0.03 + hi * 0.015;
}
}
}
for (var j: i32 = 0; j < 6; j++) {
let mid: f32 = 0.5 * (lo + hi);
let pos: vec3f = ro + rd * mid;
let below: bool = pos.y < ggSheet(pos.xz, pm);
hi = select(hi, mid, below);
lo = select(mid, lo, below);
}
let th: f32 = 0.5 * (lo + hi);
let sp: vec3f = ro + rd * th;
let h: f32 = ggSheet(sp.xz, pm);
let e: f32 = 0.004;
let hx: f32 = ggSheet(sp.xz + vec2f(e, 0.0), pm) - h;
let hz: f32 = ggSheet(sp.xz + vec2f(0.0, e), pm) - h;
let n: vec3f = normalize(vec3f(-hx / e, 1.0, -hz / e));
let depth: f32 = saturate(-h * 1.4);
let facing: f32 = saturate(dot(n, -rd));
let rim: f32 = pow(1.0 - facing, 2.0);
let gs: f32 = 0.085;
let tone: f32 = 0.055 + depth * 0.11;
let gx: f32 = engrave(sp.x, gs, tone);
let gz: f32 = engrave(sp.z, gs, tone);
let fine: f32 = max(engrave(sp.x, gs * 0.25, 0.05), engrave(sp.z, gs * 0.25, 0.05)) * 0.35;
let fog: f32 = exp(-max(th - 1.6, 0.0) * 0.55);
let grid: f32 = (max(gx, gz) + fine) * fog * select(0.0, 1.0, hit);
let tt: f32 = tnow() * 0.42;
let cc: vec2f = vec2f(cos(tt), sin(tt));
let orbitA: f32 = stroke(length(sp.xz) - 0.40, 0.45) * step(0.5, fract(atan2(sp.z, sp.x) * 7.0)) * fog;
let orbitB: f32 = stroke(length(sp.xz) - 0.29, 0.45) * fog * 0.6;
var orbs: f32 = 0.0;
var cores: f32 = 0.0;
for (var k: i32 = 0; k < 3; k++) {
let bodyXZ: vec2f = select(select(-cc * 0.29, pm, k == 2), cc * 0.40, k == 0);
let weight: f32 = select(select(1.0, hov(), k == 2), 0.8, k == 0);
let wp: vec3f = vec3f(bodyXZ.x, ggSheet(bodyXZ, pm) + 0.04, bodyXZ.y);
let v: vec3f = wp - ro;
let z: f32 = dot(v, fw);
let sp2: vec2f = vec2f(dot(v, rt), dot(v, up)) / z * 1.55;
let dd: f32 = length(p - sp2);
let rad: f32 = select(select(0.024, 0.014, k == 2), 0.019, k == 0);
orbs += exp(-dd / rad * 1.6) * weight;
cores += fillAA(dd - rad * 0.36) * weight;
}
let stars: f32 = step(0.9965, h21(floor(uv * u.res.xy / 2.0))) * (1.0 - sstep(-0.05, 0.12, -p.y + 0.15)) * select(1.0, 0.0, hit);
let ink: vec3f = inkCol(sp.xz * 0.8, 1.4);
var c: vec3f = ink * grid * (0.42 + rim * 0.9 + depth * 0.65);
c += holo(depth * 1.6 + foilPhase(p, 0.8)) * grid * depth * 0.55;
c += u.accent.rgb * (orbitA * 0.5 + orbitB * 0.35);
c += mix(u.accent.rgb, vec3f(1.0, 0.92, 0.78), 0.55) * orbs * 0.9 + vec3f(1.0) * cores;
c += silver() * stars * 0.6;
return c;
}`};import{layoutText as Xe}from"./zen-foil.js";var ge=Xe({fps:"24 FPS",frame:"FRAME",onion:"ONION SKIN \xB15",micro:"ANIMATIC PRO \xB7 SQUASH & STRETCH \xB7 TIMING \xB7 SPACING \xB7 TOON RENDERING FOR PROFESSIONALS \xB7 "},0),g=ge.at,ue={id:"toon",still:1.92,data(e){ge.write(e)},code:`const GROUND: f32 = -0.2;
const BR: f32 = 0.062;
fn ballAt(s: f32) -> vec4f {
let cyc: f32 = 4.0;
let k: f32 = s - cyc * floor(s / cyc);
let x: f32 = -0.58 + k / cyc * 1.06;
let bounce: f32 = fract(k);
let hgt: f32 = 0.34 * pow(0.78, floor(k));
let y: f32 = GROUND + BR + 4.0 * hgt * bounce * (1.0 - bounce);
let contact: f32 = exp(-min(bounce, 1.0 - bounce) * 30.0);
let vy: f32 = 4.0 * hgt * (1.0 - 2.0 * bounce);
let stretch: f32 = saturate(abs(vy) * 0.35) * (1.0 - contact);
return vec4f(x, y - contact * BR * 0.28, contact * 0.32 - stretch * 0.22, atan2(vy, 0.265));
}
fn ballD(p: vec2f, st: vec4f) -> f32 {
let k: f32 = 1.0 + abs(st.z);
let axis: f32 = select(st.w, 0.0, st.z > 0.0);
let q: vec2f = rot2(-axis) * (p - st.xy);
let e: vec2f = q / vec2f(k, 1.0 / k);
return (length(e) - BR) / k;
}
fn scene(uv: vec2f, p: vec2f) -> vec3f {
let t: f32 = tnow();
let fps: f32 = 12.0;
let s: f32 = floor(t * fps) / fps;
let st: vec4f = ballAt(s);
let bd: f32 = ballD(p, st);
let local: vec2f = (p - st.xy) / BR;
let nz: f32 = sqrt(max(1.0 - dot(local, local), 0.0));
let lam: f32 = dot(normalize(vec3f(local, nz)), normalize(vec3f(-0.5, 0.6, 0.62)));
let band: f32 = select(select(0.35, 0.65, lam > 0.2), 1.0, lam > 0.72);
let inBall: f32 = fillAA(bd);
let shadeHatch: f32 = engrave(p.x + p.y, 0.006, 0.4) * step(lam, 0.2);
let inkLine: f32 = stroke(bd, 1.4);
let spec: f32 = fillAA(length(local - vec2f(-0.38, 0.42)) * BR - BR * 0.16) * inBall;
var onion: f32 = 0.0;
for (var i: i32 = 1; i <= 5; i++) {
let os: vec4f = ballAt(s - f32(i) * 2.0 / fps);
onion += stroke(ballD(p, os), 0.55) * (1.0 - f32(i) / 6.0) * (1.0 - inBall);
}
var path: f32 = 0.0;
for (var i: i32 = 0; i < 40; i++) {
let ps: vec4f = ballAt(s + (f32(i) - 20.0) * 0.05);
path += fillAA(length(p - ps.xy) - 0.0022) * 0.5;
}
let groundLine: f32 = stroke(p.y - GROUND, 0.8) * step(-0.7, p.x) * step(p.x, 0.62);
let groundHatch: f32 = engraveP(p.x - p.y, 0.012, 0.15, pxs()) * step(p.y, GROUND) * step(GROUND - 0.03, p.y) * step(-0.7, p.x) * step(p.x, 0.62);
let hgt: f32 = st.y - GROUND - BR;
let shadowE: vec2f = (p - vec2f(st.x, GROUND + 0.006)) / vec2f(BR * (1.0 - hgt * 1.6), 0.012);
let shadow: f32 = fillAA((length(shadowE) - 1.0) * 0.01) * saturate(1.0 - hgt * 2.5);
let tlY: f32 = -0.36;
let tl0: f32 = -aspect() * 0.5 + 0.05;
let tl1: f32 = aspect() * 0.5 - 0.05;
let fpos: f32 = (p.x - tl0) / (tl1 - tl0) * 96.0;
let onTrack: f32 = step(tl0, p.x) * step(p.x, tl1);
let tick: f32 = stroke((fract(fpos + 0.5) - 0.5) * (tl1 - tl0) / 96.0, 0.35) * step(abs(p.y - tlY), select(0.008, 0.016, fract(floor(fpos + 0.5) / 12.0) < 0.01)) * onTrack;
let track: f32 = (stroke(p.y - tlY - 0.022, 0.4) + stroke(p.y - tlY + 0.022, 0.4)) * onTrack;
let keyX: f32 = (floor(fpos / 12.0 + 0.5) * 12.0) / 96.0 * (tl1 - tl0) + tl0;
let keyQ: vec2f = rot2(PI * 0.25) * (p - vec2f(keyX, tlY));
let keys: f32 = (stroke(sdBox(keyQ, vec2f(0.007)), 0.6) + fillAA(sdBox(keyQ, vec2f(0.004)))) * onTrack;
let frameN: f32 = floor(t * 24.0) - 96.0 * floor(t * 24.0 / 96.0);
let headX: f32 = tl0 + frameN / 96.0 * (tl1 - tl0);
let playhead: f32 = stroke(p.x - headX, 0.8) * step(abs(p.y - tlY), 0.05) + fillAA(sdBox(p - vec2f(headX, tlY + 0.055), vec2f(0.01, 0.007)));
let fi: i32 = i32(frameN);
let hud: f32 = textRun(p, vec2f(-aspect() * 0.5 + 0.05, 0.45), 0.017,${g.frame.start},${g.frame.count}, 0.0)
+ digitCov(p, vec2f(-aspect() * 0.5 + 0.05, 0.42), 0.05, (fi / 100) % 10, 0.0)
+ digitCov(p, vec2f(-aspect() * 0.5 + 0.08, 0.42), 0.05, (fi / 10) % 10, 0.0)
+ digitCov(p, vec2f(-aspect() * 0.5 + 0.11, 0.42), 0.05, fi % 10, 0.0)
+ textRun(p, vec2f(aspect() * 0.5 - 0.15, 0.45), 0.017,${g.fps.start},${g.fps.count}, 0.0)
+ textRun(p, vec2f(aspect() * 0.5 - 0.25, 0.41), 0.0145,${g.onion.start},${g.onion.count}, 0.0);
let micro: f32 = textLoop(p, -0.468, 0.014,${g.micro.start},${g.micro.count}, t * 0.01, 0.0);
let ink: vec3f = inkCol(p, 1.2);
let ballCol: vec3f = mix(u.accent.rgb, vec3f(1.0, 0.62, 0.42), 0.55);
var c: vec3f = ballCol * band * inBall * 0.8 * (1.0 - shadeHatch * 0.5) + vec3f(1.0) * spec * 0.9 + silver() * inkLine;
c += vec3f(0.45, 0.85, 1.0) * onion * 0.7 + ink * path * 0.6;
c += ink * (groundLine * 0.8 + groundHatch * 0.35) + ink * shadow * 0.2;
c += ink * (tick * 0.7 + track * 0.5) + vec3f(1.0, 0.8, 0.45) * keys * 0.9 + vec3f(1.0, 0.45, 0.4) * playhead;
c += silver() * hud * 0.8 + ink * micro * 0.4;
return c;
}`};import{layoutText as We}from"./zen-foil.js";var be=We({week:"WEEK",of:"OF 4,680",cols:"52 WEEKS \xD7 90 YEARS",micro:"CHRONOSLIFE \xB7 YOUR LIFE IN WEEKS \xB7 EVERY SQUARE IS SEVEN DAYS \xB7 MAKE THEM COUNT \xB7 "},0),u=be.at,ke={id:"chronos",still:5,data(e){be.write(e)},code:`fn scene(uv: vec2f, p: vec2f) -> vec3f {
let t: f32 = tnow();
let horizon: f32 = 1.55;
let z: f32 = 1.4 / (horizon - p.y);
let wx: f32 = p.x * z;
let nowRow: f32 = 34.0;
let weeksLived: f32 = nowRow * 52.0 + floor(t * 2.5) - 52.0 * floor(t * 2.5 / 52.0);
let zTop: f32 = 1.4 / (horizon - 0.4);
let rowF: f32 = (zTop - z) / 0.0108;
let colF: f32 = (wx + 0.02) / 0.0172 + 26.0;
let row: f32 = floor(rowF);
let col: f32 = floor(colF);
let inGrid: bool = (col >= 0.0) && (col < 52.0) && (row >= 0.0) && (row < 90.0) && (p.y < 0.4);
let idx: f32 = row * 52.0 + col;
let lived: f32 = step(idx, weeksLived - 1.0);
let current: f32 = 1.0 - step(0.5, abs(idx - weeksLived));
let cell: vec2f = vec2f(fract(colF), fract(rowF)) - 0.5;
let sq: f32 = sdRoundBox(cell, vec2f(0.33), 0.08);
let fw: f32 = max(fwidth(colF), fwidth(rowF));
let fillC: f32 = saturate(0.5 - sq / max(fw, 1e-4));
let ringC: f32 = saturate(1.0 - abs(sq) / max(fw, 1e-4) * 1.2) * (1.0 - lived);
let fog: f32 = 0.55 + 0.45 * sstep(0.4, -0.2, p.y);
let decade: f32 = select(0.0, 1.0, fract(row / 10.0 + 0.001) < 0.05);
let pulse: f32 = 0.6 + 0.4 * sin(t * 4.0);
let gridOn: f32 = select(0.0, 1.0, inGrid);
let livedInk: f32 = fillC * lived * gridOn * fog * (1.0 + decade * 0.45);
let futureInk: f32 = ringC * gridOn * fog;
let nowInk: f32 = (fillC + exp(-length(cell) * 6.0) * 0.6) * current * gridOn * pulse;
let nowZ: f32 = zTop - (nowRow + 0.5) * 0.0108;
let nowY: f32 = horizon - 1.4 / nowZ;
let nowLine: f32 = stroke(p.y - nowY, 0.5) * step(abs(p.x), aspect() * 0.5 - 0.04) * 0.5;
let wk: i32 = i32(weeksLived) + 1;
let hx: f32 = -aspect() * 0.5 + 0.05;
var digits: f32 = 0.0;
for (var j: i32 = 0; j < 4; j++) {
let pw: f32 = pow(10.0, f32(3 - j));
digits += digitCov(p, vec2f(hx + f32(j) * 0.034 + select(0.0, 0.012, j > 0), 0.4), 0.058, i32(floor(f32(wk) / pw)) % 10, 0.0);
}
let comma: f32 = fillAA(length(p - vec2f(hx + 0.038, 0.348)) - 0.003);
let labels: f32 = textRun(p, vec2f(hx, 0.448), 0.017,${u.week.start},${u.week.count}, 0.0)
+ textRun(p, vec2f(hx + 0.16, 0.383), 0.017,${u.of.start},${u.of.count}, 0.0)
+ textRun(p, vec2f(aspect() * 0.5 - 0.36, 0.448), 0.0155,${u.cols.start},${u.cols.count}, 0.0);
let micro: f32 = textLoop(p, -0.468, 0.014,${u.micro.start},${u.micro.count}, t * 0.01, 0.0);
let ink: vec3f = inkCol(p, 1.0);
let lifeCol: vec3f = mix(u.accent.rgb, holo(row * 0.011 + foilPhase(p, 0.5)), 0.45);
var c: vec3f = lifeCol * livedInk * 0.75 + ink * futureInk * 0.35 + vec3f(1.0, 0.9, 0.7) * nowInk * 1.1;
c += ink * nowLine;
c += silver() * (digits * 0.9 + comma + labels * 0.65) + ink * micro * 0.4;
return c;
}`};import{layoutText as Ve}from"./zen-foil.js";var ye=Ve({tminus:"T-MINUS",mom:"MOMENTUM",ship:"SHIP IT",micro:"DEADLINEDASH \xB7 TURN DEADLINES INTO MOMENTUM \xB7 URGENCY-DRIVEN COUNTDOWNS \xB7 "},0),b=ye.at,we={id:"deadline",still:6.3,data(e){ye.write(e)},code:`const DCN: vec2f = vec2f(-0.3, -0.02);
const DRR: f32 = 0.31;
fn scene(uv: vec2f, p: vec2f) -> vec3f {
let t: f32 = tnow();
let period: f32 = 10.0;
let k: f32 = fract(t / period);
let run: f32 = saturate(k / 0.9);
let rem: f32 = 95.0 * (1.0 - run);
let urgency: f32 = ease(run * 1.15 - 0.15);
let burst: f32 = saturate((k - 0.9) / 0.1);
let d: vec2f = p - DCN;
let r: f32 = length(d);
let a: f32 = fract(atan2(d.x, d.y) / TAU + 1.0);
let tickA: f32 = fract(a * 60.0 + 0.5) - 0.5;
let major: bool = fract(floor(a * 60.0 + 0.5) / 5.0) < 0.01;
let tickLen: f32 = select(0.022, 0.045, major);
let ticks: f32 = stroke(tickA * TAU * r / 60.0, select(0.45, 0.9, major)) * step(DRR - tickLen, r) * step(r, DRR);
let rings: f32 = stroke(r - DRR - 0.012, 0.8) + stroke(r - DRR - 0.022, 0.35) + stroke(r - 0.2, 0.4);
let guil: f32 = engraveP(r + 0.004 * sin(a * TAU * 24.0 + r * 80.0), 0.009, 0.1, pxs()) * step(r, 0.195);
let remFrac: f32 = 1.0 - run;
let arcBand: f32 = fillAA(abs(r - 0.235) - 0.012) * step(a, remFrac);
let arcTrack: f32 = stroke(abs(r - 0.235) - 0.012, 0.35);
let sweepA: f32 = fract(rem / 60.0);
let hd: vec2f = vec2f(sin(sweepA * TAU), cos(sweepA * TAU));
let hand: f32 = stroke(sdSeg(d, -hd * 0.04, hd * 0.27), 0.8) + fillAA(r - 0.012);
let mm: i32 = i32(floor(rem / 60.0));
let ss: i32 = i32(floor(rem - f32(mm) * 60.0));
let cc: i32 = i32(floor(fract(rem) * 100.0));
let x0: f32 = 0.12;
let sz: f32 = 0.105;
let adv: f32 = sz * 0.6;
var digits: f32 = 0.0;
digits += digitCov(p, vec2f(x0, 0.1), sz, (mm / 10) % 10, 0.2) + digitCov(p, vec2f(x0 + adv, 0.1), sz, mm % 10, 0.2);
let colon: f32 = fillAA(length(p - vec2f(x0 + adv * 2.0 + 0.012, 0.035)) - 0.006) + fillAA(length(p - vec2f(x0 + adv * 2.0 + 0.012, 0.0)) - 0.006);
digits += digitCov(p, vec2f(x0 + adv * 2.0 + 0.028, 0.1), sz, (ss / 10) % 10, 0.2) + digitCov(p, vec2f(x0 + adv * 3.0 + 0.028, 0.1), sz, ss % 10, 0.2);
let csz: f32 = 0.05;
let cents: f32 = digitCov(p, vec2f(x0 + adv * 4.0 + 0.04, 0.045), csz, (cc / 10) % 10, 0.0) + digitCov(p, vec2f(x0 + adv * 4.0 + 0.04 + csz * 0.6, 0.045), csz, cc % 10, 0.0);
let mw: f32 = aspect() * 0.5 - 0.06 - x0;
let mbar: f32 = fillAA(sdBox(p - vec2f(x0 + mw * run * 0.5, -0.13), vec2f(mw * run * 0.5, 0.008)));
let mtrack: f32 = stroke(sdBox(p - vec2f(x0 + mw * 0.5, -0.13), vec2f(mw * 0.5, 0.008)), 0.35);
var chev: f32 = 0.0;
for (var i: i32 = 0; i < 6; i++) {
let cx: f32 = x0 + fract(t * 0.5 + f32(i) / 6.0) * mw;
let q: vec2f = p - vec2f(cx, -0.18);
chev += stroke(abs(q.y) * 1.2 - (q.x - 0.0), 0.6) * step(abs(q.y), 0.016) * step(-0.02, q.x) * step(q.x, 0.02) * run;
}
let lineId: f32 = floor(a * 72.0);
let jitter: f32 = h11(lineId * 1.7);
let streak: f32 = stroke((fract(a * 72.0) - 0.5) * TAU * r / 72.0, 0.6) * step(0.32 + jitter * 0.1 + burst * 0.2, r) * step(r, 0.36 + jitter * 0.2 + burst * 0.75) * burst * (1.0 - burst);
let flash: f32 = exp(-r * 8.0) * burst * (1.0 - burst) * 4.0;
let lbl: f32 = textRun(p, vec2f(x0, 0.165), 0.018,${b.tminus.start},${b.tminus.count}, 0.0)
+ textRun(p, vec2f(x0, -0.085), 0.016,${b.mom.start},${b.mom.count}, 0.0)
+ textRun(p, vec2f(x0 + mw - 0.085, -0.085), 0.016,${b.ship.start},${b.ship.count}, 0.0) * run;
let micro: f32 = textLoop(p, -0.468, 0.014,${b.micro.start},${b.micro.count}, t * 0.01, 0.0);
let ink: vec3f = inkCol(p, 1.3);
let cool: vec3f = mix(u.accent.rgb, vec3f(0.6, 0.9, 1.0), 0.3);
let hot: vec3f = vec3f(1.0, 0.42, 0.3);
let heat: vec3f = mix(cool, hot, urgency);
var c: vec3f = ink * (ticks * 0.85 + rings * 0.7 + guil * 0.45 + arcTrack * 0.5);
c += heat * arcBand * 0.85 + silver() * hand * 0.9;
c += mix(silver(), heat, 0.35 + urgency * 0.4) * (digits + colon * step(0.5, fract(t * 2.0))) + silver() * cents * 0.6;
c += heat * (mbar * 0.9 + chev * 0.7) + ink * mtrack * 0.6;
c += mix(hot, vec3f(1.0, 0.9, 0.7), 0.4) * (streak * 1.2 + flash);
c += silver() * lbl * 0.7 + ink * micro * 0.4;
return c;
}`};import{layoutText as Ke,packPoints as Ze}from"./zen-foil.js";var _e=[[.36,.25],[.5,-.08],[.31,-.3],[-.46,.27],[-.6,-.17],[-.36,-.34],[.62,.2]],Ae=Ke({rim:"BAKERSPOT \xB7 POP-UP PASTRY \xB7 FRESH \xB7 LOCAL \xB7 ON DEMAND \xB7 ",micro:"BAKERSPOT \xB7 ARTISANAL BAKED GOODS ON DEMAND \xB7 POP-UP PASTRY MARKETPLACE \xB7 "},8),R=Ae.at,Re={id:"baker",still:5.2,data(e){Ze(_e,e,0),Ae.write(e)},code:`const MC: vec2f = vec2f(-0.04, 0.0);
fn lobe(p: vec2f, i: i32) -> vec3f {
let fi: f32 = f32(i) - 2.0;
let af: f32 = abs(fi);
let ang: f32 = PI * 0.5 - fi * 0.5;
let dir: vec2f = vec2f(cos(ang), sin(ang));
let ctr: vec2f = MC + vec2f(0.0, -0.165) + dir * 0.17;
let tang: vec2f = vec2f(-dir.y, dir.x);
let q: vec2f = vec2f(dot(p - ctr, tang), dot(p - ctr, dir));
let s: f32 = 1.0 - af * 0.2;
let ab: vec2f = vec2f(0.058 * (1.0 - af * 0.12), 0.056 * (1.0 - af * 0.3));
let k: f32 = length(q / ab);
return vec3f((k - 1.0) * min(ab.x, ab.y), q.x / ab.x, s);
}
fn pinD(q: vec2f, r: f32) -> f32 {
let head: f32 = length(q - vec2f(0.0, r * 1.25)) - r;
let dq: vec2f = rot2(PI * 0.25) * (q - vec2f(0.0, r * 1.05));
return min(head, sdBox(dq, vec2f(r * 0.78)));
}
fn scene(uv: vec2f, p: vec2f) -> vec3f {
let t: f32 = tnow();
let d: vec2f = p - MC;
let r: f32 = length(d);
let inMedal: f32 = fillAA(r - 0.272);
let bs: vec2f = vec2f(0.13, 0.095);
let cellP: vec2f = (p + vec2f(0.02, 0.01)) / bs;
let cid: vec2f = floor(cellP);
let cq: vec2f = (fract(cellP) - 0.5) * bs;
let block: f32 = sdRoundBox(cq, bs * 0.5 - vec2f(0.011), 0.008);
let ave: f32 = abs(dot(p - vec2f(0.1, -0.05), normalize(vec2f(0.57, -0.82)))) - 0.016;
let lot: f32 = max(block, -ave);
let blockHatch: f32 = engrave(p.x * 0.7 + p.y * 0.7 + h21(cid) * 0.01, 0.0075, 0.16 + 0.12 * h21(cid + vec2f(5.0, 2.0))) * fillAA(lot);
let curbs: f32 = stroke(lot, 0.45);
let mapInk: f32 = (blockHatch * 0.55 + curbs * 0.6) * (1.0 - inMedal);
let rimText: f32 = ringText(p, MC, 0.252, 0.03,${R.rim.start},${R.rim.count}, t * 0.05, false);
let rims: f32 = stroke(r - 0.272, 0.9) + stroke(r - 0.232, 0.5) + stroke(r - 0.226, 0.3);
let beadA: f32 = fract(atan2(d.x, d.y) / TAU * 72.0) - 0.5;
let beads: f32 = fillAA(length(vec2f(beadA * TAU * 0.217 / 72.0, r - 0.217)) - 0.0026);
let guil: f32 = engraveP(r + 0.006 * sin(atan2(d.y, d.x) * 14.0 + r * 50.0), 0.0085, 0.09, pxs()) * step(r, 0.21);
let field: f32 = guil * 0.5;
var body: f32 = 0.0;
var hatch: f32 = 0.0;
var seams: f32 = 0.0;
var cover: f32 = 0.0;
for (var j: i32 = 0; j < 5; j++) {
let i: i32 = select(select(select(select(2, 3, j == 3), 1, j == 2), 4, j == 1), 0, j == 0);
let lb: vec3f = lobe(p, i);
let inside: f32 = fillAA(lb.x);
let light: f32 = saturate(0.55 + 0.45 * (p.y - MC.y + 0.02) * 6.0);
let lines: f32 = engraveP(lb.y, 0.2, 0.35 + light * 0.3, pxs() / 0.055);
hatch = mix(hatch, lines * (0.55 + light * 0.45), inside);
seams = mix(seams, 0.0, inside) + stroke(lb.x, 0.7);
body = max(body, inside);
cover = max(cover, inside);
}
let crumbs: f32 = step(0.985, h21(floor(p / 0.006))) * body;
var steam: f32 = 0.0;
for (var j: i32 = 0; j < 3; j++) {
let fj: f32 = f32(j);
let x: f32 = MC.x + (fj - 1.0) * 0.045 + 0.012 * sin(p.y * 32.0 - t * 2.2 + fj * 2.0);
let rise: f32 = sstep(0.065, 0.09, p.y - MC.y) * (1.0 - sstep(0.15, 0.2, p.y - MC.y));
steam += stroke(p.x - x, 0.7) * rise * (0.5 + 0.5 * sin(t * 1.3 + fj * 2.0));
}
var pins: f32 = 0.0;
var pulses: f32 = 0.0;
for (var i: i32 = 0; i < 7; i++) {
let c: vec2f = dPt(0, i);
let tau: f32 = fract(t / 8.0) * 8.0 - f32(i) * 0.9;
let shown: f32 = step(0.0, tau);
let springK: f32 = select(0.0, 1.0 - exp(-tau * 7.0) * cos(tau * 18.0), tau > 0.0);
let scl: f32 = max(springK, 0.02);
let pd: f32 = pinD((p - c) / scl, 0.022) * scl;
pins += (fillAA(pd) * 0.6 + stroke(pd, 0.6)) * shown;
pulses += stroke(length((p - c) * vec2f(1.0, 2.2)) - fract(tau * 0.6) * 0.07, 0.5) * shown * (1.0 - fract(tau * 0.6));
}
let micro: f32 = textLoop(p, -0.468, 0.014,${R.micro.start},${R.micro.count}, t * 0.01, 0.0);
let ink: vec3f = inkCol(p, 1.2);
let gold: vec3f = vec3f(1.0, 0.8, 0.5);
let crust: vec3f = mix(vec3f(1.0, 0.72, 0.42), holo(foilPhase(p, 2.0) + 0.1), 0.25);
var c: vec3f = ink * mapInk;
c += mix(ink, gold, 0.35) * (rims * 0.85 + beads * 0.8 + field) * inMedal + mix(ink, gold, 0.35) * rims * (1.0 - inMedal);
c += silver() * rimText * 0.85;
c += crust * (hatch * body * 0.95 + seams * 0.6) + vec3f(1.0, 0.9, 0.75) * crumbs * 0.4;
c += silver() * steam * 0.45;
c += mix(u.accent.rgb, vec3f(1.0, 0.45, 0.5), 0.5) * (pins * 0.9 + pulses * 0.6);
c += ink * micro * 0.4;
return c;
}`};var Qe=[[D,"#59c3ff","AI Pioneer Program","Engraved U.S. map; the program arcs out from Washington, D.C. under the ZEN seal and each arrival mints a credential."],[H,"#6ee7b7","Boys & Girls Clubs \xD7 ZEN","Intaglio globe; the Clubs' hands mark rides great-circle arcs from D.C. to world hubs."],[F,"#4ee6ad","NEAR Protocol \xD7 ZEN","Sharded chunks gathered into blocks on a hash-linked chain while the NEAR mark assembles."],[X,"#86d9a8","ParkPulse","USGS-style engraved topographic sheet with a live trail."],[V,"#ffb86b","SparkLab AI","A prompt is typed; a diffusion sampler resolves halftone noise into an engraved flask."],[Z,"#f2a7c3","CuratePro","One-point-perspective gallery with a roving spotlight and red dots as works sell."],[Q,"#8fb4ff","STEMScore","Judges' rubric polygons converge on a consensus; the leaderboard re-ranks."],[ee,"#5eead4","MedCode","Phosphor ECG sweep driving an ICD-10 lookup behind an encryption seal."],[le,"#ff8fa3","ClinicalCipher","An engraved Alberti cipher disk re-encrypting a record as the key turns."],[re,"#7ef0c2","Prompt Playground","A terminal streams an answer token by token beside next-token probabilities."],[oe,"#b69cff","Prompt a Planet","Analytic planet with procedural continents, rings and a regeneration sweep."],[ae,"#67e8f9","Prompt a Prototype","A dimensioned blueprint that renders into a shaded, engraved product shot."],[pe,"#f5d06f","ZEN Weekly","An engraved front page runs through the press, then fans out to subscribers."],[de,"#fb9a6b","CanvasForge","A pen plotter inks streamlines of a divergence-free flow field."],[me,"#c4b5fd","InspireLens","An engraved prime lens: knurled barrel, stepping iris, heptagonal bokeh."],[he,"#60a5fa","GravityGrid","Ray-marched spacetime sheet sagging under an orbiting binary."],[ue,"#fda4af","Animatic Pro","Bouncing ball with squash and stretch, onion skins and timeline keys."],[ke,"#93c5fd","ChronosLife","A lifetime in weeks receding in perspective; the current week pulses."],[we,"#fbbf24","DeadlineDash","Engraved chronograph countdown; momentum fills as time runs out."],[Re,"#fcd34d","BakerSpot","Minted medallion with an engraved croissant over a map of pop-up pins."]],Ee=Qe.map(([e,l,k,t])=>(e.accent??(e.accent=l),e.title??(e.title=k),e.description??(e.description=t),e.aspect??(e.aspect=1.6),e));Ee.forEach(e=>Je(e));export{Ee as SHOWCASE};
