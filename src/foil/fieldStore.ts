/**
 * Shared state for the Treasury field: section density regions registered by
 * CrypticBackground markers, and whether the GPU field is live.
 */

/* ── Section density regions (registered by CrypticBackground markers) ── */

interface FieldRegion {
  el: HTMLElement;
  alpha: number;
  rate: number;
}

export const fieldRegions = new Set<FieldRegion>();

export function registerFieldRegion(region: FieldRegion) {
  fieldRegions.add(region);
  return () => {
    fieldRegions.delete(region);
  };
}

/* ── Field lifecycle: "pending" until the first frame, "off" if no GPU ── */

export type FieldState = "pending" | "live" | "off";
let fieldState: FieldState = "pending";
const listeners = new Set<(s: FieldState) => void>();

export function getFieldState() {
  return fieldState;
}

export function setFieldState(s: FieldState) {
  if (fieldState === s) return;
  fieldState = s;
  listeners.forEach((cb) => cb(s));
}

export function subscribeFieldState(cb: (s: FieldState) => void) {
  listeners.add(cb);
  cb(fieldState);
  return () => {
    listeners.delete(cb);
  };
}
