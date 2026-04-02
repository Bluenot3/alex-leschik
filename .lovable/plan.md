

# Scroll-Reveal Project Previews

## Concept
Replace the current single-placeholder ProjectShowcase with a **scroll-triggered sidebar preview system** — as the user scrolls, project preview cards slide in from alternating sides (left/right), each containing a live iframe embed of the GitHub Pages deployment. Only one project is prominently visible at a time, creating a cinematic reveal effect.

## GitHub Pages URLs
Most of these repos are deployed via GitHub Pages. The embed URLs will be:

| Project | Embed URL |
|---------|-----------|
| ROAM | `https://bluenot3.github.io/ROAM/` |
| AI-Literacy-Constitution | `https://bluenot3.github.io/AI-Literacy-Constitution/` |
| AGENT-ARENA-TEMPLATE | `https://bluenot3.github.io/AGENT-ARENA-TEMPLATE/` |
| popuppastries | `https://bluenot3.github.io/popuppastries/` |
| globe.gl | `https://bluenot3.github.io/globe.gl/` |
| homeschool-kit | `https://bluenot3.github.io/homeschool-kit/` |
| vibe-book-pm | `https://bluenot3.github.io/vibe-book-pm/` |
| V3 | `https://bluenot3.github.io/V3/` |
| Fus3 | `https://bluenot3.github.io/Fus3/` |
| brooks-showcase-studio | `https://bluenot3.github.io/brooks-showcase-studio/` |

(If any don't load, they'll show a fallback card with a link to the repo.)

## Implementation

### 1. New component: `ScrollProjectReel.tsx`
- Array of 10 projects with title, description, GitHub URL, and Pages embed URL
- Each project rendered as a full-viewport-height section with a glass-morphism card containing an iframe
- Cards alternate left/right alignment using `IntersectionObserver`
- When a card enters the viewport: slides in from its side with opacity + translateX animation
- When it leaves: fades out
- Each card has an "Open" external link button to the GitHub repo
- Iframes use `loading="lazy"` and only mount when within ~1 screen of viewport (performance guard)

### 2. Update `Index.tsx`
- Replace the existing `<ProjectShowcase />` section with the new `<ScrollProjectReel />`
- Pass `smoothProgress` so cards can optionally react to scroll position

### 3. Styling in `index.css`
- Replace `.project-showcase` / `.project-grid` styles with new `.scroll-reel` styles
- Each card: fixed width (~400px desktop, full-width mobile), glass background, rounded corners
- Alternating cards positioned `left: 3vw` and `right: 3vw` via odd/even
- CSS transitions for slide-in (`transform`, `opacity`) triggered by a `.visible` class

### 4. Performance safeguards
- Iframes only render when the card is near the viewport (lazy mounting via IntersectionObserver)
- No more than 2 iframes active at once — unmount iframes that scroll far out of view
- `sandbox="allow-scripts allow-same-origin"` on all iframes

