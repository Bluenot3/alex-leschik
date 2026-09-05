import { useEffect } from "react";
import { useThree } from "@react-three/fiber";

/** Keep each existing scene mounted, but park its GPU loop outside the viewport. */
export default function RenderWhenVisible() {
  const gl = useThree((state) => state.gl);
  const setFrameloop = useThree((state) => state.setFrameloop);
  const invalidate = useThree((state) => state.invalidate);
  useEffect(() => {
    let inView = false;
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => {
      setFrameloop(inView && !document.hidden && !media.matches ? "always" : "demand");
      if (inView && !document.hidden) invalidate();
    };
    const io = new IntersectionObserver(([entry]) => { inView = entry.isIntersecting; sync(); });
    io.observe(gl.domElement);
    media.addEventListener("change", sync);
    document.addEventListener("visibilitychange", sync);
    sync();
    return () => {
      io.disconnect();
      media.removeEventListener("change", sync);
      document.removeEventListener("visibilitychange", sync);
    };
  }, [gl, invalidate, setFrameloop]);
  return null;
}
