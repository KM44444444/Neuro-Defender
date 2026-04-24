import { motion, AnimatePresence } from "framer-motion";
import { Activity, ShieldCheck, ShieldAlert, AlertTriangle, Clock } from "lucide-react";
import moment from "moment";

const icons = {
  safe: { Icon: ShieldCheck, color: "text-neon-green", dot: "bg-neon-green" },
  warning: { Icon: AlertTriangle, color: "text-neon-yellow", dot: "bg-neon-yellow" },
  threat: { Icon: ShieldAlert, color: "text-neon-red", dot: "bg-neon-red" },
  info: { Icon: Activity, color: "text-neon-cyan", dot: "bg-neon-cyan" },
};

export default function ActivityFeed({ logs }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.4 }}
      className="glass-card rounded-2xl p-6"
    >
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-sm font-mono text-muted-foreground tracking-widest uppercase flex items-center gap-2">
          <Activity className="w-4 h-4 text-neon-cyan" />
          Activity Feed
        </h2>
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full bg-neon-green animate-pulse" />
          <span className="text-[10px] font-mono text-muted-foreground">LIVE</span>
        </div>
      </div>

      <div className="space-y-1 max-h-64 overflow-y-auto pr-1">
        <AnimatePresence initial={false}>
          {logs.length === 0 && (
            <p className="text-xs text-muted-foreground/50 font-mono text-center py-8">
              No activity yet. Upload an image to begin.
            </p>
          )}
          {logs.map((log) => {
            const cfg = icons[log.type] || icons.info;
            return (
              <motion.div
                key={log.id}
                initial={{ opacity: 0, x: -20, height: 0 }}
                animate={{ opacity: 1, x: 0, height: "auto" }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ duration: 0.3 }}
                className="flex items-start gap-3 py-2.5 px-3 rounded-lg hover:bg-muted/30 transition-colors group"
              >
                <div className={`mt-0.5 p-1 rounded ${cfg.color} bg-muted/50`}>
                  <cfg.Icon className="w-3.5 h-3.5" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-mono text-foreground/90 truncate">{log.message}</p>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <Clock className="w-2.5 h-2.5 text-muted-foreground/40" />
                    <span className="text-[10px] font-mono text-muted-foreground/50">
                      {moment(log.timestamp).fromNow()}
                    </span>
                  </div>
                </div>
                <div className={`w-1.5 h-1.5 rounded-full mt-1.5 ${cfg.dot} opacity-60`} />
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}