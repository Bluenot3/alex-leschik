import { useRef, useMemo, useCallback } from "react";
import { Canvas, useFrame, useLoader } from "@react-three/fiber";
import { Environment, RoundedBox, MeshTransmissionMaterial } from "@react-three/drei";
import * as THREE from "three";
import zzLogo from "@/assets/zz-logo.png";

type MouseState = { x: number; y: number; over: boolean };

function PhotoPlane() {
  const texture = useLoader(THREE.TextureLoader, zzLogo);

  const material = useMemo(() => {
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.needsUpdate = true;
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
    <mesh position={[0, 0, 0]} renderOrder={0} material={material}>
      <planeGeometry args={[1.65, 1.65]} />
    </mesh>
  );
}

function SatelliteSphere({
  offset,
  speed,
  radius,
  size,
  color,
  mouse,
}: {
  offset: number;
  speed: number;
  radius: number;
  size: number;
  color: string;
  mouse: { current: MouseState };
}) {
  const ref = useRef<THREE.Mesh>(null!);
  // Store the base (non-pushed) position each frame for lerp source
  const basePos = useRef(new THREE.Vector3());

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime() * speed + offset;
    const bx = Math.cos(t) * radius;
    const by = Math.sin(t * 0.7) * radius * 0.45;
    const bz = Math.sin(t) * radius * 0.6;
    basePos.current.set(bx, by, bz);

    const push = 0.25;
    const { x, y, over } = mouse.current;
    const tx = over ? bx + x * push : bx;
    const ty = over ? by + y * push : by;
    const tz = bz;

    ref.current.position.x += (tx - ref.current.position.x) * 0.09;
    ref.current.position.y += (ty - ref.current.position.y) * 0.09;
    ref.current.position.z += (tz - ref.current.position.z) * 0.09;
    ref.current.rotation.y += 0.025;
  });

  return (
    <mesh ref={ref}>
      <sphereGeometry args={[size, 16, 16]} />
      <MeshTransmissionMaterial
        transmission={1}
        roughness={0}
        thickness={size * 3}
        ior={1.6}
        chromaticAberration={0.14}
        clearcoat={1}
        clearcoatRoughness={0}
        envMapIntensity={2.2}
        transparent
        opacity={0.84}
        depthWrite={false}
        color={color}
      />
    </mesh>
  );
}

function SatelliteShard({
  offset,
  speed,
  radius,
  mouse,
}: {
  offset: number;
  speed: number;
  radius: number;
  mouse: { current: MouseState };
}) {
  const ref = useRef<THREE.Mesh>(null!);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime() * speed + offset;
    const bx = Math.cos(t + 1.1) * radius * 0.75;
    const by = Math.sin(t * 1.3) * radius;
    const bz = Math.cos(t * 0.9) * radius * 0.55;

    const scatter = 0.45;
    const { over } = mouse.current;

    // Direction away from center (normalized in xz plane, include y)
    const len = Math.sqrt(bx * bx + by * by + bz * bz) || 1;
    const tx = over ? bx + (bx / len) * scatter : bx;
    const ty = over ? by + (by / len) * scatter : by;
    const tz = over ? bz + (bz / len) * scatter : bz;

    ref.current.position.x += (tx - ref.current.position.x) * 0.09;
    ref.current.position.y += (ty - ref.current.position.y) * 0.09;
    ref.current.position.z += (tz - ref.current.position.z) * 0.09;

    const spinMult = over ? 1.8 : 1.0;
    ref.current.rotation.x += 0.035 * spinMult;
    ref.current.rotation.y += 0.025 * spinMult;
    ref.current.rotation.z += 0.015 * spinMult;
  });

  return (
    <mesh ref={ref}>
      <octahedronGeometry args={[0.16, 0]} />
      <MeshTransmissionMaterial
        transmission={1}
        roughness={0}
        thickness={0.3}
        ior={1.85}
        chromaticAberration={0.22}
        clearcoat={1}
        clearcoatRoughness={0}
        envMapIntensity={3}
        transparent
        opacity={0.78}
        depthWrite={false}
        color="#f2e8ff"
      />
    </mesh>
  );
}

