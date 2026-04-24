import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Eye, EyeOff, ZoomIn } from "lucide-react";

export default function ImageComparison({ originalUrl, adversarialUrl, epsilon }) {
  const [hoveredSide, setHoveredSide] = useState(null);

  if (!originalUrl || !adversarialUrl) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
      className="glass-card rounded-2xl p-6 glow-purple"
    >
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-sm font-mono text-neon-purple tracking-widest uppercase flex items-center gap-2">
          <Eye className="w-4 h-4" />
          Image Comparison
        </h2>
        <span className="text-xs font-mono text-muted-foreground bg-muted/50 px-3 py-1 rounded-full">
          ε = {epsilon?.toFixed(3)}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {/* Original */}
        <div
          className="relative group cursor-zoom-in"
          onMouseEnter={() => setHoveredSide("original")}
          onMouseLeave={() => setHoveredSide(null)}
        >
          <div className="rounded-xl overflow-hidden border border-border bg-muted/20">
            <motion.img
              src={originalUrl}
              alt="Original"
              className="w-full h-48 object-contain"
              animate={{
                scale: hoveredSide === "original" ? 1.05 : 1,
              }}
              transition={{ duration: 0.3 }}
            />
          </div>
          <div className="flex items-center justify-center gap-1.5 mt-2">
            <div className="w-2 h-2 rounded-full bg-neon-green" />
            <span className="text-xs font-mono text-muted-foreground">Original</span>
          </div>
          <AnimatePresence>
            {hoveredSide === "original" && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute top-2 right-2 p-1.5 rounded-full bg-background/70 backdrop-blur-sm"
              >
                <ZoomIn className="w-3 h-3 text-neon-cyan" />
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Adversarial */}
        <div
          className="relative group cursor-zoom-in"
          onMouseEnter={() => setHoveredSide("adversarial")}
          onMouseLeave={() => setHoveredSide(null)}
        >
          <div className="rounded-xl overflow-hidden border border-neon-red/20 bg-muted/20">
            <motion.img
              src={adversarialUrl}
              alt="Adversarial"
              className="w-full h-48 object-contain"
              animate={{
                scale: hoveredSide === "adversarial" ? 1.05 : 1,
              }}
              transition={{ duration: 0.3 }}
            />
          </div>
          <div className="flex items-center justify-center gap-1.5 mt-2">
            <div className="w-2 h-2 rounded-full bg-neon-red" />
            <span className="text-xs font-mono text-muted-foreground">Adversarial</span>
          </div>
          <AnimatePresence>
            {hoveredSide === "adversarial" && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute top-2 right-2 p-1.5 rounded-full bg-background/70 backdrop-blur-sm"
              >
                <ZoomIn className="w-3 h-3 text-neon-red" />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  );
}