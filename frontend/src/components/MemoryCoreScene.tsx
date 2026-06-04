import { Canvas, useFrame } from "@react-three/fiber";
import { memo, useMemo, useRef } from "react";
import * as THREE from "three";

type MemoryCoreSceneProps = {
  active: boolean;
};

const SHELL_PARTICLE_COUNT = 2600;
const ORBIT_PARTICLE_COUNT = 1400;
const CONNECTION_COUNT = 420;

export const MemoryCoreScene = memo(function MemoryCoreScene({ active }: MemoryCoreSceneProps) {
  return (
    <div className="memory-core-scene pointer-events-none absolute inset-0 z-0">
      <Canvas
        camera={{ position: [0, 0, 6.2], fov: 48, near: 0.1, far: 100 }}
        dpr={[1, 1.7]}
        gl={{
          alpha: true,
          antialias: true,
          powerPreference: "high-performance",
        }}
      >
        <ambientLight intensity={0.6} />
        <pointLight color="#7ee7d1" intensity={18} position={[2.8, 2.4, 3.4]} />
        <pointLight color="#9e8cff" intensity={8} position={[-3.5, -2.2, 2.2]} />
        <NeuralMemoryCore active={active} />
      </Canvas>
    </div>
  );
});

function NeuralMemoryCore({ active }: MemoryCoreSceneProps) {
  const groupRef = useRef<THREE.Group>(null);
  const shellRef = useRef<THREE.Points>(null);
  const orbitRef = useRef<THREE.Points>(null);
  const pulseRef = useRef<THREE.Mesh>(null);

  const shellPositions = useMemo(() => createSphereParticles(SHELL_PARTICLE_COUNT, 1.52), []);
  const orbitPositions = useMemo(() => createOrbitParticles(ORBIT_PARTICLE_COUNT), []);
  const connectionPositions = useMemo(() => createConnections(CONNECTION_COUNT, 1.5), []);

  useFrame((state, delta) => {
    const group = groupRef.current;
    if (!group) {
      return;
    }

    const pointerX = state.pointer.x;
    const pointerY = state.pointer.y;
    const spinBoost = active ? 1.65 : 1;
    group.rotation.y += delta * 0.16 * spinBoost;
    group.rotation.x += (pointerY * 0.22 - group.rotation.x) * 0.035;
    group.rotation.z += (pointerX * 0.15 - group.rotation.z) * 0.035;
    group.position.x += (pointerX * 0.18 - group.position.x) * 0.035;
    group.position.y += (pointerY * 0.14 - group.position.y) * 0.035;

    if (shellRef.current) {
      shellRef.current.rotation.y -= delta * 0.055;
      shellRef.current.rotation.x += delta * 0.025;
    }

    if (orbitRef.current) {
      orbitRef.current.rotation.y += delta * 0.24 * spinBoost;
      orbitRef.current.rotation.z -= delta * 0.09;
    }

    if (pulseRef.current) {
      const scale = 1 + Math.sin(state.clock.elapsedTime * (active ? 3.4 : 2.2)) * 0.035;
      pulseRef.current.scale.setScalar(scale);
    }
  });

  return (
    <group ref={groupRef} position={[0, -0.08, 0]}>
      <points ref={shellRef}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[shellPositions, 3]} />
        </bufferGeometry>
        <pointsMaterial
          color="#8ef7ff"
          size={0.018}
          transparent
          opacity={0.72}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </points>

      <points ref={orbitRef}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[orbitPositions, 3]} />
        </bufferGeometry>
        <pointsMaterial
          color="#7ee7d1"
          size={0.014}
          transparent
          opacity={0.52}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </points>

      <lineSegments>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[connectionPositions, 3]} />
        </bufferGeometry>
        <lineBasicMaterial
          color="#7ee7d1"
          transparent
          opacity={0.13}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </lineSegments>

      <mesh ref={pulseRef}>
        <icosahedronGeometry args={[1.18, 5]} />
        <meshBasicMaterial
          color="#7ee7d1"
          wireframe
          transparent
          opacity={0.12}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </mesh>

      <mesh>
        <sphereGeometry args={[1.02, 64, 64]} />
        <meshStandardMaterial
          color="#8ef7ff"
          emissive="#7ee7d1"
          emissiveIntensity={0.12}
          metalness={0.05}
          roughness={0.22}
          transparent
          opacity={0.075}
          depthWrite={false}
        />
      </mesh>
    </group>
  );
}

function createSphereParticles(count: number, radius: number) {
  const positions = new Float32Array(count * 3);

  for (let index = 0; index < count; index += 1) {
    const phi = Math.acos(1 - 2 * (index + 0.5) / count);
    const theta = Math.PI * (1 + Math.sqrt(5)) * index;
    const jitter = 1 + (Math.random() - 0.5) * 0.16;
    const currentRadius = radius * jitter;

    positions[index * 3] = Math.cos(theta) * Math.sin(phi) * currentRadius;
    positions[index * 3 + 1] = Math.sin(theta) * Math.sin(phi) * currentRadius;
    positions[index * 3 + 2] = Math.cos(phi) * currentRadius;
  }

  return positions;
}

function createOrbitParticles(count: number) {
  const positions = new Float32Array(count * 3);

  for (let index = 0; index < count; index += 1) {
    const angle = (index / count) * Math.PI * 2;
    const band = index % 4;
    const radius = 1.78 + (band * 0.18) + Math.random() * 0.14;
    const tilt = (band - 1.5) * 0.34;

    positions[index * 3] = Math.cos(angle) * radius;
    positions[index * 3 + 1] = Math.sin(angle * (band % 2 === 0 ? 1 : -1)) * 0.18 + tilt;
    positions[index * 3 + 2] = Math.sin(angle) * radius * 0.42;
  }

  return positions;
}

function createConnections(count: number, radius: number) {
  const positions = new Float32Array(count * 2 * 3);

  for (let index = 0; index < count; index += 1) {
    const a = randomSpherePoint(radius * (0.72 + Math.random() * 0.5));
    const b = randomSpherePoint(radius * (0.72 + Math.random() * 0.5));
    const offset = index * 6;

    positions[offset] = a.x;
    positions[offset + 1] = a.y;
    positions[offset + 2] = a.z;
    positions[offset + 3] = b.x;
    positions[offset + 4] = b.y;
    positions[offset + 5] = b.z;
  }

  return positions;
}

function randomSpherePoint(radius: number) {
  const theta = Math.random() * Math.PI * 2;
  const phi = Math.acos(2 * Math.random() - 1);

  return {
    x: radius * Math.sin(phi) * Math.cos(theta),
    y: radius * Math.sin(phi) * Math.sin(theta),
    z: radius * Math.cos(phi),
  };
}
