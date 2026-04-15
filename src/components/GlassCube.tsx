import { useRef, useMemo } from "react";
import { Canvas, useFrame, useLoader } from "@react-three/fiber";
import { Environment, RoundedBox, MeshTransmissionMaterial } from "@react-three/drei";
import * as THREE from "three";
import zzLogo from "@/assets/zz-logo.png";

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
}: {
  offset: number;
  speed: number;
  radius: number;
  size: number;
  color: string;
}) {
  const ref = useRef<THREE.Mesh>(null!);
  useFrame(({ clock }) => {
    const t = clock.getElapsedTime() * speed + offset;
    ref.current.position.x = Math.cos(t) * radius;
    ref.current.position.y = Math.sin(t * 0.7) * radius * 0.45;
    ref.current.position.z = Math.sin(t) * radius * 0.6;
    ref.current.rotation.y += 0.025;
  });
  return (
    <mesh ref={ref}>
      <sphereGeometry args={[size, 32, 32]} />
      <MeshTransmissionMaterial
        transmission={1}
        roughness={0}
        thickness={size * 3}
        ior={1.6}
        chromaticAberration={0.22}
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
}: {
  offset: number;
  speed: number;
  radius: number;
}) {
  const ref = useRef<THREE.Mesh>(null!);
  useFrame(({ clock }) => {
    const t = clock.getElapsedTime() * speed + offset;
    ref.current.position.x = Math.cos(t + 1.1) * radius * 0.75;
    ref.current.position.y = Math.sin(t * 1.3) * radius;
    ref.current.position.z = Math.cos(t * 0.9) * radius * 0.55;
    ref.current.rotation.x += 0.035;
    ref.current.rotation.y += 0.025;
    ref.current.rotation.z += 0.015;
  });
  return (
    <mesh ref={ref}>
      <octahedronGeometry args={[0.16, 0]} />
      <MeshTransmissionMaterial
        transmission={1}
        roughness={0}
        thickness={0.3}
        ior={1.85}
        chromaticAberration={0.35}
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

function GlassShape() {
  const groupRef = useRef<THREE.Group>(null!);

  useFrame((_, delta) => {
    if (groupRef.current) {
      groupRef.current.rotation.y += delta * 0.35;
      groupRef.current.rotation.x = Math.sin(Date.now() * 0.0003) * 0.15;
      groupRef.current.rotation.z = Math.cos(Date.now() * 0.00025) * 0.06;
    }
  });

  return (
    <group ref={groupRef}>
      <PhotoPlane />
      <RoundedBox args={[2.2, 2.2, 1.1]} radius={0.28} smoothness={32} renderOrder={1}>
        <MeshTransmissionMaterial
          transmission={1}
          roughness={0}
          thickness={1.6}
          ior={1.48}
          chromaticAberration={0.12}
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
  return (
    <div className="glass-cube-section">
      <div className="glass-cube-canvas-wrap">
        <Canvas
          camera={{ position: [0, 0, 5.5], fov: 45 }}
          gl={{
            antialias: true,
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
          <GlassShape />
          <SatelliteSphere offset={0} speed={0.55} radius={2.1} size={0.21} color="#e4f2ff" />
          <SatelliteSphere offset={Math.PI * 0.7} speed={0.42} radius={1.95} size={0.15} color="#fff0e0" />
          <SatelliteSphere offset={Math.PI * 1.4} speed={0.48} radius={2.0} size={0.13} color="#f0e4ff" />
          <SatelliteShard offset={0.9} speed={0.65} radius={1.75} />
          <SatelliteShard offset={Math.PI + 0.9} speed={0.5} radius={1.9} />
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
