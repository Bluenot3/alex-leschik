import { Suspense, type ReactNode } from "react";
import SafeVisual from "@/components/SafeVisual";
import { useInView } from "@/hooks/useInView";

interface ArtifactProps {
  children: ReactNode;
  /** Reserved height so nothing shifts while the chunk streams in. */
  minHeight: number | string;
  /** How far ahead of the viewport the chunk should start loading. */
  lead?: "near" | "far" | "eager";
  /** Human label shown if the artifact fails to render. */
  label?: string;
  className?: string;
  /** Skip the error boundary for plain (non-3D) content. */
  guard?: boolean;
}

const LEAD_MARGIN: Record<NonNullable<ArtifactProps["lead"]>, string> = {
  near: "600px 0px",
  far: "1400px 0px",
  eager: "2400px 0px",
};

/**
 * One wrapper for every heavy section: viewport-gated mount, suspense
 * boundary, error boundary and a reserved-height skeleton — so each artifact
 * occupies its final space from first paint and fades up once ready.
 */
export default function Artifact({
  children,
  minHeight,
  lead = "far",
  label,
  className = "",
  guard = true,
}: ArtifactProps) {
  const { ref, inView } = useInView<HTMLDivElement>({
    rootMargin: LEAD_MARGIN[lead],
    once: true,
  });

  const reserved = typeof minHeight === "number" ? `${minHeight}px` : minHeight;

  const body = (
    <Suspense fallback={<div className="artifact__skeleton" style={{ minHeight: reserved }} />}>
      {children}
    </Suspense>
  );

  return (
    <div
      ref={ref}
      className={`artifact ${inView ? "artifact--ready" : ""} ${className}`}
      style={{ minHeight: reserved }}
    >
      {inView ? (
        guard ? <SafeVisual label={label}>{body}</SafeVisual> : body
      ) : (
        <div className="artifact__skeleton" style={{ minHeight: reserved }} />
      )}
    </div>
  );
}
