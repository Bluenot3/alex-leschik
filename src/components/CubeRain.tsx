import { useRef, useEffect, useMemo } from "react";
import { Canvas, useFrame, useLoader } from "@react-three/fiber";
import { RoundedBox, MeshTransmissionMaterial } from "@react-three/drei";
import * as THREE from "three";
import zzLogo from "@/assets/zz-logo.png";

const CUBE_COUNT = 40;

interface FallingCube {
  startX: number;
  startZ: number;
  speed: number;
  rotSpeed: THREE.Vector3;
  scale: number;
  delay: number;
}

function MiniPhoto({ texture }: { texture: THREE.Texture }) {
  const mat = useMemo(() => {
    return new THREE.MeshStandardMaterial({
      map: texture,
      side: THREE.DoubleSide,
      roughness: 0.15,
      metalness: 0.05,
      transparent: true,
      alphaTest: 0.01,
    });
  }, [texture]);

  return (
    <mesh material={mat} renderOrder={0}>
      <planeGeometry args={[0.5, 0.5]} />
    </mesh>
  );
}

function FallingCubeInstance({
  cube,
  progress,
  texture,
}: {
  cube: FallingCube;
  progress: number;
  texture: THREE.Texture;
}) {
  const groupRef = useRef<THREE.Group>(null!);
  const timeRef = useRef(0);

  useFrame((_, delta) => {
    if (!groupRef.current) return;
    timeRef.current += delta;

    // Delayed start based on progress
    const effectiveProgress = Math.max(0, progress - cube.delay);
    if (effectiveProgress <= 0) {
      groupRef.current.visible = false;
      return;
    }
    groupRef.current.visible = true;

    // Fall from top
    const fallY = 12 - effectiveProgress * cube.speed * 28;
    const sway = Math.sin(timeRef.current * 1.2 + cube.startX * 3) * 0.8;

    groupRef.current.position.set(
      cube.startX + sway,
      fallY,
      cube.startZ
    );

    groupRef.current.rotation.x += delta * cube.rotSpeed.x;
    groupRef.current.rotation.y += delta * cube.rotSpeed.y;
    groupRef.current.rotation.z += delta * cube.rotSpeed.z;

    // Fade out when below view
    const scale = fallY < -8 ? Math.max(0, 1 + (fallY + 8) * 0.2) : 1;
    const s = cube.scale * scale;
    groupRef.current.scale.setScalar(s);
  });

  return (
    <group ref={groupRef} visible={false}>
      <MiniPhoto texture={texture} />
      <RoundedBox
        args={[0.7, 0.7, 0.35]}
        radius={0.08}
        smoothness={16}
        renderOrder={1}
      >
        <MeshTransmissionMaterial
          transmission={1}
          roughness={0}
          thickness={0.5}
          ior={1.45}
          chromaticAberration={0.04}
          clearcoat={1}
          clearcoatRoughness={0}
          envMapIntensity={0.8}
          transparent
          opacity={0.88}
          side={THREE.DoubleSide}
          depthWrite={false}
        />
      </RoundedBox>
    </group>
  );
}

function CubeRainScene({ progress }: { progress: number }) {
  const texture = useLoader(THREE.TextureLoader, zzLogo);

  const cubes = useMemo<FallingCube[]>(() => {
    const arr: FallingCube[] = [];
    for (let i = 0; i < CUBE_COUNT; i++) {
      arr.push({
        startX: (Math.random() - 0.5) * 16,
        startZ: (Math.random() - 0.5) * 8 - 2,
        speed: 0.6 + Math.random() * 0.8,
        rotSpeed: new THREE.Vector3(
          (Math.random() - 0.5) * 3,
          (Math.random() - 0.5) * 3,
          (Math.random() - 0.5) * 1.5
        ),
        scale: 0.4 + Math.random() * 0.6,
        delay: Math.random() * 0.4,
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
      <ambientLight intensity={1.5} />
      <directionalLight position={[-5, 8, -5]} intensity={2} />
      <directionalLight position={[3, 10, 5]} intensity={1.5} />
      {cubes.map((cube, i) => (
        <FallingCubeInstance
          key={i}
          cube={cube}
          progress={progress}
          texture={texture}
        />
      ))}
    </>
  );
}

interface CubeRainProps {
  progress: number; // 0-1 within the rain section
}

export default function CubeRain({ progress }: CubeRainProps) {
  if (progress <= 0) return null;

  return (
    <div
      className="cube-rain-wrap"
      style={{ opacity: Math.min(1, progress * 3) }}
    >
      <Canvas
        camera={{ position: [0, 0, 10], fov: 50 }}
        gl={{
          antialias: true,
          alpha: true,
          toneMapping: THREE.ACESFilmicToneMapping,
          toneMappingExposure: 1.1,
        }}
        style={{ background: "transparent" }}
      >
        <CubeRainScene progress={progress} />
      </Canvas>
    </div>
  );
}
