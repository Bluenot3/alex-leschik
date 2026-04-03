import { useRef, useEffect, useMemo, useState } from "react";
import { Canvas, useFrame, useLoader } from "@react-three/fiber";
import { Environment, RoundedBox } from "@react-three/drei";
import * as THREE from "three";
import zzLogo from "@/assets/zz-logo.png";

function getCount() {
  if (typeof window === "undefined") return 34;
  return window.innerWidth < 768 ? 20 : 48;
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
  const meshRef = useRef<THREE.Mesh>(null!);
  const planeRef = useRef<THREE.Mesh>(null!);
  const smoothP = useRef(0);

  useFrame((state, delta) => {
    if (!meshRef.current) return;

    const raw = Math.max(0, (progressRef.current ?? 0) - data.delay);
    smoothP.current = THREE.MathUtils.damp(smoothP.current, raw, 3.5, delta);
    const p = Math.min(smoothP.current, 1);

    if (p < 0.001) {
      meshRef.current.visible = false;
      if (planeRef.current) planeRef.current.visible = false;
      return;
    }
    meshRef.current.visible = true;
    if (planeRef.current) planeRef.current.visible = true;

    // Quartic ease-out for ultra slow-mo explosion
    const ease = 1 - Math.pow(1 - p, 4);
    const elapsed = state.clock.elapsedTime;

    // Organic idle wobble
    const idleX = Math.sin(elapsed * 0.22 + data.wobblePhase) * 0.15 * ease;
    const idleY = Math.cos(elapsed * 0.18 + data.wobblePhase * 1.3) * 0.12 * ease;
    const idleZ = Math.sin(elapsed * 0.15 + data.wobblePhase * 0.7) * 0.1 * ease;

    const x = data.dir.x * ease + idleX;
    const y = data.dir.y * ease + idleY;
    const z = data.dir.z * ease + idleZ;

    meshRef.current.position.set(x, y, z);
    if (planeRef.current) planeRef.current.position.set(x, y, z);

    // Slow spin decay
    const spinFactor = Math.max(0.015, 1 - ease * 0.96);
    meshRef.current.rotation.x += delta * data.rotSpeed * spinFactor * data.rotAxis.x * 0.5;
    meshRef.current.rotation.y += delta * data.rotSpeed * spinFactor * data.rotAxis.y * 0.5;
    meshRef.current.rotation.z += delta * data.rotSpeed * spinFactor * data.rotAxis.z * 0.25;
    if (planeRef.current) planeRef.current.rotation.copy(meshRef.current.rotation);

    // Scale with overshoot
    const rawScale = Math.min(1.06, ease * 1.12);
    meshRef.current.scale.setScalar(data.scale * rawScale);
    if (planeRef.current) planeRef.current.scale.setScalar(data.scale * rawScale);

    // Opacity
    const mat = meshRef.current.material as THREE.MeshPhysicalMaterial;
    mat.opacity = 0.45 + ease * 0.45;
  });

  return (
    <>
      <mesh ref={planeRef} visible={false} renderOrder={0}>
        <planeGeometry args={[0.38, 0.38]} />
        <meshStandardMaterial
          map={texture}
          side={THREE.DoubleSide}
          roughness={0.12}
          transparent
          alphaTest={0.01}
        />
      </mesh>
      <mesh ref={meshRef} visible={false} renderOrder={1}>
        <RoundedBox args={[0.5, 0.5, 0.22]} radius={0.06} smoothness={4}>
          <meshPhysicalMaterial
            transmission={0.92}
            roughness={0.03}
            thickness={0.5}
            ior={1.45}
            clearcoat={1}
            clearcoatRoughness={0}
            transparent
            opacity={0.8}
            side={THREE.DoubleSide}
            depthWrite={false}
            envMapIntensity={1.4}
          />
        </RoundedBox>
      </mesh>
    </>
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
      const radius = 1.8 + Math.random() * 5.5;

      // Bias upward + toward camera
      const rawX = Math.sin(phi) * Math.cos(theta) * radius;
      const rawY = Math.abs(Math.sin(phi) * Math.sin(theta)) * radius * 1.3 + radius * 0.25;
      const rawZ = Math.cos(phi) * radius * 0.6 + Math.random() * 2.5;

      arr.push({
        dir: new THREE.Vector3(rawX, rawY, rawZ),
        rotAxis: new THREE.Vector3(
          Math.random() - 0.5,
          Math.random() - 0.5,
          Math.random() - 0.5
        ).normalize(),
        rotSpeed: 0.8 + Math.random() * 2.5,
        scale: 0.2 + Math.random() * 0.55,
        delay: Math.random() * 0.4,
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
      <ambientLight intensity={1.6} />
      <directionalLight position={[-4, 10, -4]} intensity={1.8} />
      <directionalLight position={[3, 6, 5]} intensity={1.0} />
      <pointLight position={[0, 2, 4]} intensity={0.6} color="#88ccff" />
      <Environment preset="city" />
      {cubes.map((c, i) => (
        <BlastCube key={i} data={c} progressRef={progressRef} texture={texture} />
      ))}
    </>
  );
}

export default function CubeRain({ progress: externalProgress }: { progress?: number }) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const progressRef = useRef(0);
  const [localProgress, setLocalProgress] = useState(0);
  const isMobile = typeof window !== "undefined" && window.innerWidth < 768;

  // Self-contained IntersectionObserver for progress
  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;

    const handleScroll = () => {
      const rect = el.getBoundingClientRect();
      const vh = window.innerHeight;
      // Progress: 0 when bottom of element enters viewport, 1 when top exits
      const total = rect.height + vh;
      const scrolled = vh - rect.top;
      const p = Math.max(0, Math.min(1, scrolled / total));
      setLocalProgress(p);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Use external progress if provided, otherwise local
  const finalProgress = externalProgress !== undefined ? externalProgress : localProgress;
  progressRef.current = finalProgress;

  if (finalProgress <= 0) return <div ref={wrapRef} className="cube-rain-wrap" />;

  return (
    <div ref={wrapRef} className="cube-rain-wrap" style={{ opacity: Math.min(1, finalProgress * 2.5) }}>
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
