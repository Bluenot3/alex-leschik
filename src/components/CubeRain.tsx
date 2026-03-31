import { useRef, useEffect, useMemo } from "react";
import { Canvas, useFrame, useLoader } from "@react-three/fiber";
import { Environment } from "@react-three/drei";
import * as THREE from "three";
import zzLogo from "@/assets/zz-logo.png";

const CUBE_COUNT = 36;

interface CubeData {
  dir: THREE.Vector3;
  rotAxis: THREE.Vector3;
  rotSpeed: number;
  scale: number;
  delay: number;
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
    // Smooth damp toward target
    smoothP.current = THREE.MathUtils.damp(smoothP.current, raw, 6, delta);
    const p = Math.min(smoothP.current, 1);

    if (p < 0.001) {
      meshRef.current.visible = false;
      if (planeRef.current) planeRef.current.visible = false;
      return;
    }
    meshRef.current.visible = true;
    if (planeRef.current) planeRef.current.visible = true;

    // Ease-out cubic for blast motion
    const ease = 1 - Math.pow(1 - p, 3);

    // Position: blast outward from center, then idle float
    const elapsed = state.clock.elapsedTime;
    const idleX = Math.sin(elapsed * 0.4 + index * 1.7) * 0.08 * ease;
    const idleY = Math.cos(elapsed * 0.35 + index * 2.3) * 0.06 * ease;
    const idleZ = Math.sin(elapsed * 0.3 + index * 0.9) * 0.05 * ease;

    const x = data.dir.x * ease + idleX;
    const y = data.dir.y * ease + idleY;
    const z = data.dir.z * ease + idleZ;

    meshRef.current.position.set(x, y, z);
    if (planeRef.current) planeRef.current.position.set(x, y, z);

    // Rotation: spin fast at start, slow to gentle idle
    const spinFactor = Math.max(0.05, 1 - ease * 0.92);
    meshRef.current.rotation.x += delta * data.rotSpeed * spinFactor * data.rotAxis.x;
    meshRef.current.rotation.y += delta * data.rotSpeed * spinFactor * data.rotAxis.y;
    meshRef.current.rotation.z += delta * data.rotSpeed * spinFactor * data.rotAxis.z;
    if (planeRef.current) planeRef.current.rotation.copy(meshRef.current.rotation);

    // Scale pop-in
    const popScale = data.scale * Math.min(1, ease * 1.2);
    meshRef.current.scale.setScalar(popScale);
    if (planeRef.current) planeRef.current.scale.setScalar(popScale);

    // Fade opacity as they settle
    const mat = meshRef.current.material as THREE.MeshPhysicalMaterial;
    mat.opacity = 0.6 + ease * 0.3;
  });

  return (
    <>
      <mesh ref={planeRef} visible={false} renderOrder={0}>
        <planeGeometry args={[0.45, 0.45]} />
        <meshStandardMaterial
          map={texture}
          side={THREE.DoubleSide}
          roughness={0.15}
          transparent
          alphaTest={0.01}
        />
      </mesh>
      <mesh ref={meshRef} visible={false} renderOrder={1}>
        <boxGeometry args={[0.6, 0.6, 0.28]} />
        <meshPhysicalMaterial
          transmission={0.92}
          roughness={0.06}
          thickness={0.5}
          ior={1.45}
          clearcoat={1}
          clearcoatRoughness={0}
          transparent
          opacity={0.85}
          side={THREE.DoubleSide}
          depthWrite={false}
          envMapIntensity={1}
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
      // Distribute in a sphere blast pattern
      const phi = Math.acos(2 * Math.random() - 1);
      const theta = Math.random() * Math.PI * 2;
      const radius = 2.5 + Math.random() * 4;
      arr.push({
        dir: new THREE.Vector3(
          Math.sin(phi) * Math.cos(theta) * radius,
          Math.sin(phi) * Math.sin(theta) * radius * 0.7,
          Math.cos(phi) * radius * 0.6
        ),
        rotAxis: new THREE.Vector3(
          Math.random() - 0.5,
          Math.random() - 0.5,
          Math.random() - 0.5
        ).normalize(),
        rotSpeed: 1.5 + Math.random() * 3,
        scale: 0.3 + Math.random() * 0.45,
        delay: Math.random() * 0.25,
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
      <ambientLight intensity={2} />
      <directionalLight position={[-4, 8, -4]} intensity={2.5} />
      <directionalLight position={[3, 6, 5]} intensity={1.5} />
      <pointLight position={[0, 0, 3]} intensity={1} color="#88ccff" />
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
    <div className="cube-rain-wrap" style={{ opacity: Math.min(1, progress * 3) }}>
      <Canvas
        camera={{ position: [0, 0, 9], fov: 50 }}
        gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
        style={{ background: "transparent" }}
        dpr={[1, 1.5]}
      >
        <Scene progressRef={progressRef} />
      </Canvas>
    </div>
  );
}
