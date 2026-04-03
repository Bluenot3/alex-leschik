import { useEffect, useMemo, useRef } from "react";
import { Canvas, useFrame, useLoader } from "@react-three/fiber";
import { Environment, RoundedBox } from "@react-three/drei";
import * as THREE from "three";
import zzLogo from "@/assets/zz-logo.png";

interface CubeData {
  dir: THREE.Vector3;
  rotAxis: THREE.Vector3;
  rotSpeed: number;
  scale: number;
  delay: number;
  floatOffset: number;
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
  const shellRef = useRef<THREE.Mesh>(null!);
  const coreRef = useRef<THREE.Mesh>(null!);
  const labelFrontRef = useRef<THREE.Mesh>(null!);
  const labelBackRef = useRef<THREE.Mesh>(null!);
  const smoothP = useRef(0);

  useFrame((state, delta) => {
    const group = groupRef.current;
    if (!group) return;

    const target = Math.max(0, (progressRef.current ?? 0) - data.delay);
    smoothP.current = THREE.MathUtils.damp(smoothP.current, target, 4.2, delta);
    const p = Math.min(smoothP.current, 1);

    if (p < 0.002) {
      group.visible = false;
      return;
    }

    group.visible = true;

    const ease = 1 - Math.pow(1 - p, 4);
    const elapsed = state.clock.elapsedTime;
    const floatAmp = 0.16 * ease;

    const driftX = Math.sin(elapsed * 0.45 + data.floatOffset) * floatAmp;
    const driftY = Math.cos(elapsed * 0.34 + data.floatOffset * 0.82) * floatAmp * 0.75;
    const driftZ = Math.sin(elapsed * 0.28 + data.floatOffset * 1.3) * floatAmp * 0.55;

    group.position.set(
      data.dir.x * ease + driftX,
      data.dir.y * ease + driftY,
      data.dir.z * ease + driftZ
    );

    const spinFactor = 0.14 + (1 - ease) * 1.18;
    group.rotation.x += delta * data.rotSpeed * data.rotAxis.x * spinFactor;
    group.rotation.y += delta * data.rotSpeed * data.rotAxis.y * spinFactor;
    group.rotation.z += delta * data.rotSpeed * data.rotAxis.z * spinFactor * 0.75;

    const scale = data.scale * THREE.MathUtils.lerp(0.12, 1.05, Math.min(1, ease * 1.06));
    group.scale.setScalar(scale);

    const shellMat = shellRef.current.material as THREE.MeshPhysicalMaterial;
    shellMat.opacity = 0.32 + ease * 0.34;
    shellMat.thickness = 0.42 + ease * 0.16;

    const coreMat = coreRef.current.material as THREE.MeshPhysicalMaterial;
    coreMat.opacity = 0.06 + ease * 0.08;

    const frontMat = labelFrontRef.current.material as THREE.MeshStandardMaterial;
    const backMat = labelBackRef.current.material as THREE.MeshStandardMaterial;
    frontMat.opacity = 0.26 + ease * 0.38;
    backMat.opacity = 0.2 + ease * 0.3;
  });

  return (
    <group ref={groupRef} visible={false}>
      <RoundedBox ref={coreRef} args={[0.22, 0.22, 0.18]} radius={0.04} smoothness={4}>
        <meshPhysicalMaterial
          transmission={0.18}
          roughness={0.12}
          thickness={0.2}
          transparent
          opacity={0.1}
          depthWrite={false}
        />
      </RoundedBox>

      <mesh ref={labelFrontRef} position={[0, 0, 0.08]} renderOrder={1}>
        <planeGeometry args={[0.22, 0.22]} />
        <meshStandardMaterial
          map={texture}
          transparent
          opacity={0.5}
          alphaTest={0.01}
          roughness={0.2}
          metalness={0.05}
          depthWrite={false}
        />
      </mesh>

      <mesh ref={labelBackRef} position={[0, 0, -0.08]} rotation={[0, Math.PI, 0]} renderOrder={1}>
        <planeGeometry args={[0.22, 0.22]} />
        <meshStandardMaterial
          map={texture}
          transparent
          opacity={0.45}
          alphaTest={0.01}
          roughness={0.2}
          metalness={0.05}
          depthWrite={false}
        />
      </mesh>

      <RoundedBox ref={shellRef} args={[0.38, 0.38, 0.38]} radius={0.08} smoothness={6} renderOrder={2}>
        <meshPhysicalMaterial
          transmission={0.98}
          roughness={0.06}
          thickness={0.48}
          ior={1.45}
          clearcoat={1}
          clearcoatRoughness={0.02}
          transparent
          opacity={0.58}
          envMapIntensity={1.15}
          side={THREE.DoubleSide}
          depthWrite={false}
        />
      </RoundedBox>
    </group>
  );
}

function Scene({ progressRef }: { progressRef: React.RefObject<number> }) {
  const texture = useLoader(THREE.TextureLoader, zzLogo);

  const cubes = useMemo<CubeData[]>(() => {
    const count = typeof window !== "undefined" && window.innerWidth < 768 ? 18 : 34;
    return Array.from({ length: count }, (_, i) => {
      const angle = (i / count) * Math.PI * 2 + Math.random() * 0.35;
      const ring = 0.7 + Math.random() * 2.1;
      const x = Math.cos(angle) * ring * (0.75 + Math.random() * 0.35);
      const y = 0.9 + Math.random() * 4.1 + Math.sin(angle * 1.5) * 0.35;
      const z = 0.35 + Math.random() * 3.8;

      return {
        dir: new THREE.Vector3(x, y, z),
        rotAxis: new THREE.Vector3(
          Math.random() - 0.5,
          Math.random() - 0.5,
          Math.random() - 0.5
        ).normalize(),
        rotSpeed: 0.7 + Math.random() * 1.6,
        scale: 0.72 + Math.random() * 0.42,
        delay: Math.random() * 0.62,
        floatOffset: Math.random() * Math.PI * 2,
      };
    });
  }, []);

  useEffect(() => {
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.needsUpdate = true;
  }, [texture]);

  return (
    <>
      <ambientLight intensity={1.35} />
      <directionalLight position={[-4, 10, -6]} intensity={1.8} />
      <directionalLight position={[4, 5, 6]} intensity={1.25} />
      <pointLight position={[0, 1.5, 5]} intensity={0.9} color="#c9e4ff" />
      <Environment preset="city" />
      {cubes.map((cube, index) => (
        <BlastCube key={index} data={cube} progressRef={progressRef} texture={texture} />
      ))}
    </>
  );
}

export default function CubeRain({ progress }: { progress: number }) {
  const progressRef = useRef(0);
  progressRef.current = progress;

  if (progress <= 0.001) return null;

  return (
    <div className="cube-rain-wrap" style={{ opacity: Math.min(1, progress * 2.1) }}>
      <Canvas
        camera={{ position: [0, 1.05, 6.2], fov: 42 }}
        gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
        dpr={[1, 1.2]}
        style={{ background: "transparent" }}
      >
        <Scene progressRef={progressRef} />
      </Canvas>
    </div>
  );
}
