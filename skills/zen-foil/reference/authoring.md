# Writing a scene

A scene is one fragment program plus optional JavaScript around it. The engine adds the shared library, the post pass, uniforms and entry points. It compiles the program natively on WebGPU, or translates it to GLSL for WebGL2, and runs one draw per plate per frame.

On a page that loads the CDN script instead of importing the module (Lovable), call the same functions on `window.ZenFoil`: `ZenFoil.defineScene`, `ZenFoil.layoutText`, `ZenFoil.packPoints`, `ZenFoil.loadImage` and so on (`reference/integration.md#lovable`).

```ts
import { defineScene } from "zen-foil";

defineScene({
  id: "my-scene",                 // <zen-foil scene="my-scene">
  title: "My scene",
  description: "What it shows and what moves.",
  aspect: 1.6,                    // default width/height when CSS doesn't size it
  accent: "#7cc4ff",              // default ink colour
  still: 5.0,                     // scene time for the reduced-motion still
  post: "plate",                  // "plate" (themeable) | "raw" | "alpha" — see Themes
  params: { … },                  // attributes → data block (below)
  data(d, params) { … },          // optional: arrays and fixed text into u.d
  layers(params, box) { … },      // optional: reserve image layers
  behavior(ctx) { … },            // optional: per-view JS (pointer, scroll, images, timers)
  code: /* wgsl */ `fn scene(uv: vec2f, p: vec2f) -> vec3f { … }`,
});
```

## Coordinates

```
uv: (0,0) ─────────────── (1,0)       p: y up, centred on the plate
     │                      │            p.y ∈ [-0.5, 0.5]
     │        (0,0) p       │            p.x ∈ [-aspect()/2, aspect()/2]
     │                      │            1 unit = plate height
   (0,1) ─────────────── (1,1)           pxs() = one pixel in p-units
```

Lay things out in `p`, so circles stay round at every aspect ratio. Size hairlines in pixels with `lineCov(distance / pxs(), halfWidthPx)` or `stroke(d, halfWidthPx)`, so they stay crisp at any resolution.

## What you get each frame

| Uniform | Contents |
|---|---|
| `u.res` | (pixel width, pixel height, DPR used, aspect). Prefer `aspect()` and `pxs()`. |
| `u.time` | (t seconds, dt, seed, intro 0→1). Use `tnow()` and `intro()`. |
| `u.mouse` | (x, y in uv, hover 0..1, pulse 1→0 after a click). Use `mouseP()` for p-space, plus `hov()` and `pulse()`. |
| `u.tilt` | (x, y): the hologram tilt from pointer, scroll and idle drift. `foilPhase()` uses it. |
| `u.accent` | The accent ink, in RGB. |
| `u.p0`, `u.p1` | Free per-frame vec4s that your behavior writes. |
| `u.d[64]` | The data block: 256 floats, written once and again when params change. |
| `THEME_PAPER`, `THEME_CLEAR` | Compile-time 0/1 constants for the theme the scene runs in. |

Time is the scene clock. It freezes under reduced motion (at `still`) and in previews (`ZEN_FOIL_FREEZE`). Drive every animation from `tnow()`, never from your own counters.

## Params → WGSL

Declare params, and the engine writes them into `u.d` and keeps them live as attributes change. Nothing is recompiled.

| `type` | Slot | Read in WGSL with |
|---|---|---|
| `text` | `slot` 0–7 | `textRunP(p, origin, size, k, weight)`, `textCenterP`, `textDecodeP(…, reveal)`, `textLoopP`, `ringTextP`, `textWidthP(k, size)`, `textFitP(k, maxW, maxSize)`, `textLenP(k)` |
| `number` | `num` 0–15 | `numParam(i)` (clamped to `min`/`max`) |
| `boolean` | `num` | `numParam(i) > 0.5` (a bare attribute means true) |
| `choice` | `num` | `numParam(i)`, the index into `options` |
| `mark` | `num` (required) | `i32(numParam(i))`, the atlas slot, or −1 for none. Pass it to `logoDist`, `logoCov` or `brandSeal`. |
| `color` | `num` (takes 3) | `vec3f(numParam(i), numParam(i+1), numParam(i+2))` |
| `points`, `list`, `url` | — | Parse them yourself in `data()` or the behavior: `parsePoints`, `parseList`, `parseNumbers`. |

Params without a slot are fine. Your `data()` or behavior reads them through `params` or `ctx.params()`.

