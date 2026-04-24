import { useState, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Upload, Image, X, Scan } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function UploadSection({ onImageLoaded, onAnalyze, isAnalyzing }) {
  const [preview, setPreview] = useState(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef(null);

  const handleFile = useCallback((file) => {
    if (!file || !file.type.startsWith("image/")) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      setPreview(e.target.result);
      const img = new window.Image();
      img.onload = () => onImageLoaded(img, e.target.result, file);
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  }, [onImageLoaded]);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files[0];
    handleFile(file);
  }, [handleFile]);

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const clearImage = () => {
    setPreview(null);
    onImageLoaded(null, null);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
      className="glass-card rounded-2xl p-6 glow-cyan"
    >
      <h2 className="text-sm font-mono text-neon-cyan tracking-widest uppercase mb-5 flex items-center gap-2">
        <Scan className="w-4 h-4" />
        Image Analysis
      </h2>

      <AnimatePresence mode="wait">
        {!preview ? (
          <motion.div
            key="dropzone"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={() => setIsDragOver(false)}
            onClick={() => fileInputRef.current?.click()}
            className={`
              relative cursor-pointer rounded-xl border-2 border-dashed transition-all duration-300
              flex flex-col items-center justify-center py-16 px-6
              ${isDragOver
                ? "border-neon-cyan bg-neon-cyan/5"
                : "border-border hover:border-neon-cyan/40 hover:bg-muted/30"
              }
            `}
          >
            <Upload className={`w-10 h-10 mb-4 transition-colors ${isDragOver ? "text-neon-cyan" : "text-muted-foreground"}`} />
            <p className="text-sm text-muted-foreground text-center">
              <span className="text-foreground font-medium">Drop an image here</span>
              <br />
              or click to browse
            </p>
            <p className="text-xs text-muted-foreground/60 mt-2">PNG, JPG, WEBP up to 10MB</p>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => handleFile(e.target.files[0])}
            />
          </motion.div>
        ) : (
          <motion.div
            key="preview"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="space-y-4"
          >
            <div className="relative group rounded-xl overflow-hidden bg-muted/30">
              <img
                src={preview}
                alt="Upload preview"
                className="w-full h-56 object-contain"
              />
              <button
                onClick={clearImage}
                className="absolute top-3 right-3 p-1.5 rounded-full bg-background/80 backdrop-blur-sm border border-border
                  opacity-0 group-hover:opacity-100 transition-opacity hover:bg-destructive/20 hover:border-destructive/30"
              >
                <X className="w-4 h-4" />
              </button>
              {/* Scan line overlay */}
              {isAnalyzing && (
                <div className="absolute inset-0 overflow-hidden pointer-events-none">
                  <motion.div
                    animate={{ y: ["-100%", "1000%"] }}
                    transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                    className="w-full h-1 bg-gradient-to-r from-transparent via-neon-cyan to-transparent opacity-60"
                  />
                </div>
              )}
            </div>

            <Button
              onClick={onAnalyze}
              disabled={isAnalyzing}
              className="w-full bg-neon-cyan/10 border border-neon-cyan/30 text-neon-cyan hover:bg-neon-cyan/20 
                font-mono tracking-wider h-12 glow-cyan disabled:opacity-50"
            >
              {isAnalyzing ? (
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                  className="w-5 h-5 border-2 border-neon-cyan/30 border-t-neon-cyan rounded-full"
                />
              ) : (
                <>
                  <Scan className="w-4 h-4 mr-2" />
                  ANALYZE IMAGE
                </>
              )}
            </Button>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}