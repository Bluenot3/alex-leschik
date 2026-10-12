# Integration recipes

`zen-foil.js` is one ES module with no dependencies. Importing it:
- registers `<zen-foil>` and the kit scenes;
- exposes `window.ZenFoil`.

It is safe to import during server-side rendering, because it never touches the DOM at import time. Load it once per page, from one place. Two copies make two engines, and the showcase or your own scenes would register on the wrong one.

CDN (jsDelivr serves straight from the repo):

```
https://cdn.jsdelivr.net/gh/Bluenot3/alex-leschik@main/skills/zen-foil/dist/zen-foil.js            latest on main
https://cdn.jsdelivr.net/gh/Bluenot3/alex-leschik@<commit-sha>/skills/zen-foil/dist/zen-foil.js    pinned (production)
…/dist/zen-foil-showcase.js                                                                        the 20 portfolio plates
```

`@main` is cached for up to 12 hours. Pin a commit for anything that matters.

## Plain HTML / any site builder

```html
<script type="module" src="https://cdn.jsdelivr.net/gh/Bluenot3/alex-leschik@main/skills/zen-foil/dist/zen-foil.js"></script>

<style>
  .hero-plate { border-radius: 20px; max-width: 1100px; margin: 0 auto; }
</style>

<zen-foil class="hero-plate" scene="seal" headline="NORTHWIND" subline="EST. 1998" mark="/brand/mark.svg"
          accent="#86b7ff" aria-label="Northwind seal"></zen-foil>

<!-- page background -->
<zen-foil scene="field" fixed variant="dark" density="0.25"></zen-foil>
```

`templates/standalone.html` is a complete page you can copy.

Webflow, Framer, Squarespace and WordPress: put the `<script>` in the site-wide head or footer code and the tag in an Embed or HTML block. The embed needs a width. Its height comes from the scene's aspect ratio unless you set one.

## React (Vite, CRA, Remix)

Run `node <skill>/scripts/install.mjs .` in the project. It writes:
- `src/vendor/zen-foil/zen-foil.js`, with `.d.ts`, the license and the JSX typings;
- `src/components/ZenFoil.tsx`.

```tsx
import ZenFoil from "@/components/ZenFoil";

<ZenFoil scene="globe" accent="hsl(var(--primary))" className="w-full rounded-3xl"
         params={{ headline: "WORLDWIDE", origin: "-74.0, 40.71", points: "-0.13,51.51; 139.69,35.69" }}
         label="Offices in New York, London and Tokyo" />
```

- `params` become attributes, so React 18 and 19 behave the same. Changing a param updates the plate live, without recompiling the shader.
- `label` sets `aria-label` (the accessible name). Without it the plate is decorative.
- `onLive(backend)` fires after the first frame. `onFail(reason)` fires when there is no GPU or the scene fails; the CSS poster stays.
- Children render on top of the plate, positioned relative to it.
- Your own scenes: `import "./scenes/my-scene"` once, in `main.tsx` or the component file, before you render it.

Without the installer, import the vendored module once and use the raw element:

```tsx
import "./vendor/zen-foil/zen-foil.js";
export const Hero = () => <zen-foil scene="seal" headline="ACME" class="block w-full" />;
```

For TypeScript, add `templates/react/zen-foil-jsx.d.ts` to the project.

## Next.js (App Router)

The installer adds `"use client"` to the wrapper. Use it from any server component:

```tsx
// app/page.tsx (server component)
import ZenFoil from "@/components/ZenFoil";
export default function Page() {
  return <ZenFoil scene="seal" params={{ headline: "ACME" }} />;
}
```

The module is SSR-safe. The element renders as an empty block on the server, then upgrades on the client and fades in. To keep it out of the server bundle entirely, use `dynamic(() => import("@/components/ZenFoil"), { ssr: false })`.

## Vue 3 / Nuxt

```ts
// vite.config.ts
vue({ template: { compilerOptions: { isCustomElement: (tag) => tag === "zen-foil" } } })
// main.ts
import "./vendor/zen-foil/zen-foil.js";
```

```vue
<zen-foil scene="metric" :value="stats.total" label="MEMBERS" accent="#7ee0c2" />
```

In Nuxt, import it in a `.client.ts` plugin.

## Svelte / SvelteKit, Astro, Solid, Angular

- **Svelte:** use `<zen-foil scene="banner" headline={title} />` directly. Import the module in `onMount`, or in `+layout.svelte` behind `browser`.
- **Astro:** add `<script>import "../vendor/zen-foil/zen-foil.js";</script>` once in the layout, then use the tag in any `.astro` file.
- **Angular:** add `CUSTOM_ELEMENTS_SCHEMA` to the component, and import the module in `main.ts`.

## Lovable

Lovable projects are Vite + React + TypeScript. The Lovable agent cannot run the installer, so use the CDN:

1. **`index.html`:** add before `</head>` (pin a commit for production):
   ```html
   <script type="module" src="https://cdn.jsdelivr.net/gh/Bluenot3/alex-leschik@main/skills/zen-foil/dist/zen-foil.js"></script>
   ```
