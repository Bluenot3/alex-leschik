import { useRef, useEffect, useMemo } from "react";
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
          thickness={1.4}
          ior={1.45}
          chromaticAberration={0.08}
          clearcoat={1}
          clearcoatRoughness={0}
          envMapIntensity={1.2}
          transparent
          opacity={0.92}
          side={THREE.DoubleSide}
          depthWrite={false}
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
            toneMappingExposure: 1.1,
          }}
          style={{ background: "transparent" }}
        >
          <ambientLight intensity={1.2} />
          <directionalLight position={[-5, 3, -10]} intensity={3.5} />
          <directionalLight position={[0, 10, 0]} intensity={2} />
          <directionalLight position={[0, 2, 10]} intensity={1.5} />
          <Environment preset="city" />
          <GlassShape />
        </Canvas>
      </div>
      <div className="glass-cube-label">
        <span>ZZ</span>
        <span className="glass-cube-label-sep">—</span>
        <span>Glass Artifact</span>
      </div>
    </div>
  );
}
