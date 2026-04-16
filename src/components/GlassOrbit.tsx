import { useRef, useMemo } from "react";
import { Canvas, useFrame, useLoader } from "@react-three/fiber";
import { Environment, RoundedBox, MeshTransmissionMaterial } from "@react-three/drei";
import * as THREE from "three";
import zzLogo from "@/assets/zz-logo.png";

/* ── Center logo plane ── */
function CenterLogo() {
  const texture = useLoader(THREE.TextureLoader, zzLogo);
  const material = useMemo(() => {
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.needsUpdate = true;
    return new THREE.MeshStandardMaterial({
      map: texture,
      side: THREE.DoubleSide,
      roughness: 0.12,
      metalness: 0.08,
      transparent: true,
      alphaTest: 0.01,
    });
  }, [texture]);

  const meshRef = useRef<THREE.Mesh>(null!);
  useFrame((_, delta) => {
    if (meshRef.current) meshRef.current.rotation.y += delta * 0.18;
  });

  return (
    <mesh ref={meshRef} material={material}>
      <planeGeometry args={[1.3, 1.3]} />
    </mesh>
  );
}

/* ── Central glass sphere with logo inside ── */
function CentralSphere() {
  const ref = useRef<THREE.Group>(null!);
  useFrame(({ clock }) => {
    ref.current.rotation.y = clock.getElapsedTime() * 0.18;
    ref.current.rotation.x = Math.sin(clock.getElapsedTime() * 0.28) * 0.08;
  });
  return (
    <group ref={ref}>
      <CenterLogo />
      <mesh>
        <sphereGeometry args={[1.2, 32, 32]} />
        <MeshTransmissionMaterial
          transmission={1}
          roughness={0}
          thickness={1.6}
          ior={1.46}
          chromaticAberration={0.1}
          clearcoat={1}
          clearcoatRoughness={0}
          envMapIntensity={1.7}
          transparent
          opacity={0.88}
          depthWrite={false}
          color="#f8fbff"
        />
      </mesh>
    </group>
  );
}

/* ── Generic orbiting glass shape ── */
function Orbiter({
  shape,
  radius,
  speed,
  phase,
  tiltAngle,
  size,
  ior,
  color,
  aberration,
  opacity = 0.82,
}: {
  shape: "sphere" | "box" | "torus" | "octahedron" | "tetra";
  radius: number;
  speed: number;
  phase: number;
  tiltAngle: number;
  size: number;
  ior: number;
  color: string;
  aberration: number;
  opacity?: number;
}) {
  const ref = useRef<THREE.Group>(null!);
  // Pre-allocate to avoid GC pressure at 60fps
  const _vec = useMemo(() => new THREE.Vector3(), []);

  const tiltQ = useMemo(() => {
    const q = new THREE.Quaternion();
    q.setFromAxisAngle(new THREE.Vector3(1, 0, 0), tiltAngle);
    return q;
  }, [tiltAngle]);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime() * speed + phase;
    _vec.set(Math.cos(t) * radius, 0, Math.sin(t) * radius);
    _vec.applyQuaternion(tiltQ);
    ref.current.position.copy(_vec);
    ref.current.rotation.x += 0.012;
    ref.current.rotation.y += 0.018;
    ref.current.rotation.z += 0.008;
  });

  const mat = (
    <MeshTransmissionMaterial
      transmission={1}
      roughness={0}
      thickness={size * 2.2}
      ior={ior}
      chromaticAberration={aberration}
      clearcoat={1}
      clearcoatRoughness={0}
      envMapIntensity={2.2}
      transparent
      opacity={opacity}
      depthWrite={false}
      color={color}
    />
  );

  return (
    <group ref={ref}>
      {shape === "sphere" && (
        <mesh>
          <sphereGeometry args={[size, 14, 14]} />
          {mat}
        </mesh>
      )}
      {shape === "box" && (
        <RoundedBox args={[size * 1.7, size * 1.7, size * 0.85]} radius={size * 0.25} smoothness={6}>
          {mat}
        </RoundedBox>
      )}
      {shape === "torus" && (
        <mesh>
          <torusGeometry args={[size * 0.75, size * 0.28, 12, 28]} />
          {mat}
        </mesh>
      )}
      {shape === "octahedron" && (
        <mesh>
          <octahedronGeometry args={[size, 0]} />
          {mat}
        </mesh>
      )}
      {shape === "tetra" && (
        <mesh>
          <tetrahedronGeometry args={[size, 0]} />
          {mat}
        </mesh>
      )}
    </group>
  );
}

