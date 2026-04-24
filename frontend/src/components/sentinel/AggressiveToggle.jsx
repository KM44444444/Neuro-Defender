import { motion, AnimatePresence } from "framer-motion";
import { Zap, Shield } from "lucide-react";

export default function AggressiveToggle({ enabled, onToggle }) {
  return (
    <motion.button
      onClick={onToggle}
      whileTap={{ scale: 0.96 }}
      className={`
        relative flex items-center gap-3 px-4 py-2.5 rounded-xl border font-mono text-xs tracking-wider
        transition-all duration-300 select-none
        ${enabled
          ? "bg-neon-red/10 border-neon-red/50 text-neon-red glow-red"
          : "bg-muted/40 border-border text-muted-foreground hover:border-border/80"
        }
      `}
    >
      <AnimatePresence mode="wait">
        {enabled ? (
          <motion.div key="zap" initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }} className="flex items-center gap-2">
            <Zap className="w-3.5 h-3.5 fill-neon-red" />
            <span>AGGRESSIVE MODE</span>
            <motion.div
              className="w-2 h-2 rounded-full bg-neon-red"
              animate={{ opacity: [1, 0.3, 1] }}
              transition={{ duration: 0.8, repeat: Infinity }}
            />
          </motion.div>
        ) : (
          <motion.div key="shield" initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }} className="flex items-center gap-2">
            <Shield className="w-3.5 h-3.5" />
            <span>NORMAL MODE</span>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.button>
  );
}