import { motion } from "framer-motion";
import { ShieldAlert, ShieldCheck, AlertTriangle } from "lucide-react";

const config = {
  SAFE: {
    label: "SAFE",
    color: "text-neon-cyan",
    bg: "bg-neon-cyan/10",
    border: "border-neon-cyan/30",
    glow: "glow-cyan",
    Icon: ShieldCheck,
  },
  LOW: {
    label: "LOW THREAT",
    color: "text-neon-green",
    bg: "bg-neon-green/10",
    border: "border-neon-green/30",
    glow: "glow-green",
    Icon: ShieldCheck,
  },
  MEDIUM: {
    label: "MEDIUM THREAT",
    color: "text-neon-yellow",
    bg: "bg-neon-yellow/10",
    border: "border-neon-yellow/30",
    glow: "glow-yellow",
    Icon: AlertTriangle,
  },
  HIGH: {
    label: "HIGH THREAT",
    color: "text-neon-red",
    bg: "bg-neon-red/10",
    border: "border-neon-red/30",
    glow: "glow-red",
    Icon: ShieldAlert,
  },
};

export default function ThreatBadge({ level }) {
  const c = config[level] || config.SAFE;

  return (
    <motion.div
      initial={{ scale: 0.8, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: "spring", stiffness: 300, damping: 20 }}
      className={`inline-flex items-center gap-2.5 px-5 py-2.5 rounded-full ${c.bg} ${c.border} border ${c.glow}`}
    >
      <c.Icon className={`w-5 h-5 ${c.color}`} />
      <span className={`text-sm font-mono font-bold tracking-widest ${c.color}`}>
        {c.label}
      </span>
    </motion.div>
  );
}