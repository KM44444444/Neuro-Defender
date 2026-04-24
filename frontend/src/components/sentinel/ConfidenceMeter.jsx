import { motion } from "framer-motion";

export default function ConfidenceMeter({ value = 0, label = "Combined Score" }) {
  const percent = Math.round(value * 100);
  const getColor = () => {
    if (value < 0.4) return "#34d399";
    if (value <= 0.7) return "#facc15";
    return "#f87171";
  };
  const color = getColor();

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-sm text-muted-foreground font-mono">{label}</span>
        <motion.span
          key={percent}
          initial={{ opacity: 0, y: -5 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-2xl font-mono font-bold"
          style={{ color }}
        >
          {percent}%
        </motion.span>
      </div>
      <div className="relative h-3 rounded-full bg-muted overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${percent}%` }}
          transition={{ duration: 1.2, ease: "easeOut" }}
          className="absolute inset-y-0 left-0 rounded-full"
          style={{
            background: `linear-gradient(90deg, ${color}88, ${color})`,
            boxShadow: `0 0 12px ${color}66`,
          }}
        />
        {/* Scan line effect */}
        <motion.div
          animate={{ x: ["-100%", "400%"] }}
          transition={{ duration: 2, repeat: Infinity, ease: "linear", repeatDelay: 1 }}
          className="absolute inset-y-0 w-8 bg-gradient-to-r from-transparent via-white/20 to-transparent"
        />
      </div>
    </div>
  );
}