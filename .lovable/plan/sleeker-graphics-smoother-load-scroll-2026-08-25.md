# Sleeker Graphics, Smoother Load & Scroll

Goal: the site feels more expensive and glides — nothing removed, but several duplicated layers get consolidated into shared, cheaper systems.

## What changes for a visitor

- Scrolling feels continuous instead of stepping: reveals and section motion share one timing language, with a single global smooth-scroll behavior.
- Graphics read sharper: refined glass depth, cleaner light falloff on the artifact panels, tighter grain/dither, and a subtle unified vignette so heavy sections stop competing with copy.
- Nothing pops in late: heavy 3D/canvas artifacts fade in on a soft blur-up instead of appearing abruptly, and only the ones near the viewport actually animate.
- No stutter while scrolling on mid-range laptops and phones.

## Consolidation (nothing removed)

1. **One background engine.** The page currently mounts 25 separate cryptic background/divider instances, each with its own canvas or interval. Replace the per-section instances with a single shared canvas driven by one animation loop, and have each section declare its density/opacity through props on a lightweight wrapper. Same visual texture in every place it appears today, one loop instead of many.
2. **One motion clock.** `CrypticDivider`'s interval, `LiveMetricsTicker`'s loop, and `CipherSmokeCursor`'s loop subscribe to a single shared rAF ticker that pauses when the tab is hidden or when the element is offscreen.
3. **One reveal system.** The inline per-element transition styles in `ScrollSection` move to design-system classes with a shared easing/stagger scale, so all reveals match and the browser can composite them.
4. **One lazy wrapper.** `LazySection` + `Suspense` + `SafeVisual` collapse into a single `Artifact` wrapper with consistent prefetch margins and a shared skeleton, replacing the hand-tuned `rootMargin`/`minHeight` values scattered per section (which currently cause layout shifts of different sizes).

## Performance work

- Reserve exact height for every lazy block so no section jumps as chunks arrive (kills the scroll glitches).
- Pause all canvas/3D render loops when their section is offscreen; cap devicePixelRatio on the three.js scenes and lower it further on mobile.
- Keep the existing idle chunk prefetch but order it by scroll position and stop prefetching heavy three.js chunks on low-memory/mobile devices until closer to view.
- Promote animated layers with `transform`/`opacity` only, add `contain: paint` to section wrappers, and remove backdrop-blur stacking where two blurred layers overlap (double blur is the main scroll cost).
- Honor `prefers-reduced-motion` across the consolidated systems.

## Technical notes

- New: `src/hooks/useRafTicker.ts` (shared clock + visibility gating), `src/hooks/useInView.ts`, `src/components/Artifact.tsx` (lazy + suspense + error boundary + skeleton), `src/components/CrypticField.tsx` (single shared canvas + context provider).
- Edited: `src/pages/Index.tsx` (swap wrappers, reserved heights), `ScrollSection.tsx` (class-based reveals), `CrypticBackground.tsx` / `CrypticDivider.tsx` (consume shared field/ticker, keep their current look), `CipherSmokeCursor.tsx`, `LiveMetricsTicker.tsx`, `CubeRain.tsx` / `GlassOrbit.tsx` / `GlassCube.tsx` / `AZ1Logo3D.tsx` (frameloop gating, dpr caps), `src/index.css` + `src/enhance.css` (reveal/skeleton/glass tokens).
- No copy, section, or feature is deleted; existing components keep their public props so behavior stays identical.

## Verification

- Playwright pass at desktop and mobile viewports: screenshot the hero, constellation, spotlight, artifact lab, and footer; confirm no console errors and no missing artifacts.
- Scroll-through check for layout shift and dropped frames before/after.
