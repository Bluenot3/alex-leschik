/**
 * JSX typing for <zen-foil> in React + TypeScript projects. Keep this file
 * anywhere your tsconfig includes (scripts/install.mjs puts it next to the
 * vendored bundle).
 */
import type { CSSProperties, DetailedHTMLProps, HTMLAttributes, Ref } from "react";

type ZenFoilAttributes = Omit<DetailedHTMLProps<HTMLAttributes<HTMLElement>, HTMLElement>, "ref" | "style"> & {
  ref?: Ref<HTMLElement & { capture(): Promise<ImageData | null>; update(p: Record<string, string>): void }>;
  scene: string;
  accent?: string;
  theme?: "plate" | "paper" | "clear";
  fixed?: string | boolean;
  seed?: string | number;
  "max-dpr"?: string | number;
  style?: CSSProperties;
  /** Scene params as attributes: headline, subline, mark, points, images… */
  [param: string]: unknown;
};

declare module "react" {
  namespace JSX {
    interface IntrinsicElements {
      "zen-foil": ZenFoilAttributes;
    }
  }
}

declare global {
  namespace JSX {
    interface IntrinsicElements {
      "zen-foil": ZenFoilAttributes;
    }
  }
}
