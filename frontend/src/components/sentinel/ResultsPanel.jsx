import { motion } from "framer-motion";
import ThreatBadge from "./ThreatBadge";
import ConfidenceMeter from "./ConfidenceMeter";
import ScoresChart from "./ScoresChart";

export default function ResultsPanel({ results }) {
  if (!results) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="space-y-6"
    >
      {/* Threat Level + Confidence */}
      <div className="glass-card rounded-2xl p-6 space-y-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-sm font-mono text-muted-foreground tracking-widest uppercase mb-1">
              Detection Result
            </h2>
            <p className="text-xs text-muted-foreground/60 font-mono">
              {results.summary || (results.is_adversarial ? "Adversarial patterns detected" : "No adversarial patterns detected")}
            </p>
          </div>
          <ThreatBadge level={results.threat_level} />
        </div>

        <ConfidenceMeter value={results.confidence} label="Combined Threat Score" />

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <ScoreCard label="Pixel"         value={results.scores?.pixel          ?? results.scores?.confidence  ?? 0} color="#22d3ee" delay={0.10} />
          <ScoreCard label="LSB / Bits"    value={results.scores?.lsb            ?? 0}                               color="#f87171" delay={0.15} />
          <ScoreCard label="Frequency"     value={results.scores?.frequency      ?? results.scores?.blockEntropy ?? 0} color="#a855f7" delay={0.20} />
          <ScoreCard label="Edge/Texture"  value={results.scores?.edge           ?? results.scores?.edgeNoise   ?? 0} color="#facc15" delay={0.25} />
          <ScoreCard label="Noise"         value={results.scores?.noise          ?? results.scores?.channelCorr  ?? 0} color="#34d399" delay={0.30} />
          <ScoreCard label="Squeeze"       value={results.scores?.squeeze        ?? 0}                               color="#818cf8" delay={0.35} />
          <ScoreCard label="Reconstruct"   value={results.scores?.reconstruction ?? results.scores?.autoencoder ?? 0} color="#fb923c" delay={0.40} />
          <ScoreCard label="Metadata"      value={results.scores?.metadata       ?? 0}                               color="#38bdf8" delay={0.45} />
        </div>

        {results.meta?.sha256 && (
          <div className="rounded-lg border border-border/40 bg-muted/20 px-3 py-2">
            <p className="text-[10px] font-mono text-muted-foreground/70 tracking-wide uppercase">
              File fingerprint (sha256)
            </p>
            <p className="text-[11px] font-mono text-foreground/80 break-all">
              {results.meta.sha256}
            </p>
          </div>
        )}
      </div>

      {/* Charts */}
      <ScoresChart scores={results.scores} />
    </motion.div>
  );
}

function ScoreCard({ label, value, color, delay }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay }}
      className="glass-card rounded-xl p-4 text-center"
    >
      <p className="text-xs font-mono text-muted-foreground mb-2 tracking-wide uppercase">{label}</p>
      <p className="text-xl font-mono font-bold" style={{ color }}>
        {(value * 100).toFixed(1)}%
      </p>
    </motion.div>
  );
}