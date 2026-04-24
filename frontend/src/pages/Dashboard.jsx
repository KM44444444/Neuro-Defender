import { useState, useCallback } from "react";
import { motion } from "framer-motion";
import AnimatedBackground from "../components/sentinel/AnimatedBackground";
import HeroSection from "../components/sentinel/HeroSection";
import UploadSection from "../components/sentinel/UploadSection";
import ResultsPanel from "../components/sentinel/ResultsPanel";
import TiltCard from "../components/sentinel/TiltCard";
import AggressiveToggle from "../components/sentinel/AggressiveToggle";
import ThreatSphere3D from "../components/sentinel/ThreatSphere3D";
import ActivityFeed from "../components/sentinel/ActivityFeed";
import StatsBar from "../components/sentinel/StatsBar";
import TextAnalysisPanel from "../components/sentinel/TextAnalysisPanel";
import { detectAdversarial } from "../lib/detectEngine";

let logIdCounter = 0;

export default function Dashboard() {
  const [imageEl, setImageEl] = useState(null);
  const [imageUrl, setImageUrl] = useState(null);
  const [imageFile, setImageFile] = useState(null);
  const [results, setResults] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [comparison, setComparison] = useState(null);
  const [logs, setLogs] = useState([]);
  const [stats, setStats] = useState({ totalScans: 0, threats: 0, safe: 0, attacks: 0 });
  const [aggressiveMode, setAggressiveMode] = useState(false);
  const [activeTab, setActiveTab] = useState("image"); // "image" | "text"

  const addLog = useCallback((type, message) => {
    const newLog = { id: ++logIdCounter, type, message, timestamp: new Date() };
    setLogs((prev) => [newLog, ...prev].slice(0, 50));
  }, []);

  const handleImageLoaded = useCallback((img, url, file = null) => {
    setImageEl(img);
    setImageUrl(url);
    setImageFile(file);
    setResults(null);
    setComparison(null);
    if (img) {
      addLog("info", "Image loaded — ready for analysis");
    }
  }, [addLog]);



  const handleAnalyze = useCallback(async () => {
    if (!imageEl) return;
    setIsAnalyzing(true);
    addLog("info", "Starting multi-method adversarial detection...");

    // Simulate processing delay for UX
    await new Promise((r) => setTimeout(r, 1200));

    try {
      const result = await detectAdversarial(imageEl, imageFile);
      setResults(result);

      setStats((prev) => ({
        ...prev,
        totalScans: prev.totalScans + 1,
        threats: prev.threats + (result.is_adversarial ? 1 : 0),
        safe: prev.safe + (!result.is_adversarial ? 1 : 0),
      }));

      if (result.is_adversarial) {
        addLog(
          result.threat_level === "HIGH" ? "threat" : "warning",
          `Adversarial pattern detected — ${result.threat_level} threat (${(result.confidence * 100).toFixed(1)}%)`
        );
      } else {
        addLog("safe", `Image classified as safe (score: ${(result.confidence * 100).toFixed(1)}%)`);
      }
    } catch (err) {
      console.error(err);
      addLog("threat", `Analysis failed: ${err.message}`);
    } finally {
      setIsAnalyzing(false);
    }
  }, [imageEl, imageFile, addLog]);

  return (
    <div className="min-h-screen relative overflow-x-hidden">
      <AnimatedBackground />

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-16">
        <HeroSection />

        {/* Tab Switcher */}
        <div className="flex items-center gap-2 mb-4">
          {[{ id: "image", label: "Image Analysis" }, { id: "text", label: "Text Analysis" }].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-5 py-2 rounded-xl font-mono text-xs tracking-widest border transition-all duration-200
                ${activeTab === tab.id
                  ? "bg-neon-cyan/10 border-neon-cyan/50 text-neon-cyan"
                  : "bg-muted/20 border-border/30 text-muted-foreground hover:border-border/60"
                }`}
            >
              {tab.label.toUpperCase()}
            </button>
          ))}
          <div className="ml-auto flex justify-end">
            <AggressiveToggle enabled={aggressiveMode} onToggle={() => setAggressiveMode(v => !v)} />
          </div>
        </div>

        <StatsBar stats={stats} />

        {activeTab === "text" ? (
          <motion.div
            key="text-tab"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35 }}
            className="mt-8 max-w-3xl mx-auto"
          >
            <TextAnalysisPanel />
          </motion.div>
        ) : (
          <div className="mt-8 grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left Column — Upload + Attack */}
            <div className="lg:col-span-4 space-y-6">
              <TiltCard>
                <UploadSection
                  onImageLoaded={handleImageLoaded}
                  onAnalyze={handleAnalyze}
                  isAnalyzing={isAnalyzing}
                />
              </TiltCard>
              <ActivityFeed logs={logs} />
            </div>

            {/* Right Column — Results + Comparison */}
            <div className="lg:col-span-8 space-y-6">
              {results && (
                <ThreatSphere3D threatLevel={results.threat_level || "LOW"} />
              )}
              {results && <ResultsPanel results={results} />}
            </div>
          </div>
        )}

        {/* Footer */}
        <motion.footer
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1 }}
          className="mt-16 text-center text-xs font-mono text-muted-foreground/30 border-t border-border/30 pt-6"
        >
          NEURODEFENDER v1.0 — Adversarial Attack Detection System
        </motion.footer>
      </div>
    </div>
  );
}