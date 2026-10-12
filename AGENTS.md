# Architecture Rules

- All decorative full-page and hero Canvas animation must subscribe to the shared `useRafTicker` clock and include DPR, visibility, resize, mobile-density, and reduced-motion safeguards, because the portfolio already runs several concurrent 2D and 3D visual systems.
- Owner permissions must use the protected `public.user_roles` table and server-side `is_admin()` check; only service-role operations may assign roles, because a browser gate is not authorization.
- Public visitors may read portfolio media and submit lead/subscriber backups, but cannot read private intake data or edit portfolio content; completed game records are written only through the scoring function.

# Reusable Graphics

- `skills/zen-foil/` packages the foil engine for other projects: the `<zen-foil>` element (WebGPU with WebGL2 fallback), an 11-scene kit, the 20 portfolio plates, and tools to write, check and preview new scenes. Read its `SKILL.md` before reusing or extending the style anywhere else.
- It is a portable fork of `src/foil/`, and the site does not import it. Port engine fixes between the two deliberately. Rebuild `skills/zen-foil/dist/` with `node skills/zen-foil/scripts/build.mjs` after changing its `src/`, and commit the result (the CDN serves `dist/` straight from the repo).

