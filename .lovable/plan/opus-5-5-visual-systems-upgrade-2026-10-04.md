# Opus 5.5 Visual Systems Upgrade

## Goal
Preserve every section, word, interaction, and route while giving the portfolio a more technically credible, original graphical language authored with Claude Opus 5.5.

## What will change

1. **Add “Forward Pass,” a shared computational graphics layer**
   - Introduce one fixed Canvas layer that treats the page like a live model inference map.
   - Render a quiet section spine, causal traces between related sections, a precision scanline for the active section, and truthful query weights connecting the pointer or viewport center to nearby headings.
   - Keep all graphics out of reading areas; desktop uses the full system, while mobile uses a reduced spine-and-scanline version.

2. **Make motion richer without making the site heavier**
   - Run the new layer through the existing shared animation clock rather than adding another independent loop.
   - Pause work when hidden, cap pixel density, throttle drawing, debounce canvas resizing, and fully honor reduced-motion settings.
   - Pause the most expensive offscreen 3D scenes so the enhanced graphics do not compromise scrolling or battery life.

3. **Refine depth and visual coherence**
   - Add restrained, semantic visual tokens for graphite, spectral cyan, and warm activation states.
   - Tighten existing glass and artifact surfaces so the computational layer reads as one intentional system rather than competing decoration.
   - Preserve the current white/slate liquid-glass identity, typography, content order, and all existing portfolio features.

4. **Add Claude Opus 5.5 to the model ledger**
   - Add a new featured entry dated `2026.10.04`.
   - Its unique “Causal Monogram” signature will animate as a ring of letter nodes, deterministic attention chords, a traveling inference pulse, and a final OPUS 5.5 seal.
   - The mark will be visually distinct from every existing signature and remain deterministic, accessible, and performant.

## Technical details
- New focused Canvas component for the Forward Pass layer, using the existing `useRafTicker` and semantic CSS variables.
- Small additions to the shared stylesheet and the existing signature ledger component.
- Offscreen frame-loop gating for the existing React Three Fiber scenes where safe, without changing their public behavior.
- Record the shared-canvas architectural rule in `AGENTS.md`.

## Verification
- Check desktop and mobile at the hero, work sections, Turing invitation, and signature ledger.
- Verify every section and interaction remains present, no graphics cross text, reduced motion settles correctly, and no console/runtime/build errors remain.
