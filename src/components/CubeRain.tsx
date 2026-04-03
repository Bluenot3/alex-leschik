import { useRef, useEffect, useMemo } from "react";
import { Canvas, useFrame, useLoader } from "@react-three/fiber";
import { Environment } from "@react-three/drei";
import * as THREE from "three";
import zzLogo from "@/assets/zz-logo.png";

const CUBE_COUNT = 48;

interface CubeData {
  dir: THREE.Vector3;
  rotAxis: THREE.Vector3;
  rotSpeed: number;
  scale: number;
  delay: number;
  wobblePhase: number;
  wobbleSpeed: number;
}

function BlastCube({
  data,
  index,
  progressRef,
  texture,
}: {
  data: CubeData;
  index: number;
  progressRef: React.RefObject<number>;
  texture: THREE.Texture;
}) {
  const meshRef = useRef<THREE.Mesh>(null!);
  const planeRef = useRef<THREE.Mesh>(null!);
  const smoothP = useRef(0);

  useFrame((state, delta) => {
    if (!meshRef.current) return;

    const raw = Math.max(0, (progressRef.current ?? 0) - data.delay);
    smoothP.current = THREE.MathUtils.damp(smoothP.current, raw, 4, delta);
    const p = Math.min(smoothP.current, 1);

    if (p < 0.001) {
      meshRef.current.visible = false;
      if (planeRef.current) planeRef.current.visible = false;
      return;
    }
    meshRef.current.visible = true;
    if (planeRef.current) planeRef.current.visible = true;

    // Ultra slow-mo ease — quartic ease-out for dramatic expansion
    const ease = 1 - Math.pow(1 - p, 4);

    const elapsed = state.clock.elapsedTime;
    // Organic floating idle
    const idleX = Math.sin(elapsed * 0.25 + data.wobblePhase) * 0.12 * ease;
    const idleY = Math.cos(elapsed * 0.2 + data.wobblePhase * 1.3) * 0.1 * ease;
    const idleZ = Math.sin(elapsed * 0.18 + data.wobblePhase * 0.7) * 0.08 * ease;

    // Blast upward and outward — cubes move UP and toward camera
    const x = data.dir.x * ease + idleX;
    const y = data.dir.y * ease + idleY;
    const z = data.dir.z * ease + idleZ;

    meshRef.current.position.set(x, y, z);
    if (planeRef.current) planeRef.current.position.set(x, y, z);

    // Elegant slow spin that decays
    const spinFactor = Math.max(0.02, 1 - ease * 0.95);
    meshRef.current.rotation.x += delta * data.rotSpeed * spinFactor * data.rotAxis.x * 0.6;
    meshRef.current.rotation.y += delta * data.rotSpeed * spinFactor * data.rotAxis.y * 0.6;
    meshRef.current.rotation.z += delta * data.rotSpeed * spinFactor * data.rotAxis.z * 0.3;
    if (planeRef.current) planeRef.current.rotation.copy(meshRef.current.rotation);

    // Scale: start tiny, pop to full with slight overshoot
    const rawScale = Math.min(1.08, ease * 1.15);
    const popScale = data.scale * rawScale;
    meshRef.current.scale.setScalar(popScale);
    if (planeRef.current) planeRef.current.scale.setScalar(popScale);

    // Opacity
    const mat = meshRef.current.material as THREE.MeshPhysicalMaterial;
    mat.opacity = 0.5 + ease * 0.4;
  });

  return (
    <>
      <mesh ref={planeRef} visible={false} renderOrder={0}>
        <planeGeometry args={[0.42, 0.42]} />
        <meshStandardMaterial
          map={texture}
          side={THREE.DoubleSide}
          roughness={0.15}
          transparent
          alphaTest={0.01}
        />
      </mesh>
      <mesh ref={meshRef} visible={false} renderOrder={1}>
        <boxGeometry args={[0.55, 0.55, 0.25]} />
        <meshPhysicalMaterial
          transmission={0.94}
          roughness={0.04}
          thickness={0.6}
          ior={1.5}
          clearcoat={1}
          clearcoatRoughness={0}
          transparent
          opacity={0.85}
          side={THREE.DoubleSide}
          depthWrite={false}
          envMapIntensity={1.2}
        />
      </mesh>
    </>
  );
}

function Scene({ progressRef }: { progressRef: React.RefObject<number> }) {
  const texture = useLoader(THREE.TextureLoader, zzLogo);

  const cubes = useMemo<CubeData[]>(() => {
    const arr: CubeData[] = [];
    for (let i = 0; i < CUBE_COUNT; i++) {
      // Upward explosion pattern — biased toward UP and toward camera
      const phi = Math.acos(2 * Math.random() - 1);
      const theta = Math.random() * Math.PI * 2;
      const radius = 2.0 + Math.random() * 5;

      // Bias Y upward, Z toward camera
      const rawX = Math.sin(phi) * Math.cos(theta) * radius;
      const rawY = Math.abs(Math.sin(phi) * Math.sin(theta)) * radius * 1.2 + radius * 0.3;
      const rawZ = Math.cos(phi) * radius * 0.5 + Math.random() * 2;

      arr.push({
        dir: new THREE.Vector3(rawX, rawY, rawZ),
        rotAxis: new THREE.Vector3(
          Math.random() - 0.5,
          Math.random() - 0.5,
          Math.random() - 0.5
        ).normalize(),
        rotSpeed: 1.0 + Math.random() * 2.5,
        scale: 0.25 + Math.random() * 0.5,
        delay: Math.random() * 0.35,
        wobblePhase: Math.random() * Math.PI * 2,
        wobbleSpeed: 0.3 + Math.random() * 0.4,
      });
    }
    return arr;
  }, []);

  useEffect(() => {
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.needsUpdate = true;
  }, [texture]);

  return (
    <>
      <ambientLight intensity={1.8} />
      <directionalLight position={[-4, 10, -4]} intensity={2} />
      <directionalLight position={[3, 6, 5]} intensity={1.2} />
      <pointLight position={[0, 2, 4]} intensity={0.8} color="#88ccff" />
      <Environment preset="city" />
      {cubes.map((c, i) => (
        <BlastCube key={i} data={c} index={i} progressRef={progressRef} texture={texture} />
      ))}
    </>
  );
}

export default function CubeRain({ progress }: { progress: number }) {
  const progressRef = useRef(0);
  progressRef.current = progress;

  if (progress <= 0) return null;

  return (
    <div className="cube-rain-wrap" style={{ opacity: Math.min(1, progress * 2.5) }}>
      <Canvas
        camera={{ position: [0, -1, 10], fov: 48 }}
        gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
        style={{ background: "transparent" }}
        dpr={[1, 1.5]}
      >
        <Scene progressRef={progressRef} />
      </Canvas>
    </div>
  );
}
