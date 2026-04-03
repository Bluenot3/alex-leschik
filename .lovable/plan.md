## Plan: Redesign Project Showcase + Add Edit Mode + Performance Fixes

### Problem Summary

1. All 17 projects are bunched together in a dense grid at the bottom — overwhelming and underwhelming at the same time
2. No way to edit project info (title, description, URL, etc.)
3. CubeRain visual is underwhelming — only shows 2 cubes instead of the intended 48-cube explosion
4. Site feels glitchy/slow due to 17 iframes loading simultaneously
5. Not mobile-optimized

### Architecture

**Split projects into 3 tiers across the page instead of one dump at the end:**

```text
S1: Projects intro
  ↓
[FEATURED SHOWCASE] — 4 hero projects, large cards, staggered left/right
  ↓
S2: Vision / S3: Craft (existing)
  ↓
CubeRain + GlassCube + AZ1Logo + Amphitheatre (existing 3D sections)
  ↓
[FULL PROJECT GRID] — remaining 13 projects, compact 2-col layout
  ↓
S5: Connect
```

### Changes

**1. New `FeaturedProjects` component** (src/components/FeaturedProjects.tsx)

- 4 hand-picked hero projects (ParkPulse, SparkLab AI, CuratePro, STEMScore) displayed as large, cinematic cards
- Each card: full-width alternating left/right layout with iframe preview on one side, metadata on the other
- Scroll-triggered slide-in from left/right with staggered timing using IntersectionObserver
- Iframes only mount when within 300px of viewport, unmount when leaving
- On hover: iframe becomes interactive (pointer-events: auto), glass border glow
- Aspect ratio 16:9 desktop, stacked on mobile

**2. Redesign `ScrollProjectReel` for remaining 13 projects**

- Remove the 4 featured projects from this grid
- Switch to 2-column masonry-style layout (not 3-col — less cramped)
- Smaller, more compact cards with tighter spacing
- Keep scramble-text title animation
- Only mount iframe when within 200px viewport; **unmount when 500px away** to free memory
- Add staggered animation delay based on index (0.1s per card)

**3. Add inline edit mode for project data**

- Add an `editable` boolean field to each project card
- When HUD edit mode is active, show a small pencil icon on each project card
- Clicking pencil opens a glass-morphism modal/drawer with fields: title, description, tag, URL, stats
- Changes stored in React state (localStorage persistence) so user can preview edits
- Add a "Reset to defaults" button
- This is a temporary content-editing tool — will be removed before publish

**4. Fix CubeRain — restore the micro ice cube explosion**

- Current issue: the 48 cubes exist but their visibility logic (`p < 0.001`) may never trigger because `progress` from Index.tsx uses `(smoothProgress - 0.55) / 0.15` which depends on scroll position relative to page height
- The page is very long now (17 project cards added height), so the progress range `0.55–0.70` may not align with where CubeRain is in the DOM
- Fix: Change CubeRain to use its own IntersectionObserver-based progress instead of relying on global smoothProgress
- This ensures cubes appear regardless of total page height
- Reduce CUBE_COUNT to 34 on mobile (detect via window.innerWidth) for performance

**5. Performance optimizations**

- Cap simultaneous mounted iframes to max 4 at any time (queue system)
- Add `will-change: transform` only when card is animating, remove after
- Reduce CubeRain DPR to `[1, 1.25]` on mobile
- Add `content-visibility: auto` to project sections for paint optimization
- Debounce IntersectionObserver callbacks

**6. Mobile optimization**

- Featured projects: stack vertically, iframe on top, meta below
- Project grid: single column on mobile with larger touch targets
- CubeRain: 20 cubes max on mobile
- Increase tap target sizes on project links (min 44px)
- Reduce iframe aspect ratio to 4:3 on mobile for better viewport usage

### Files Modified

- `src/components/FeaturedProjects.tsx` — NEW: 4 hero project cards with large cinematic layout
- `src/components/ScrollProjectReel.tsx` — Slim down to 13 projects, add edit mode, iframe lifecycle management
- `src/components/CubeRain.tsx` — Self-contained IntersectionObserver for progress, mobile cube count
- `src/pages/Index.tsx` — Insert FeaturedProjects after S1, reorder sections
- `src/index.css` — Featured card styles, compact grid refinements, mobile breakpoints

### What stays untouched

- CubeScene, GlassCube, AZ1Logo3D, Amphitheatre, ImageVortex — all preserved
- HUD system, scroll engine, command dashboard — unchanged
- All animations, glass-morphism design language — maintained
- Font stack, color tokens — preserved