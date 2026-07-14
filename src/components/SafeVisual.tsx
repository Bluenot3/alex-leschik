import { Component, ReactNode } from "react";

/**
 * Error boundary for decorative visuals (3D scenes, generative art).
 * If a scene throws — e.g. its environment texture CDN is unreachable —
 * the artifact degrades to a quiet placeholder instead of unmounting
 * the entire page tree.
 */
export default class SafeVisual extends Component<
  { children: ReactNode; label?: string },
  { failed: boolean }
> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error: unknown) {
    if (import.meta.env.DEV) console.warn("[SafeVisual] artifact failed:", error);
  }

  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <div className="safe-visual-fallback" role="presentation">
        <span className="safe-visual-fallback__glyph">◈</span>
        <span className="safe-visual-fallback__text">
          {this.props.label ?? "artifact offline"}
        </span>
      </div>
    );
  }
}
