import { useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { Canvas } from "@react-three/fiber";
import { Shield, Cpu, Eye } from "lucide-react";
import NeuralNetwork3D from "./NeuralNetwork3D";
import gsap from "gsap";

export default function HeroSection() {
  const titleRef = useRef(null);

  useEffect(() => {
    if (!titleRef.current) return;
    gsap.fromTo(
      titleRef.current.querySelectorAll(".char"),
      { opacity: 0, y: 30, rotationX: -90 },
      { opacity: 1, y: 0, rotationX: 0, stagger: 0.04, duration: 0.6, ease: "power3.out", delay: 0.3 }
    );
  }, []);

  const title = "NEURODEFENDER".split("");

  return (
    <div className="relative pt-10 pb-8 overflow-hidden">
      {/* 3D Background */}
      <div className="absolute inset-0 -z-10 opacity-70">
        <Canvas camera={{ position: [0, 0, 5], fov: 50 }} gl={{ antialias: true, alpha: true }}>
          <NeuralNetwork3D />
        </Canvas>
      </div>

      {/* Glow blobs */}
      <div className="absolute top-0 left-1/4 w-96 h-64 bg-neon-cyan/5 rounded-full blur-3xl -z-10" />
      <div className="absolute top-0 right-1/4 w-96 h-64 bg-neon-purple/5 rounded-full blur-3xl -z-10" />

      <div className="text-center relative z-10">
        {/* Badge */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-neon-cyan/10 border border-neon-cyan/20 mb-5"
        >
          <div className="w-1.5 h-1.5 rounded-full bg-neon-green animate-pulse" />
          <span className="text-xs font-mono text-neon-cyan tracking-widest">SYSTEM ONLINE</span>
        </motion.div>

        {/* Title */}
        <div ref={titleRef} className="flex justify-center gap-1 mb-3" style={{ perspective: "600px" }}>
          {title.map((ch, i) => (
            <span
              key={i}
              className={`char text-5xl md:text-7xl font-black font-mono tracking-tight text-glow-cyan inline-block
                ${ch === " " ? "w-6" : "text-foreground"}`}
              style={{ display: "inline-block" }}
            >
              {ch === " " ? "\u00A0" : ch}
            </span>
          ))}
        </div>

        {/* Subtitle */}
        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7, duration: 0.5 }}
          className="text-base font-mono text-muted-foreground tracking-widest mb-6"
        >
          NEURODEFENDER — REAL-TIME ADVERSARIAL DEFENSE SYSTEM
        </motion.p>

        {/* Feature pills */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.9 }}
          className="flex flex-wrap justify-center gap-3"
        >
          {[
            { icon: Shield, label: "Multi-Method Detection" },
            { icon: Cpu, label: "FGSM Simulation" },
            { icon: Eye, label: "Live Analysis" },
          ].map(({ icon: Icon, label }) => (
            <div key={label} className="flex items-center gap-1.5 text-xs font-mono text-muted-foreground/70 bg-muted/30 px-3 py-1.5 rounded-full border border-border/40">
              <Icon className="w-3 h-3 text-neon-cyan" />
              {label}
            </div>
          ))}
        </motion.div>
      </div>
    </div>
  );
}