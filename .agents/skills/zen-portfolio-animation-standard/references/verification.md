# Verification and quality gate

## Visual baseline

Inspect the actual target in a browser, not just the source or a successful compile. Capture the first readable state, settled animation, pointer response, and a relevant scrolled state. If the source portfolio is unavailable, use the bundled reference engine in a temporary target-only harness; do not modify the source site just to demonstrate the skill.

Check that engraved hairlines remain crisp and subpixel patterns do not shimmer; foil reflects movement rather than washing out geometry; the main subject is legible immediately; the static poster is comparable in quality to the live state. Verify the new effect is actually perceptible—not merely a tiny rail or invisible background.

## Required checks

1. Verify desktop and narrow/coarse-pointer target sizes with screenshots. Check overflow, overlapping labels, canvas framing, click targets, keyboard focus, and clear reading areas. Use stable dimensions so startup, labels, and hover do not change layout.
2. Scroll from top to bottom and back after initialization. Confirm no document navigation, scroll reset, remount/reveal loops, dropped content, or visible section jumps.
3. Test reduced motion and a hidden/restored tab. Verify a readable still, no fly-in/continuous shimmer, and no background simulation. React to changes in motion preference in the target adapter when practical.
4. Test `?foil=webgl2` and `?foil=off`, plus WebGPU when supported. These are debug overrides, not guarantees of device support. Confirm readable posters/plain images, intact controls, and recoverable initialization errors on every path.
5. Test image failure/stale loads for image scenes and resource cleanup on unmount. No blank application when a decorative visual fails.
6. Inspect target build/runtime errors and relevant network failures. Do not claim stability just because compilation succeeds or because a different route was tested.
7. Measure sustained frames/long tasks and graphics workload on the target. Record viewport, DPR, renderer, visible views, and test duration. Quality should adapt (source range 0.55–1); stop offscreen work and cap DPR before sacrificing content. Do not assert a universal FPS guarantee.

## Compare quality before accepting

Compare baseline and final screenshots for composition, fidelity, readability, coherent motion, and integration. Require a perceptible improvement in at least one art-direction dimension with no regression in the other dimensions. If the effect is beautiful only when enlarged or isolated but fails in the real page, simplify it and re-test.

## Skill extraction checks

For a skill-only request, verify the snapshot manifest, local import closure, scene count, referenced documents, absence of credentials/private data, and no modifications to application files. Activate the completed skill only after those checks. Report that the skill is active only after successful activation; do not claim it guarantees masterpiece-quality output on every invocation.