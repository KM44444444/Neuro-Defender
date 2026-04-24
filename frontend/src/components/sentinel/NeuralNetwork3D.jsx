import { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

function Node({ position, color }) {
  const mesh = useRef();
  const offset = useMemo(() => Math.random() * Math.PI * 2, []);
  useFrame(({ clock }) => {
    if (mesh.current) {
      mesh.current.position.y = position[1] + Math.sin(clock.elapsedTime * 0.8 + offset) * 0.15;
    }
  });
  return (
    <mesh ref={mesh} position={position}>
      <sphereGeometry args={[0.06, 12, 12]} />
      <meshStandardMaterial color={color} emissive={color} emissiveIntensity={1.2} />
    </mesh>
  );
}

function Connections({ nodes }) {
  const { geometry, material } = useMemo(() => {
    const points = [];
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const d = new THREE.Vector3(...nodes[i]).distanceTo(new THREE.Vector3(...nodes[j]));
        if (d < 1.6) {
          points.push(new THREE.Vector3(...nodes[i]));
          points.push(new THREE.Vector3(...nodes[j]));
        }
      }
    }
    const geo = new THREE.BufferGeometry().setFromPoints(points);
    const mat = new THREE.LineBasicMaterial({ color: "#22d3ee", transparent: true, opacity: 0.15 });
    return { geometry: geo, material: mat };
  }, [nodes]);

  return <lineSegments geometry={geometry} material={material} />;
}

export default function NeuralNetwork3D() {
  const group = useRef();

  const nodes = useMemo(() => {
    const arr = [];
    for (let i = 0; i < 60; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const r = 1.8 + Math.random() * 0.8;
      arr.push([
        r * Math.sin(phi) * Math.cos(theta),
        r * Math.sin(phi) * Math.sin(theta),
        r * Math.cos(phi),
      ]);
    }
    return arr;
  }, []);

  const colors = ["#22d3ee", "#a855f7", "#3b82f6", "#34d399"];

  useFrame(({ clock, mouse }) => {
    if (group.current) {
      group.current.rotation.y = clock.elapsedTime * 0.08 + mouse.x * 0.3;
      group.current.rotation.x = Math.sin(clock.elapsedTime * 0.05) * 0.2 + mouse.y * 0.15;
    }
  });

  return (
    <group ref={group}>
      <ambientLight intensity={0.3} />
      <pointLight position={[5, 5, 5]} color="#22d3ee" intensity={2} />
      <pointLight position={[-5, -5, -5]} color="#a855f7" intensity={1.5} />
      {nodes.map((pos, i) => (
        <Node key={i} position={pos} color={colors[i % colors.length]} />
      ))}
      <Connections nodes={nodes} />
      {/* core glow sphere */}
      <mesh>
        <sphereGeometry args={[0.35, 32, 32]} />
        <meshStandardMaterial color="#22d3ee" emissive="#22d3ee" emissiveIntensity={2} transparent opacity={0.6} />
      </mesh>
    </group>
  );
}