function GlassShape({ mouse }: { mouse: { current: MouseState } }) {
  const groupRef = useRef<THREE.Group>(null!);

  useFrame((_, delta) => {
    if (!groupRef.current) return;
    // Auto-rotate y at all times
    groupRef.current.rotation.y += delta * 0.35;

    const { x, y, over } = mouse.current;
    const targetX = over ? y * 0.35 : Math.sin(Date.now() * 0.0003) * 0.15;
    const targetZ = over ? -x * 0.2 : Math.cos(Date.now() * 0.00025) * 0.06;

    groupRef.current.rotation.x += (targetX - groupRef.current.rotation.x) * 0.08;
    groupRef.current.rotation.z += (targetZ - groupRef.current.rotation.z) * 0.08;
  });

  return (
    <group ref={groupRef}>
      <PhotoPlane />
      <RoundedBox args={[2.2, 2.2, 1.1]} radius={0.28} smoothness={12} renderOrder={1}>
        <MeshTransmissionMaterial
          transmission={1}
          roughness={0}
          thickness={1.6}
          ior={1.48}
          chromaticAberration={0.07}
          clearcoat={1}
          clearcoatRoughness={0}
          envMapIntensity={1.6}
          transparent
          opacity={0.9}
          side={THREE.DoubleSide}
          depthWrite={false}
          color="#f8fbff"
        />
      </RoundedBox>
    </group>
  );
}

export default function GlassCube() {
  const mouseRef = useRef<MouseState>({ x: 0, y: 0, over: false });

  const handlePointerMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    // Normalize to [-1, 1]
    mouseRef.current.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    mouseRef.current.y = -(((e.clientY - rect.top) / rect.height) * 2 - 1);
  }, []);

  const handlePointerEnter = useCallback(() => {
    mouseRef.current.over = true;
  }, []);

  const handlePointerLeave = useCallback(() => {
    mouseRef.current.over = false;
  }, []);

  return (
    <div className="glass-cube-section">
      <div
        className="glass-cube-canvas-wrap"
        onPointerMove={handlePointerMove}
        onPointerEnter={handlePointerEnter}
        onPointerLeave={handlePointerLeave}
      >
        <Canvas
          camera={{ position: [0, 0, 5.5], fov: 45 }}
          dpr={[1, 1.5]}
          gl={{
            antialias: false,
            alpha: true,
            toneMapping: THREE.ACESFilmicToneMapping,
            toneMappingExposure: 1.25,
          }}
          style={{ background: "transparent" }}
        >
          <ambientLight intensity={1.2} />
          <directionalLight position={[-5, 3, -10]} intensity={3.5} />
          <directionalLight position={[0, 10, 0]} intensity={2} />
          <directionalLight position={[0, 2, 10]} intensity={1.5} />
          <pointLight position={[3, 2, 3]} intensity={3.5} color="#90c4ff" />
          <pointLight position={[-3, -2, -3]} intensity={2.5} color="#ffb0d0" />
          <pointLight position={[0, 3, -2]} intensity={2} color="#ffd080" />
          <Environment preset="city" />
          <GlassShape mouse={mouseRef} />
          <SatelliteSphere offset={0} speed={0.55} radius={2.1} size={0.21} color="#e4f2ff" mouse={mouseRef} />
          <SatelliteSphere offset={Math.PI * 0.7} speed={0.42} radius={1.95} size={0.15} color="#fff0e0" mouse={mouseRef} />
          <SatelliteSphere offset={Math.PI * 1.4} speed={0.48} radius={2.0} size={0.13} color="#f0e4ff" mouse={mouseRef} />
          <SatelliteShard offset={0.9} speed={0.65} radius={1.75} mouse={mouseRef} />
          <SatelliteShard offset={Math.PI + 0.9} speed={0.5} radius={1.9} mouse={mouseRef} />
        </Canvas>
      </div>
      <div className="glass-cube-label">
        <span className="glass-cube-label-pulse" />
        <span>ZZ</span>
        <span className="glass-cube-label-sep">—</span>
        <span>Glass Artifact</span>
        <span className="glass-cube-label-sep">·</span>
        <span>v2</span>
      </div>
    </div>
  );
}
