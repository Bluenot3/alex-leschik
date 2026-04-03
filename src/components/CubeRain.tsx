import { useRef, useEffect, useMemo, useState } from "react";
import { Canvas, useFrame, useLoader } from "@react-three/fiber";
import { Environment, RoundedBox, MeshTransmissionMaterial } from "@react-three/drei";
import * as THREE from "three";
import zzLogo from "@/assets/zz-logo.png";

function getCount() {
  if (typeof window === "undefined") return 40;
  return window.innerWidth < 768 ? 24 : 56;
}

interface CubeData {
  dir: THREE.Vector3;
  rotAxis: THREE.Vector3;
  rotSpeed: number;
  scale: number;
  delay: number;
  wobblePhase: number;
}

function BlastCube({
  data,
  progressRef,
  texture,
}: {
  data: CubeData;
  progressRef: React.RefObject<number>;
  texture: THREE.Texture;
}) {
  const groupRef = useRef<THREE.Group>(null!);
  const smoothP = useRef(0);

  useFrame((state, delta) => {
    if (!groupRef.current) return;

    const raw = Math.max(0, (progressRef.current ?? 0) - data.delay);
    smoothP.current = THREE.MathUtils.damp(smoothP.current, raw, 3, delta);
    const p = Math.min(smoothP.current, 1);

    if (p < 0.001) {
      groupRef.current.visible = false;
      return;
    }
    groupRef.current.visible = true;

    // Quartic ease-out
    const ease = 1 - Math.pow(1 - p, 4);
    const elapsed = state.clock.elapsedTime;

    // Organic idle wobble
    const idleX = Math.sin(elapsed * 0.18 + data.wobblePhase) * 0.12 * ease;
    const idleY = Math.cos(elapsed * 0.14 + data.wobblePhase * 1.3) * 0.1 * ease;
    const idleZ = Math.sin(elapsed * 0.11 + data.wobblePhase * 0.7) * 0.08 * ease;

    groupRef.current.position.set(
      data.dir.x * ease + idleX,
      data.dir.y * ease + idleY,
      data.dir.z * ease + idleZ
    );

    // Slow spin decay
    const spinFactor = Math.max(0.02, 1 - ease * 0.95);
    groupRef.current.rotation.x += delta * data.rotSpeed * spinFactor * data.rotAxis.x * 0.4;
    groupRef.current.rotation.y += delta * data.rotSpeed * spinFactor * data.rotAxis.y * 0.4;
    groupRef.current.rotation.z += delta * data.rotSpeed * spinFactor * data.rotAxis.z * 0.2;

    // Scale with overshoot
    const rawScale = Math.min(1.04, ease * 1.08);
    groupRef.current.scale.setScalar(data.scale * rawScale);
  });

  return (
    <group ref={groupRef} visible={false}>
      {/* Logo plane inside the cube */}
      <mesh renderOrder={0}>
        <planeGeometry args={[0.32, 0.32]} />
        <meshStandardMaterial
          map={texture}
          side={THREE.DoubleSide}
          roughness={0.1}
          transparent
          alphaTest={0.01}
        />
      </mesh>
      {/* Glass cube shell */}
      <RoundedBox args={[0.45, 0.45, 0.2]} radius={0.05} smoothness={8} renderOrder={1}>
        <MeshTransmissionMaterial
          transmission={0.95}
          roughness={0.02}
          thickness={0.4}
          ior={1.5}
          chromaticAberration={0.04}
          clearcoat={1}
          clearcoatRoughness={0}
          envMapIntensity={1.5}
          transparent
          opacity={0.85}
          side={THREE.DoubleSide}
          depthWrite={false}
        />
      </RoundedBox>
    </group>
  );
}

function Scene({ progressRef }: { progressRef: React.RefObject<number> }) {
  const texture = useLoader(THREE.TextureLoader, zzLogo);
  const [count] = useState(getCount);

  const cubes = useMemo<CubeData[]>(() => {
    const arr: CubeData[] = [];
    for (let i = 0; i < count; i++) {
      const phi = Math.acos(2 * Math.random() - 1);
      const theta = Math.random() * Math.PI * 2;
      const radius = 1.5 + Math.random() * 6;

      const rawX = Math.sin(phi) * Math.cos(theta) * radius;
      const rawY = Math.abs(Math.sin(phi) * Math.sin(theta)) * radius * 1.2 + radius * 0.2;
      const rawZ = Math.cos(phi) * radius * 0.5 + Math.random() * 3;

      arr.push({
        dir: new THREE.Vector3(rawX, rawY, rawZ),
        rotAxis: new THREE.Vector3(
          Math.random() - 0.5,
          Math.random() - 0.5,
          Math.random() - 0.5
        ).normalize(),
        rotSpeed: 0.6 + Math.random() * 2,
        scale: 0.25 + Math.random() * 0.6,
        delay: Math.random() * 0.35,
        wobblePhase: Math.random() * Math.PI * 2,
      });
    }
    return arr;
  }, [count]);

  useEffect(() => {
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.needsUpdate = true;
  }, [texture]);

  return (
    <>
      <ambientLight intensity={1.4} />
      <directionalLight position={[-4, 10, -4]} intensity={2} />
      <directionalLight position={[3, 6, 5]} intensity={1.2} />
      <pointLight position={[0, 2, 6]} intensity={0.8} color="#88ccff" />
      <Environment preset="city" />
      {cubes.map((c, i) => (
        <BlastCube key={i} data={c} progressRef={progressRef} texture={texture} />
      ))}
    </>
  );
}

export default function CubeRain() {
  const wrapRef = useRef<HTMLDivElement>(null);
  const progressRef = useRef(0);
  const [localProgress, setLocalProgress] = useState(0);
  const isMobile = typeof window !== "undefined" && window.innerWidth < 768;

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;

    const handleScroll = () => {
      const rect = el.getBoundingClientRect();
      const vh = window.innerHeight;
      const total = rect.height + vh;
      const scrolled = vh - rect.top;
      const p = Math.max(0, Math.min(1, scrolled / total));
      setLocalProgress(p);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  progressRef.current = localProgress;

  if (localProgress <= 0) return <div ref={wrapRef} className="cube-rain-wrap" />;

  return (
    <div ref={wrapRef} className="cube-rain-wrap" style={{ opacity: Math.min(1, localProgress * 3) }}>
      <Canvas
        camera={{ position: [0, -1, 10], fov: 48 }}
        gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
        style={{ background: "transparent" }}
        dpr={isMobile ? [1, 1.25] : [1, 1.5]}
      >
        <Scene progressRef={progressRef} />
      </Canvas>
    </div>
  );
}
