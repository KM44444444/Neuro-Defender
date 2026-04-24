import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FileText, Zap, ShieldAlert, ShieldCheck, AlertTriangle, BarChart2 } from "lucide-react";
import { detectTextAdversarial } from "../../lib/textDetectionEngine";

const THREAT_CONFIG = {
  LOW:    { color: "text-neon-green",  bar: "bg-neon-green",  glow: "glow-green",  Icon: ShieldCheck },
  MEDIUM: { color: "text-neon-yellow", bar: "bg-neon-yellow", glow: "glow-yellow", Icon: AlertTriangle },
  HIGH:   { color: "text-neon-red",    bar: "bg-neon-red",    glow: "glow-red",    Icon: ShieldAlert },
};

function ScoreBar({ label, value, delay = 0 }) {
  const pct = Math.round((value || 0) * 100);
  const color = pct > 70 ? "bg-neon-red" : pct > 40 ? "bg-neon-yellow" : "bg-neon-green";

  return (
    <div className="space-y-1.5">
      <div className="flex justify-between items-center">
        <span className="text-xs font-mono text-muted-foreground">{label}</span>
        <span className="text-xs font-mono font-bold text-foreground">{(value || 0).toFixed(4)}</span>
      </div>
      <div className="h-1.5 w-full bg-muted/50 rounded-full overflow-hidden">
        <motion.div
          className={`h-full rounded-full ${color}`}
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.7, delay, ease: "easeOut" }}
        />
      </div>
    </div>
  );
}

export default function TextAnalysisPanel() {
  const [text, setText] = useState("");
  const [result, setResult] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const handleAnalyze = useCallback(async () => {
    if (!text.trim()) return;
    setIsAnalyzing(true);
    setResult(null);
    await new Promise((r) => setTimeout(r, 600)); // UX delay
    const res = await detectTextAdversarial(text);
    setResult(res);
    setIsAnalyzing(false);
  }, [text]);

  const cfg = result ? THREAT_CONFIG[result.threat_level] || THREAT_CONFIG.LOW : null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="glass-card rounded-2xl p-6 space-y-5"
    >
      {/* Header */}
      <div className="flex items-center gap-2">
        <FileText className="w-4 h-4 text-neon-cyan" />
        <h2 className="text-sm font-mono text-muted-foreground tracking-widest uppercase">
          Text Analysis
        </h2>
        <div className="ml-auto flex items-center gap-1.5">
          <div className="w-1.5 h-1.5 rounded-full bg-neon-cyan animate-pulse" />
          <span className="text-[10px] font-mono text-muted-foreground">NLP ENGINE</span>
        </div>
      </div>

      {/* Textarea */}
      <div className="relative">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Paste or type text to analyze for adversarial patterns..."
          maxLength={5000}
          rows={5}
          className="w-full bg-muted/30 border border-border/50 rounded-xl px-4 py-3 text-sm font-mono text-foreground placeholder:text-muted-foreground/40 resize-none outline-none focus:border-neon-cyan/50 focus:ring-1 focus:ring-neon-cyan/20 transition-all duration-200"
        />
        <span className="absolute bottom-2 right-3 text-[10px] font-mono text-muted-foreground/30">
          {text.length}/5000
        </span>
      </div>

      {/* Analyze Button */}
      <motion.button
        onClick={handleAnalyze}
        disabled={isAnalyzing || !text.trim()}
        whileTap={{ scale: 0.97 }}
        className={`w-full flex items-center justify-center gap-2 py-2.5 rounded-xl font-mono text-sm tracking-widest transition-all duration-200
          ${isAnalyzing || !text.trim()
            ? "bg-muted/30 text-muted-foreground cursor-not-allowed border border-border/30"
            : "bg-neon-cyan/10 hover:bg-neon-cyan/20 text-neon-cyan border border-neon-cyan/30 hover:border-neon-cyan/60"
          }`}
      >
        {isAnalyzing ? (
          <>
            <div className="w-3.5 h-3.5 border-2 border-neon-cyan/30 border-t-neon-cyan rounded-full animate-spin" />
            ANALYZING...
          </>
        ) : (
          <>
            <Zap className="w-3.5 h-3.5" />
            ANALYZE TEXT
          </>
        )}
      </motion.button>

      {/* Results */}
      <AnimatePresence>
        {result && cfg && (
          <motion.div
            key="results"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4 }}
            className="space-y-4"
          >
            {/* Threat Badge */}
            <div className={`flex items-center justify-between p-4 rounded-xl border ${
              result.threat_level === "HIGH"   ? "border-neon-red/30 bg-neon-red/5" :
              result.threat_level === "MEDIUM" ? "border-neon-yellow/30 bg-neon-yellow/5" :
                                                 "border-neon-green/30 bg-neon-green/5"
            }`}>
              <div className="flex items-center gap-3">
                <cfg.Icon className={`w-5 h-5 ${cfg.color}`} />
                <div>
                  <p className={`text-sm font-mono font-bold ${cfg.color}`}>
                    {result.threat_level} THREAT
                  </p>
                  <p className="text-xs font-mono text-muted-foreground mt-0.5">
                    {result.is_adversarial ? "Adversarial pattern detected" : "Input appears benign"}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className={`text-2xl font-black font-mono ${cfg.color}`}>
                  {(result.scores.combined * 100).toFixed(1)}
                  <span className="text-xs ml-0.5">%</span>
                </p>
                <p className="text-[10px] font-mono text-muted-foreground">COMBINED</p>
              </div>
            </div>

            {/* Summary */}
            {result.summary && (
              <p className="text-xs font-mono text-muted-foreground/80 bg-muted/20 rounded-lg px-3 py-2 border border-border/20">
                {result.summary}
              </p>
            )}

            {/* Score Bars */}
            <div className="space-y-3 pt-1">
              <div className="flex items-center gap-1.5 mb-3">
                <BarChart2 className="w-3.5 h-3.5 text-neon-cyan" />
                <span className="text-[10px] font-mono text-muted-foreground tracking-widest uppercase">Detection Scores</span>
              </div>
              <ScoreBar label="Obfuscation Anomaly"      value={result.scores.anomaly}      delay={0.0} />
              <ScoreBar label="Invisible / Zero-Width"   value={result.scores.invisible}    delay={0.05} />
              <ScoreBar label="Homoglyph Attack"         value={result.scores.homoglyph}    delay={0.1} />
              <ScoreBar label="Unicode Script Mixing"    value={result.scores.unicodeMix}   delay={0.15} />
              <ScoreBar label="Encoded Payload"          value={result.scores.encoded}      delay={0.2} />
              <ScoreBar label="Suspicious URLs"          value={result.scores.url}          delay={0.25} />
              <ScoreBar label="Confidence Anomaly"       value={result.scores.confidence}   delay={0.3} />
              <ScoreBar label="Perturbation Score"       value={result.scores.perturbation} delay={0.35} />
              <div className="pt-2 border-t border-border/30">
                <ScoreBar label="Combined Score" value={result.scores.combined} delay={0.4} />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}