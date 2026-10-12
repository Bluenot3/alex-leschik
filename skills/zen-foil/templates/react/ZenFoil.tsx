"use client";
/**
 * <ZenFoil> — React wrapper for the <zen-foil> element (React 18 and 19,
 * Vite, Next.js App Router, Remix…). Installed by scripts/install.mjs, which
 * points the import below at your vendored bundle.
 *
 *   <ZenFoil scene="seal" accent="#7cc4ff" params={{ headline: "ACME LABS" }} className="rounded-2xl" />
 *   <ZenFoil scene="field" fixed params={{ variant: "dark" }} />
 *   <ZenFoil scene="globe" label="Our reach: 14 cities" params={{ label: "D.C." }} style={{ height: 480 }}>
 *     <h2 className="relative">Children render on top of the plate</h2>
 *   </ZenFoil>
 */
import { useEffect, useRef, type CSSProperties, type ReactNode } from "react";
import "ZEN_FOIL_IMPORT"; // registers <zen-foil> and the kit (safe during SSR)
import type { ZenFoilElement } from "ZEN_FOIL_IMPORT";

export interface ZenFoilProps {
  /** Scene id: seal, globe, usmap, banner, certificate, metric, network, engrave, stage, vault, field — or your own. */
  scene: string;
  /** Any CSS colour: hex, rgb(), hsl(var(--primary)), oklch()… */
  accent?: string;
  /** "plate" (dark, default), "paper" (light) or "clear" (ink over the page). */
  theme?: "plate" | "paper" | "clear";
  /** Accessible name (sets aria-label). Without it the plate is decorative. */
  label?: string;
  /** Full-viewport background layer (for the field scene). */
  fixed?: boolean;
  seed?: number;
  /** Device-pixel-ratio ceiling for this plate. */
  maxDpr?: number;
  /** Scene params, e.g. { headline: "ACME", mark: "/logo.svg", points: "-74,40.7; 2.35,48.86" }. */
  params?: Record<string, string | number | boolean>;
  className?: string;
  style?: CSSProperties;
  children?: ReactNode;
  /** First frame presented. */
  onLive?: (backend: string) => void;
  /** No GPU, or the scene failed: the CSS poster stays. */
  onFail?: (reason: string) => void;
}

export default function ZenFoil({ scene, accent, theme, label, fixed, seed, maxDpr, params, className, style, children, onLive, onFail }: ZenFoilProps) {
  const ref = useRef<ZenFoilElement>(null);
  const cb = useRef({ onLive, onFail });
  cb.current = { onLive, onFail };

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const live = (e: Event) => cb.current.onLive?.((e as CustomEvent<{ backend: string }>).detail?.backend ?? "");
    const fail = (e: Event) => cb.current.onFail?.((e as CustomEvent<{ reason: string }>).detail?.reason ?? "");
    el.addEventListener("foil-live", live);
    el.addEventListener("foil-fail", fail);
    return () => {
      el.removeEventListener("foil-live", live);
      el.removeEventListener("foil-fail", fail);
    };
  }, []);

  // Params travel as attributes, so React 18 and 19 behave the same.
  const attrs: Record<string, string> = {};
  for (const [k, v] of Object.entries(params ?? {})) {
    if (v === false) continue;
    attrs[k] = v === true ? "" : String(v);
  }

  return (
    <zen-foil
      ref={ref}
      scene={scene}
      accent={accent}
      theme={theme}
      aria-label={label}
      fixed={fixed ? "" : undefined}
      seed={seed !== undefined ? String(seed) : undefined}
      max-dpr={maxDpr !== undefined ? String(maxDpr) : undefined}
      className={className}
      style={style}
      {...attrs}
    >
      {children}
    </zen-foil>
  );
}
