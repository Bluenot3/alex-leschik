# Architecture Rules

- All decorative full-page Canvas animation must subscribe to the shared `useRafTicker` clock and include DPR, visibility, resize, mobile-density, and reduced-motion safeguards, because the portfolio already runs several concurrent 2D and 3D visual systems.