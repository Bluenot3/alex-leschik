# Architecture Rules

- All decorative full-page Canvas animation must subscribe to the shared `useRafTicker` clock and include DPR, visibility, resize, mobile-density, and reduced-motion safeguards, because the portfolio already runs several concurrent 2D and 3D visual systems.
- Owner permissions must use the protected `public.user_roles` table and server-side `is_admin()` check; only service-role operations may assign roles, because a browser gate is not authorization.
- Public visitors may read portfolio media and submit lead/subscriber backups, but cannot read private intake data or edit portfolio content; completed game records are written only through the scoring function.