**Param names** are attribute names, so `defineScene` rejects three kinds:
- **Not lowercase:** use lowercase letters, digits and hyphens (`headline`, `scroll-speed`), because HTML lowercases attribute names.
- **The element's own attributes:** `title`, `id`, `class`, `style`, `hidden`, `lang`, `role`, `slot`, `aria-*`, `data-*`, `on*`, and the element's `scene`, `accent`, `theme`, `seed`, `fixed` and `max-dpr`.
- **Members of the element:** React 19, Vue and Svelte set those as properties instead of attributes. The common ones are `scroll`, `focus`, `click`, `remove`, `append`, `prefix`, `dataset`, `children`, `params`, `update`, `capture` and `renderer`.

Prefer the kit's names where they fit: `headline`, `subline`, `caption`, `serial`, `micro`, `mark`, `speed`.

### The data block

```
floats   0–15   string table (text params)     ← engine
floats  16–31   numeric params                 ← engine
floats  32–159  yours: arrays, fixed text      ← data(d, params)
floats 160–255  text param characters (288)    ← engine
```

- **Points and arrays:** write two points per vec4 (`packPoints`) and read them with `dPt(vec4Index, i)`. Write single floats directly and read them with `dF(floatIndex)` or `u.d[k].x`.
- **Fixed strings** (text that is not a param):

  ```ts
  const T = layoutText({ motto: "ORDO AB CHAO · " }, 100, 160);
  // data(d) { T.write(d) }
  // WGSL: textLoop(p, top, size, ${T.at.motto.start}, ${T.at.motto.count}, shift, 0.0)
  ```

- **Variable-length lists of labels**, as the `network` scene does: pack each label with `packText` and keep a small (start, count) table in your region.

## Behaviors (JavaScript per view)

Use a behavior for anything the shader can't know: global pointer or scroll, images, video, timers, app state.

```ts
behavior(ctx) {
  // ctx: host, target, params(), setLayer(i, canvas), invalidate(), reduced, layers, warn(msg)
  const onScroll = () => ctx.invalidate();            // reduced motion renders on demand
  addEventListener("scroll", onScroll, { passive: true });
  return {
    frame(u, now, dt) {                               // just before each draw
      u[20] = scrollY;                                // u.p0.x
      u[28 + 40] = performance.now() / 1000;          // u.d float 40 → dF(40)
    },
    needsFrame: () => false,                          // under reduced motion: true = draw a fresh still
    update(params) {},                                // params changed (data block already rebuilt)
    visible(on) {},                                   // off/on screen
    destroy() { removeEventListener("scroll", onScroll); },
  };
}
```

Index map:
- `u[20..23]` is `u.p0` and `u[24..27]` is `u.p1`.
- `u[28 + i]` is data float `i`. Write only in your region, or rewrite whole vec4s you own, and do it every frame.

To time events against the shader clock, read `u[4]` (scene time) inside `frame()`. Store that, not `performance.now()`. Under `ZEN_FOIL_FREEZE`/reduced motion, show the end state instead: `stage`, `engrave` and `vault` all do this.

## Image layers

```ts
layers: (params, box) => ({ width: 1024, height: 1024, count: 2 }),   // a texture_2d_array
behavior(ctx) {
  loadImage(url).then((img) => {
    const c = document.createElement("canvas"); c.width = c.height = 1024;
    drawContain(img, img.naturalWidth, img.naturalHeight, c);        // or drawCover / loadLayer(url, w, h)
    ctx.setLayer(0, c);
  });
}
```

In WGSL, sample with `imgLod(uv, layer, lod)` or `imgGrad(uv, layer, ddx, ddy)`. The uv runs 0..1 with y down, and the colour is premultiplied RGBA with full mipmaps.

Choose the LOD from screen coverage, as in `engrave`/`stage`: `lod = max(log2(texelsPerPixel), 0.0)`. A deep LOD (+3–5) gives a free blur for backdrops.

Images must be same-origin or CORS-enabled. `loadImage` throws `LayerLoadError` with `corsOnly = true` when only an `<img>` could read the image.

## Themes and post modes

- **`post: "plate"`** (the default): `scene()` returns additive light, and the user's `theme` picks the substrate:
  - `plate`: the dark engraved plate, with the minting intro, sheen and filmic tone;
  - `paper`: light is printed as ink (brightness becomes ink density, and the ink takes a deep version of your hue);
  - `clear`: premultiplied ink over the page.
