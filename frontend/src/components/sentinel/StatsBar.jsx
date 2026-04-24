import { motion } from "framer-motion";
import { Shield, Scan, Zap, AlertTriangle } from "lucide-react";

export default function StatsBar({ stats }) {
  const items = [
    { label: "Scans", value: stats.totalScans, Icon: Scan, color: "text-neon-cyan" },
    { label: "Threats", value: stats.threats, Icon: AlertTriangle, color: "text-neon-red" },
    { label: "Safe", value: stats.safe, Icon: Shield, color: "text-neon-green" },
    { label: "Attacks Sim", value: stats.attacks, Icon: Zap, color: "text-neon-purple" },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.15 }}
      className="grid grid-cols-2 md:grid-cols-4 gap-3"
    >
      {items.map((item, i) => (
        <motion.div
          key={item.label}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 + i * 0.05 }}
          className="glass-card rounded-xl p-4 flex items-center gap-3"
        >
          <div className={`p-2 rounded-lg bg-muted/50 ${item.color}`}>
            <item.Icon className="w-4 h-4" />
          </div>
          <div>
            <p className="text-xl font-mono font-bold text-foreground">{item.value}</p>
            <p className="text-[10px] font-mono text-muted-foreground tracking-wider uppercase">{item.label}</p>
          </div>
        </motion.div>
      ))}
    </motion.div>
  );
}