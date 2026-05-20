# Alexander Leschik

**Developer · Founder · Systems Architect**

[![Live](https://img.shields.io/badge/live-alexleschik.com-00d4ff?style=flat-square)](https://alexleschik.com)
[![Vercel](https://img.shields.io/badge/deployed-vercel-black?style=flat-square&logo=vercel)](https://alexleschik.com)
[![TypeScript](https://img.shields.io/badge/TypeScript-strict-3178c6?style=flat-square&logo=typescript&logoColor=white)](https://typescriptlang.org)
[![React](https://img.shields.io/badge/React-18-61dafb?style=flat-square&logo=react&logoColor=black)](https://react.dev)
[![Vite](https://img.shields.io/badge/Vite-5-646cff?style=flat-square&logo=vite&logoColor=white)](https://vitejs.dev)

> Builder of the 1st youth AI literacy program in US history. 50+ shipped products. Systems designed to outlast the projects that spawned them.

---

## What this is

Source for [alexleschik.com](https://alexleschik.com) — a fully hand-engineered portfolio built AI-natively. No templates. Every component, physics system, and performance optimization was designed from first principles.

The design constraint: the site itself should demonstrate the same standard of craft as the work it documents.

---

## Technical Architecture

### Particle Name Engine

The hero is a custom Canvas particle physics system rendering 11,000 particles into interactive letterforms at 60fps.

**Hot loop runs zero transcendentals:**

```typescript
// Wave computed via trig identity — precomputed at spawn, not recalculated per frame
// sin(freq·t + phase) = sinFreq·cosPhase + cosFreq·sinPhase
const wx = p.sinPhX * cosWX + p.cosPhX * sinWX;
const wy = p.sinPhY * cosWY + p.cosPhY * sinWY;
px += wx * WAVE_AMP;
py += wy * WAVE_AMP;
```

- **`Float32Array` typed buffers** — `cosPhX`, `sinPhX`, `cosPhY`, `sinPhY` computed once per particle at spawn. Zero heap allocation in the render loop.
- **Dual-canvas trail system** — offscreen `HTMLCanvasElement` receives `drawImage(trail, 0.70α)` each frame before the particle pass. GPU texture blit ~0.2ms vs `destination-out` compositing ~2–4ms.
- **5-LUT color system** — `Uint8Array` type index per particle maps to `[dark-slate → electric-blue → cyan → violet → near-white]`. Zero branch in the color path.
- **Cubic force falloff** — repulsion uses `t³` instead of `t²`. Near-zero at the edge, peaks gradually at center. Smooth entry/exit, no velocity spike artifacts.
- **Physics** — `RETURN_SPEED 0.10 / FRICTION 0.855 / MAX_SPEED 22` — snappy spring return, zero oscillation, hard velocity cap prevents permanent displacement.

### Scroll Engine (`useScrollEngine`)

RAF-based smooth scroll with section mapping:

```typescript
// Lerp toward raw scroll each frame — cinematic lag without input delay
smoothProgress += (rawProgress - smoothProgress) * 0.12;
```

- Section boundaries resolved once via `ResizeObserver` on `[data-scroll-section]` elements
- `cubeRotation` derived from `smoothProgress` — the 3D cube is a pure function of scroll position
- Zero React re-renders in the scroll loop — mutations go through direct DOM refs

### Lazy Architecture

Every computationally expensive component is isolated as an async chunk:

```
React.lazy() + Suspense
└── IntersectionObserver (LazySection, rootMargin: 400px)
    ├── SignalConstellation  (Three.js / R3F)
    ├── ImageTheater         (Canvas + CSS 3D)
    ├── GlassOrbit           (Three.js)
    ├── ProjectSpotlight     (20 cards, static CSS previews — zero external requests)
    └── MediaRoom            (8 YouTube embeds, staggered IO activation)
```

Initial bundle: **< 200KB gzipped**. All 20 project cards are instant CSS renders — zero iframe loading on page load.

### 3D Image Theater (CSS, no WebGL)

```
perspective: 1500px  →  transform-style: preserve-3d
├── Active card:  rotateY((mouseX − 0.5) × 24°)  rotateX((mouseY − 0.5) × −16°)
├── Flanking ±1:  translateZ(−240px)  blur(0px)
├── Flanking ±2:  translateZ(−480px)  blur(2.2px)
└── Flanking ±3:  translateZ(−720px)  blur(4.4px)  opacity(0.41)
```

Ambient background: 55×28 sine/cosine wave-interference field via Canvas rAF — hue shifts per active card index.

### Performance Profile

| Metric | Value |
|--------|-------|
| Initial JS bundle | < 200KB gzip |
| External requests at page load | **0** |
| Particle count | 11,000 @ 60fps |
| `Math.sin()` / `Math.cos()` calls per frame in particle loop | **0** |
| Iframes loaded at page load | **0** |
| YouTube panels | 8 (IO-activated with staggered fallback timers) |

---

## Stack

| Layer | Technology |
|-------|-----------|
| Framework | React 18 + TypeScript (strict mode) |
| Build | Vite 5 |
| 3D / WebGL | Three.js via React Three Fiber |
| Canvas | Raw Canvas API — no abstraction layer |
| Styling | Tailwind CSS + custom CSS design tokens |
| Animation | `requestAnimationFrame` + CSS `@keyframes` |
| Deployment | Vercel — GitHub `main` → auto-deploy |

---

## Accomplishments

| | |
|-|-|
| **1st** | Youth AI literacy program in US history |
| **50+** | Products, prototypes, and systems shipped |
| **30,000+** | National members reached via Boys & Girls Clubs of America |
| **5** | Fortune 500 relationships in active orbit |
| **8** | International media appearances (TRT World, RT News) |
| **Multi** | Industries crossed — education, AI, healthcare, creative tech, commerce |

---

## Associations

| Organization | Role |
|-------------|------|
| **ZEN AI Co.** | Founder & CEO — AI education infrastructure |
| **Boys & Girls Clubs of America** | AI Curriculum Partner — national scale deployment |
| **ZEN Weekly** | Founder — AI culture newsletter, 20K+ subscribers |
| **USAIL** | AI Literacy Infrastructure |
| **Fortune 500** | Strategic Partner — 5 active relationships |
| **ZEN AI World** | Creator — AI world-building platform for youth |

---

## Media

International coverage on AI literacy work and ZEN AI Co.:

| Outlet | Coverage |
|--------|---------|
| **TRT World** | AI Education Interview; ZEN AI Co. Youth Literacy Feature |
| **RT News** | AI Literacy Segment; First Youth AI Program in US History |
| **International Press** | Multi-outlet coverage of ZEN AI Co. and AI education at national scale |

---

## Running locally

```bash
git clone https://github.com/Bluenot3/alex-leschik.git
cd alex-leschik
npm install
npm run dev
```

### Adding gallery images

Drop images into `public/gallery/` — they slot into both the 3D coverflow and the scroll gallery with no code changes:

```
public/gallery/
├── arsenal.jpg
├── zenai-world-tunnel.jpg
├── zenai-world-sphere.jpg
├── zen-weekly-fresco.jpg
└── zen-weekly-city.jpg
```

---

## Contact

**[alexleschik.com → Contact](https://alexleschik.com)**

| Platform | Handle |
|---------|--------|
| X / Twitter | [@MillennialAGI](https://x.com/MillennialAGI) |
| LinkedIn | [alex-leschik](https://www.linkedin.com/in/alex-leschik/) |
| GitHub | [Bluenot3](https://github.com/Bluenot3) |
| Instagram | [@0xvvs1](https://www.instagram.com/0xvvs1/) |

---

*Systems that compound instead of decay.*
