import { motion } from "framer-motion";
import {
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell,
} from "recharts";

const COLORS = ["#22d3ee", "#a855f7", "#34d399", "#facc15"];

export default function ScoresChart({ scores }) {
  if (!scores) return null;

  // Support both old field names (v2) and new forensic names (v3)
  const g = (key, fallback) => scores[key] ?? scores[fallback] ?? 0;

  const barData = [
    { name: "Pixel",       value: g("pixel",          "confidence"),  color: "#22d3ee" },
    { name: "LSB",         value: g("lsb",             "lsb"),         color: "#f87171" },
    { name: "Frequency",   value: g("frequency",       "blockEntropy"),color: "#a855f7" },
    { name: "Edge",        value: g("edge",            "edgeNoise"),   color: "#facc15" },
    { name: "Noise",       value: g("noise",           "channelCorr"), color: "#34d399" },
    { name: "Squeeze",     value: g("squeeze",         "squeeze"),     color: "#818cf8" },
    { name: "Reconstruct", value: g("reconstruction",  "autoencoder"), color: "#fb923c" },
    { name: "Metadata",    value: g("metadata",        "metadata"),    color: "#38bdf8" },
  ];

  const radarData = [
    { metric: "Pixel",      value: g("pixel",         "confidence")  * 100 },
    { metric: "LSB",        value: g("lsb",           "lsb")         * 100 },
    { metric: "Frequency",  value: g("frequency",     "blockEntropy")* 100 },
    { metric: "Edge",       value: g("edge",          "edgeNoise")   * 100 },
    { metric: "Noise",      value: g("noise",         "channelCorr") * 100 },
    { metric: "Squeeze",    value: g("squeeze",       "squeeze")     * 100 },
    { metric: "Reconstruct",value: g("reconstruction","autoencoder") * 100 },
    { metric: "Metadata",   value: g("metadata",      "metadata")    * 100 },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3 }}
      className="grid grid-cols-1 lg:grid-cols-2 gap-6"
    >
      {/* Bar Chart */}
      <div className="glass-card rounded-xl p-5">
        <h3 className="text-sm font-mono text-muted-foreground mb-4 tracking-wide uppercase">
          Score Breakdown
        </h3>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={barData} barSize={32}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(222,30%,18%)" />
            <XAxis
              dataKey="name"
              tick={{ fill: "hsl(215,20%,55%)", fontSize: 11, fontFamily: "JetBrains Mono" }}
              axisLine={{ stroke: "hsl(222,30%,18%)" }}
            />
            <YAxis
              domain={[0, 1]}
              tick={{ fill: "hsl(215,20%,55%)", fontSize: 11, fontFamily: "JetBrains Mono" }}
              axisLine={{ stroke: "hsl(222,30%,18%)" }}
            />
            <Tooltip
              contentStyle={{
                background: "hsl(222,47%,9%)",
                border: "1px solid hsl(222,30%,22%)",
                borderRadius: "8px",
                fontFamily: "JetBrains Mono",
                fontSize: "12px",
              }}
              formatter={(val) => [val.toFixed(4), "Score"]}
            />
            <Bar dataKey="value" radius={[6, 6, 0, 0]}>
              {barData.map((entry, i) => (
                <Cell key={i} fill={entry.color} fillOpacity={0.85} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Radar Chart */}
      <div className="glass-card rounded-xl p-5">
        <h3 className="text-sm font-mono text-muted-foreground mb-4 tracking-wide uppercase">
          Detection Radar
        </h3>
        <ResponsiveContainer width="100%" height={220}>
          <RadarChart data={radarData}>
            <PolarGrid stroke="hsl(222,30%,22%)" />
            <PolarAngleAxis
              dataKey="metric"
              tick={{ fill: "hsl(215,20%,55%)", fontSize: 11, fontFamily: "JetBrains Mono" }}
            />
            <PolarRadiusAxis
              domain={[0, 100]}
              tick={{ fill: "hsl(215,20%,40%)", fontSize: 9 }}
              axisLine={false}
            />
            <Radar
              dataKey="value"
              stroke="#22d3ee"
              fill="#22d3ee"
              fillOpacity={0.15}
              strokeWidth={2}
            />
          </RadarChart>
        </ResponsiveContainer>
      </div>
    </motion.div>
  );
}