import { useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Environment, RoundedBox, MeshTransmissionMaterial } from "@react-three/drei";
import * as THREE from "three";
import zzLogo from "@/assets/zz-logo.png";

function PhotoPlane() {
  const texture = new THREE.TextureLoader().load(zzLogo);
  texture.colorSpace = THREE.SRGBColorSpace;

  return (
    <mesh position={[0, 0, 0]} renderOrder={0}>
      <planeGeometry args={[1.6, 1.6]} />
      <meshStandardMaterial
        map={texture}
        side={THREE.DoubleSide}
        roughness={0.2}
        metalness={0.1}
        transparent
        alphaTest={0.01}
      />
    </mesh>
  );
}

function GlassShape() {
  const groupRef = useRef<THREE.Group>(null!);

  useFrame((_, delta) => {
    if (groupRef.current) {
      groupRef.current.rotation.y += delta * 0.4;
      groupRef.current.rotation.x = Math.sin(Date.now() * 0.0004) * 0.2;
      groupRef.current.rotation.z = Math.cos(Date.now() * 0.0003) * 0.08;
    }
  });

  return (
    <group ref={groupRef}>
      <PhotoPlane />
      <RoundedBox args={[2.1, 2.1, 1]} radius={0.25} smoothness={32} renderOrder={1}>
        <MeshTransmissionMaterial
          transmission={1}
          roughness={0}
          thickness={1.2}
          ior={1.5}
          chromaticAberration={0.06}
          clearcoat={1}
          clearcoatRoughness={0}
          envMapIntensity={1}
          transparent
          opacity={0.95}
          side={THREE.DoubleSide}
          depthWrite={false}
        />
      </RoundedBox>
    </group>
  );
}

export default function GlassCube() {
  return (
    <div className="glass-cube-wrapper">
      <Canvas
        camera={{ position: [0, 0, 5.5], fov: 45 }}
        gl={{
          antialias: true,
          alpha: true,
          toneMapping: THREE.ACESFilmicToneMapping,
          toneMappingExposure: 1.0,
        }}
        style={{ background: "transparent" }}
      >
        <ambientLight intensity={1} />
        <directionalLight position={[-5, 2, -10]} intensity={3} />
        <directionalLight position={[0, 10, 0]} intensity={2} />
        <directionalLight position={[0, 2, 10]} intensity={1} />
        <Environment preset="city" />
        <GlassShape />
      </Canvas>
    </div>
  );
}