- **`post: "raw"`**: `scene()` returns the final colour, with no substrate or intro. Use it for full-bleed fields and stages that paint their own ground.
- **`post: "alpha"`**: `scene()` returns a premultiplied `vec4f`, for floating objects such as the vault.

Images under `paper`: brightness becomes ink, so photos invert. Use the theme constants to stay positive:

```wgsl
let tone: f32 = mix(lum, 1.0 - lum, THEME_PAPER);   // line weight follows light on plate, dark on paper
```

## Performance inside the shader

- **Budget about 1–2 ms per plate on a mid laptop GPU at DPR 2.** The engine scales resolution adaptively, but don't lean on it.
- **Bound expensive work.** Check a cheap distance first: `if (length(p - c) < r) { …loop… }`. That is legal as long as nothing inside calls `fwidth`/`engrave`/`dpdx`.
- **Keep loops short and constant-bounded.** Use `for (var i: i32 = 0; i < MAX; i++) { if (i < n) { … } }`. Arcs, nodes and strands are typically 6–16.
- **Use `lineCov` and analytic distances,** never supersampling loops.
- **One texture fetch per layer per pixel is ideal.** Two or three for a blur and a magnifier is fine.

## Workflow

1. **Sketch the story** in one sentence: what is the focal object, what event repeats, and what does the pointer do?
2. **Scaffold** with `node scripts/new-scene.mjs <id> --out <dir> --import <path>`.
3. **Build up in this order:** layout (wide and stacked) → focal object → ornament → type → motion → foil and light.
4. **Run `node scripts/check.mjs <file>`.**
5. **Run `node scripts/preview.mjs --scenes <id> --module <file> --validate`,** then repeat:
   - with `--w 390 --h 640`;
   - with `--w 1600 --h 900`;
   - with `--theme paper --bg light`;
   - with `--backend webgpu`.
6. **Compare it side by side with a kit scene.** It should feel like the same hand made it.

## Worked example: a live countdown

```ts
import { defineScene } from "zen-foil";

defineScene({
  id: "countdown",
  aspect: 2.4,
  accent: "#fbbf24",
  still: 3,
  params: {
    target: { type: "url", default: "2030-01-01T00:00:00Z", description: "ISO date to count down to (set the real one)." },
    label: { type: "text", slot: 0, default: "LAUNCH IN" },
    mark: { type: "mark", num: 0, default: "zen" },
  },
  behavior(ctx) {
    return {
      frame(u) {
        const ms = Math.max(0, Date.parse(ctx.params().target) - Date.now());
        u[20] = Math.floor(ms / 86400000);            // days
        u[21] = Math.floor(ms / 3600000) % 24;        // hours
        u[22] = Math.floor(ms / 60000) % 60;          // minutes
        u[23] = Math.floor(ms / 1000) % 60;           // seconds
      },
    };
  },
  code: /* wgsl */ `
fn scene(uv: vec2f, p: vec2f) -> vec3f {
  let A: f32 = aspect();
  let size: f32 = min(0.3, A / 14.0);
  let x0: f32 = -size * 0.6 * 5.5;
  var digits: f32 = 0.0;
  digits += numberCov(p, vec2f(x0, size * 0.5), size, i32(u.p0.x), 3, 0.3);
  digits += numberCov(p, vec2f(x0 + size * 0.6 * 4.0, size * 0.5), size, i32(u.p0.y), 2, 0.3);
  digits += numberCov(p, vec2f(x0 + size * 0.6 * 7.0, size * 0.5), size, i32(u.p0.z), 2, 0.3);
  let tick: f32 = exp(-fract(tnow()) * 5.0);
  let label: f32 = textCenterP(p, vec2f(0.0, size * 0.5 + 0.07), 0.024, 0, 0.0);
  let seal: vec2f = brandSeal(p, vec2f(A * 0.5 - 0.2, 0.0), 0.12, i32(numParam(0)));
  let ring: f32 = lineCov(abs(length(p - vec2f(A * 0.5 - 0.2, 0.0)) - 0.12 - tick * 0.05) / pxs(), 0.6) * tick;
  let ink: vec3f = inkCol(p, 1.4);
  return mix(silver(), holo(foilPhase(p, 1.5)), 0.35) * digits + silver() * label * 0.8
       + mix(silver(), ink, 0.5) * seal.x + u.accent.rgb * (seal.y + ring * 0.6)
       + ink * engrave(p.y + 0.01 * sin(p.x * 9.0), 0.01, 0.08) * 0.15;
}
`,
});
```
