import { Environment, Lightformer } from "@react-three/drei";

/**
 * Procedural studio lighting for the glass artifacts. Replaces drei's
 * `preset="city"`, which downloads an HDR from a third-party CDN at runtime —
 * when that request was slow or blocked the scenes fell back to "offline".
 * Lightformers render once into the environment map: no network, no per-frame cost.
 */
export default function StudioEnvironment() {
  return (
    <Environment resolution={256} frames={1}>
      <color attach="background" args={["#eef3f9"]} />
      <Lightformer form="rect" intensity={2.4} position={[0, 6, -4]} rotation-x={Math.PI / 2} scale={[12, 4, 1]} />
      <Lightformer form="rect" intensity={1.4} color="#d9ecff" position={[-7, 1.5, 0]} rotation-y={Math.PI / 2} scale={[10, 3, 1]} />
      <Lightformer form="rect" intensity={1.2} color="#ffe6f3" position={[7, 0.5, 1]} rotation-y={-Math.PI / 2} scale={[10, 2.5, 1]} />
      <Lightformer form="ring" intensity={3} color="#9fd4ff" position={[3, 3, 7]} scale={3.5} />
      <Lightformer form="circle" intensity={2} color="#fff1d6" position={[-4, -2, 6]} scale={2} />
      <Lightformer form="rect" intensity={0.6} color="#c4b5fd" position={[0, -5, 0]} rotation-x={-Math.PI / 2} scale={[14, 6, 1]} />
    </Environment>
  );
}