/* ── Main export ── */
export default function GlassOrbit() {
  return (
    <div className="glass-orbit-section">
      <Canvas
        camera={{ position: [0, 0.5, 8], fov: 40 }}
        dpr={[1, 1.5]}
        gl={{
          antialias: false,
          alpha: true,
          powerPreference: "high-performance",
          toneMapping: THREE.ACESFilmicToneMapping,
          toneMappingExposure: 1.3,
        }}
        style={{ background: "transparent" }}
      >
        <ambientLight intensity={1.3} />
        <directionalLight position={[-6, 5, -8]} intensity={4.5} />
        <directionalLight position={[7, 5, 7]} intensity={2.5} />
        <directionalLight position={[0, -5, 5]} intensity={1.5} />
        <pointLight position={[4, 3, 4]} intensity={4} color="#80c4ff" />
        <pointLight position={[-4, -3, -3]} intensity={3} color="#ffb0e0" />
        <pointLight position={[0, 5, 0]} intensity={2.5} color="#ffe0a0" />
        <pointLight position={[0, -5, 0]} intensity={1.5} color="#a0ffcc" />
        <Environment preset="city" />

        <CentralSphere />

        {/* Inner ring — 3 small spheres */}
        <Orbiter shape="sphere" radius={2.1} speed={0.55} phase={0} tiltAngle={0.15} size={0.26} ior={1.52} color="#e0f0ff" aberration={0.14} />
        <Orbiter shape="sphere" radius={2.1} speed={0.55} phase={Math.PI * 0.66} tiltAngle={0.15} size={0.21} ior={1.62} color="#ffe8f0" aberration={0.18} />
        <Orbiter shape="sphere" radius={2.1} speed={0.55} phase={Math.PI * 1.33} tiltAngle={0.15} size={0.23} ior={1.55} color="#f0ffe0" aberration={0.12} />

        {/* Mid ring — mixed shapes */}
        <Orbiter shape="torus" radius={2.9} speed={0.35} phase={0.4} tiltAngle={0.55} size={0.34} ior={1.62} color="#e4ecff" aberration={0.2} opacity={0.78} />
        <Orbiter shape="box" radius={2.7} speed={0.38} phase={Math.PI + 0.4} tiltAngle={0.45} size={0.28} ior={1.5} color="#f8f6ff" aberration={0.1} />
        <Orbiter shape="octahedron" radius={3.0} speed={0.32} phase={Math.PI * 0.7 + 0.4} tiltAngle={0.65} size={0.22} ior={1.78} color="#ffe8f8" aberration={0.28} opacity={0.76} />

        {/* Outer ring — dramatic, slow */}
        <Orbiter shape="tetra" radius={3.6} speed={0.22} phase={0.8} tiltAngle={1.1} size={0.28} ior={1.7} color="#f0e8ff" aberration={0.22} opacity={0.7} />
        <Orbiter shape="sphere" radius={3.4} speed={0.25} phase={Math.PI + 0.8} tiltAngle={0.9} size={0.18} ior={1.58} color="#e8f8ff" aberration={0.15} opacity={0.72} />
        <Orbiter shape="torus" radius={3.8} speed={0.2} phase={Math.PI * 1.5} tiltAngle={1.3} size={0.28} ior={1.65} color="#fff0e0" aberration={0.25} opacity={0.68} />

        {/* Fast micro-pieces */}
        <Orbiter shape="octahedron" radius={1.65} speed={0.9} phase={1.2} tiltAngle={0.8} size={0.11} ior={1.85} color="#ffffff" aberration={0.38} opacity={0.75} />
        <Orbiter shape="tetra" radius={1.7} speed={0.85} phase={Math.PI + 1.2} tiltAngle={1.0} size={0.09} ior={1.9} color="#e8e8ff" aberration={0.42} opacity={0.7} />
      </Canvas>
      <div className="glass-orbit-label">
        <span className="glass-orbit-label-dot" />
        <span>GLASS SYSTEM</span>
        <span className="glass-cube-label-sep">—</span>
        <span>Orbital Field · AZ1</span>
      </div>
    </div>
  );
}
