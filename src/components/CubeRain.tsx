import { useRef, useEffect, useMemo } from "react";
import { Canvas, useFrame, useLoader } from "@react-three/fiber";
import { Environment } from "@react-three/drei";
import * as THREE from "three";
import zzLogo from "@/assets/zz-logo.png";

const CUBE_COUNT = 24;

interface CubeData {
  startX: number;
  startZ: number;
  speed: number;
  rotSpeed: THREE.Vector3;
  scale: number;
  delay: number;
}

function FallingCube({
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
  const smooth = useRef(0);
  const time = useRef(0);

  useFrame((_, delta) => {
    if (!meshRef.current) return;
    time.current += delta;

    const target = Math.max(0, (progressRef.current ?? 0) - data.delay);
    smooth.current += (target - smooth.current) * 0.05;

    if (smooth.current < 0.002) {
      meshRef.current.visible = false;
      if (planeRef.current) planeRef.current.visible = false;
      return;
    }
    meshRef.current.visible = true;
    if (planeRef.current) planeRef.current.visible = true;

    const p = smooth.current;
    const fallY = 10 - p * data.speed * 22;
    const sway = Math.sin(time.current * 0.9 + data.startX * 2) * 0.6;

    const pos = [data.startX + sway, fallY, data.startZ] as const;
    meshRef.current.position.set(...pos);
    if (planeRef.current) planeRef.current.position.set(...pos);

    meshRef.current.rotation.x += delta * data.rotSpeed.x;
    meshRef.current.rotation.y += delta * data.rotSpeed.y;
    meshRef.current.rotation.z += delta * data.rotSpeed.z;
    if (planeRef.current) planeRef.current.rotation.copy(meshRef.current.rotation);

    const fade = fallY < -6 ? Math.max(0, 1 + (fallY + 6) * 0.25) : 1;
    const s = data.scale * fade;
    meshRef.current.scale.setScalar(s);
    if (planeRef.current) planeRef.current.scale.setScalar(s);
  });

  return (
    <>
      {/* Logo plane inside */}
      <mesh ref={planeRef} visible={false} renderOrder={0}>
        <planeGeometry args={[0.5, 0.5]} />
        <meshStandardMaterial
          map={texture}
          side={THREE.DoubleSide}
          roughness={0.15}
          transparent
          alphaTest={0.01}
        />
      </mesh>
      {/* Glass box */}
      <mesh ref={meshRef} visible={false} renderOrder={1}>
        <boxGeometry args={[0.65, 0.65, 0.32]} />
        <meshPhysicalMaterial
          transmission={0.95}
          roughness={0.05}
          thickness={0.6}
          ior={1.45}
          clearcoat={1}
          clearcoatRoughness={0}
          transparent
          opacity={0.85}
          side={THREE.DoubleSide}
          depthWrite={false}
          envMapIntensity={0.8}
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
      arr.push({
        startX: (Math.random() - 0.5) * 14,
        startZ: (Math.random() - 0.5) * 6 - 2,
        speed: 0.5 + Math.random() * 0.7,
        rotSpeed: new THREE.Vector3(
          (Math.random() - 0.5) * 2,
          (Math.random() - 0.5) * 2,
          (Math.random() - 0.5) * 1
        ),
        scale: 0.5 + Math.random() * 0.5,
        delay: Math.random() * 0.35,
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
      <directionalLight position={[-4, 8, -4]} intensity={2.5} />
      <directionalLight position={[3, 6, 5]} intensity={1.5} />
      <Environment preset="city" />
      {cubes.map((c, i) => (
        <FallingCube key={i} data={c} progressRef={progressRef} texture={texture} />
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