2. **`src/components/ZenFoil.tsx`:**
   ```tsx
   import { useEffect, useRef, type CSSProperties, type ReactNode } from "react";

   declare global {
     // eslint-disable-next-line @typescript-eslint/no-namespace
     namespace JSX { interface IntrinsicElements { "zen-foil": Record<string, unknown> } }
   }

   type Props = {
     scene: string; accent?: string; theme?: "plate" | "paper" | "clear"; label?: string; fixed?: boolean;
     params?: Record<string, string | number | boolean>; className?: string; style?: CSSProperties; children?: ReactNode;
   };

   export default function ZenFoil({ scene, accent, theme, label, fixed, params, className, style, children }: Props) {
     const attrs: Record<string, string> = {};
     for (const [k, v] of Object.entries(params ?? {})) if (v !== false) attrs[k] = v === true ? "" : String(v);
     return (
       <zen-foil scene={scene} accent={accent} theme={theme} aria-label={label} fixed={fixed ? "" : undefined}
                 className={className} style={style} {...attrs}>{children}</zen-foil>
     );
   }
   ```
3. **Use it:** `<ZenFoil scene="seal" params={{ headline: "BRAND" }} className="w-full rounded-2xl" />`.
4. **Your own scenes:** register them with the global API (`window.ZenFoil.defineScene({...})`) in a module that runs after the CDN script, for example inside a `useEffect` in `App.tsx`.

## claude.ai artifacts

The artifact CSP allows scripts only from a few CDNs (`cdn.jsdelivr.net/npm/`, not `/gh/`). Inline the bundle instead:

```html
<script type="module">/* paste the full contents of dist/zen-foil.js here */</script>
<script type="module">
  // window.ZenFoil is ready here (module scripts run in order)
</script>
<zen-foil scene="seal" headline="…"></zen-foil>
```

Images for `engrave`, `stage` and `vault` must be `data:` or `blob:` URLs inside an artifact. Separate `data:` URIs in a list with spaces or `|`, not commas.

## Images and CORS

The GPU can only read images that are same-origin or served with `Access-Control-Allow-Origin`. Supabase Storage, S3 with CORS, Cloudinary, Vercel/Netlify static files and your own `/public` folder all work. Hotlinked images without CORS fire `foil-error` with an explanation, and the plate keeps its placeholder.

## Sizing, layering and overlays

- **Width:** the element is `display: block` and fills its container's width.
- **Height:** set `height` (or `aspect-ratio`) in CSS to override the scene default (`--zen-foil-aspect`).
- **Radius:** `border-radius` on the element rounds the plate.
- **Overlay content:** put HTML inside the tag. It's slotted above the canvas, so you can position it absolutely within the element.
- **Backgrounds:** `fixed` makes the element a full-viewport layer at `z-index: -1` (`--zen-foil-z` overrides). Give it `variant="light"` or `"dark"` to match the page. Sections can raise the density behind them with `data-foil-density="0.5"`.
- **Posters:** before the first frame, and when there is no GPU, the element shows a CSS poster in the theme and accent. Set `--zen-foil-poster` to use your own image or gradient.

## Script API

```js
import { mount, defineScene, registerMark, setClock, getFoilEngine } from "./vendor/zen-foil/zen-foil.js";

const plate = mount(document.querySelector("#hero"), { scene: "seal", accent: "#7cc4ff", params: { headline: "ACME" } });
plate.update({ headline: "ACME LABS" });   // live, no recompile
plate.setAccent("oklch(0.75 0.12 250)");
await plate.capture();                      // ImageData of the next frame
plate.destroy();

registerMark("acme", { svg: "<svg viewBox='0 0 24 24'>…</svg>" });  // then mark="acme"
getFoilEngine().subscribeStatus((s) => console.log(s));                // pending | webgpu | webgl2 | static
```

### Sharing an animation clock

If the project already drives its animation from one `requestAnimationFrame` loop, hand it over so the plates tick in the same frame:

```ts
import { subscribeTick } from "@/hooks/useRafTicker";   // fn(now, dt) → unsubscribe
import { setClock } from "@/vendor/zen-foil/zen-foil.js";
setClock(subscribeTick);   // before the first plate mounts
```

alexleschik.com's AGENTS.md requires this for every decorative canvas: the plates then share `useRafTicker` with everything else on the page.

## Performance and accessibility

- **One device and one draw per visible plate per frame.** Off-screen plates cost nothing. Hidden tabs stop the loop.
- **Built-in limits:**
  - device pixel ratio is capped at 2 (1.5 on low-power devices);
  - resolution adapts to frame time;
  - frames run at 30 fps on phones and low-core machines.
- **Large backgrounds:** use `max-dpr="1.25"` on a `fixed` field.
- **Budget:** keep about 8 visible plates or fewer. For long grids, mount plates as they approach the viewport; the engine already skips off-screen ones.
- **Reduced motion:** renders a single still per plate, and redraws only on input.
- **Screen readers:** plates are `aria-hidden` unless you give them an `aria-label`. Keep the real headings and copy in the DOM.

## Debugging

| Flag | Effect |
|---|---|
| `?foil=webgpu` / `?foil=webgl2` / `?foil=off` | Force a backend (or posters only). |
| `?foil-debug` | Lint scenes as they register, warn about missing glyphs, and expose `window.__zenFoil` diagnostics. |
| `?foil-readback` | Copy each WebGPU frame through a 2D canvas, so headless browsers and screenshot tools can capture it. |
| `ZEN_FOIL_FREEZE = 6` | Pin every plate to scene time 6, for deterministic screenshots. |
| `await ZenFoil.validate()` | Compile every registered scene on both backends and return errors as `scene line N`. |
