import { useRef, useMemo, useState, useEffect } from "react";
import { useFrame } from "@react-three/fiber";
import { Canvas } from "@react-three/fiber";
import * as THREE from "three";

function Particles({ count, color, active }) {
  const mesh = useRef();
  const geo = useMemo(() => {
    const g = new THREE.BufferGeometry();
    const arr = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      arr[i * 3] = (Math.random() - 0.5) * 4;
      arr[i * 3 + 1] = (Math.random() - 0.5) * 4;
      arr[i * 3 + 2] = (Math.random() - 0.5) * 4;
    }
    g.setAttribute("position", new THREE.BufferAttribute(arr, 3));
    return g;
  }, [count]);

  useFrame(() => {
    if (mesh.current && active) {
      mesh.current.rotation.y += 0.01;
      mesh.current.rotation.x += 0.005;
    }
  });

  if (!active) return null;

  return (
    <points ref={mesh} geometry={geo}>
      <pointsMaterial color={color} size={0.04} transparent opacity={0.8} />
    </points>
  );
}

function Sphere({ threatLevel }) {
  const mesh = useRef();
  const [distort, setDistort] = useState(0);

  const config = {
    LOW:    { color: "#34d399", emissive: "#34d399", intensity: 1.2, speed: 0.5 },
    MEDIUM: { color: "#facc15", emissive: "#facc15", intensity: 1.5, speed: 1.0 },
    HIGH:   { color: "#f87171", emissive: "#f87171", intensity: 2.5, speed: 2.0 },
  };
  const cfg = config[threatLevel] || config.LOW;

  useEffect(() => {
    setDistort(threatLevel === "HIGH" ? 0.6 : threatLevel === "MEDIUM" ? 0.25 : 0.05);
  }, [threatLevel]);

  useFrame(({ clock }) => {
    if (mesh.current) {
      mesh.current.rotation.y = clock.elapsedTime * cfg.speed * 0.3;
      if (threatLevel === "HIGH") {
        mesh.current.scale.setScalar(1 + Math.sin(clock.elapsedTime * 4) * 0.04);
      }
    }
  });

  // Build a slightly distorted sphere geometry based on threat
  const geometry = useMemo(() => {
    const geo = new THREE.SphereGeometry(1, 64, 64);
    const pos = geo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const y = pos.getY(i);
      const z = pos.getZ(i);
      const noise = (Math.random() - 0.5) * distort;
      pos.setXYZ(i, x + noise, y + noise, z + noise);
    }
    pos.needsUpdate = true;
    geo.computeVertexNormals();
    return geo;
  }, [distort]);

  return (
    <mesh ref={mesh} geometry={geometry}>
      <meshStandardMaterial
        color={cfg.color}
        emissive={cfg.emissive}
        emissiveIntensity={cfg.intensity}
        transparent
        opacity={0.85}
        wireframe={threatLevel === "HIGH"}
      />
    </mesh>
  );
}

export default function ThreatSphere3D({ threatLevel = "LOW" }) {
  return (
    <div className="w-full h-48 rounded-xl overflow-hidden">
      <Canvas camera={{ position: [0, 0, 3.5] }} gl={{ antialias: true }}>
        <ambientLight intensity={0.4} />
        <pointLight position={[3, 3, 3]} intensity={2} color={
          threatLevel === "HIGH" ? "#f87171" : threatLevel === "MEDIUM" ? "#facc15" : "#34d399"
        } />
        <pointLight position={[-3, -3, -3]} intensity={1} color="#a855f7" />
        <Sphere threatLevel={threatLevel} />
        <Particles count={80} color={
          threatLevel === "HIGH" ? "#f87171" : "#22d3ee"
        } active={threatLevel === "HIGH"} />
      </Canvas>
    </div>
  );
}