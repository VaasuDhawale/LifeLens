import { Activity, CheckCircle2, Loader2 } from "lucide-react";
import { motion } from "framer-motion";

export function IndexingStatus({ status }) {
  const isRunning = status?.state === "running";
  const indexedFiles = status?.indexed_files ?? 0;
  const pendingFiles = status?.pending_files ?? 0;

  return (
    <div className="flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.05] px-3 py-2 text-xs text-zinc-300 shadow-soft backdrop-blur-xl">
      <span className="relative flex size-2.5">
        {isRunning && (
          <motion.span
            className="absolute inline-flex size-full rounded-full bg-aura-mint/60"
            animate={{ scale: [1, 1.9, 1], opacity: [0.8, 0, 0.8] }}
            transition={{ duration: 1.7, repeat: Infinity, ease: "easeInOut" }}
          />
        )}
        <span
          className={`relative inline-flex size-2.5 rounded-full ${
            isRunning ? "bg-aura-mint" : "bg-aura-green"
          }`}
        />
      </span>
      {isRunning ? <Loader2 className="size-3.5 animate-spin" /> : <CheckCircle2 className="size-3.5" />}
      <span>{isRunning ? `${pendingFiles} pending` : `${indexedFiles} indexed`}</span>
      <Activity className="size-3.5 text-aura-amber" />
    </div>
  );
}

