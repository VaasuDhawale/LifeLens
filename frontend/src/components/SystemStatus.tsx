import { AnimatePresence, motion } from "framer-motion";
import { Activity, AlertCircle, CheckCircle2, Database, Loader2 } from "lucide-react";
import { memo, useEffect, useRef, useState } from "react";

type SystemStatusProps = {
  online: boolean;
  checking: boolean;
  indexingState: string;
  indexedFiles: number;
  pendingFiles: number;
  message: string;
};

export const SystemStatus = memo(function SystemStatus({
  online,
  checking,
  indexingState,
  indexedFiles,
  pendingFiles,
  message,
}: SystemStatusProps) {
  const status = getStatus({ online, checking, indexingState, indexedFiles });
  const Icon = status.Icon;
  const active = checking || indexingState === "running";

  return (
    <motion.div
      className={`topbar-status flex min-w-0 items-center gap-2 rounded-full border px-2 py-2 text-xs shadow-soft backdrop-blur-xl sm:px-3 ${status.tone}`}
      title={message}
      role="status"
      aria-live="polite"
      aria-label={message}
      layout
      whileHover={{ y: -1 }}
      transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
    >
      <span className="relative grid size-7 shrink-0 place-items-center rounded-full border border-white/10 bg-black/20">
        <motion.span
          className={`absolute size-2 rounded-full ${status.dotClass}`}
          animate={{ scale: active ? [1, 1.45, 1] : [1, 1.2, 1], opacity: active ? [1, 0.55, 1] : [0.85, 1, 0.85] }}
          transition={{ duration: active ? 1.1 : 2.4, repeat: Infinity, ease: "easeInOut" }}
        />
        <Icon className={`relative size-3.5 ${active ? "animate-spin" : ""}`} />
      </span>

      <div className="hidden min-w-0 leading-tight min-[360px]:block">
        <div className="flex items-center gap-1.5 font-medium text-white">
          <AnimatePresence mode="wait" initial={false}>
            <motion.span
              key={status.label}
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -5 }}
              transition={{ duration: 0.18 }}
            >
              {status.label}
            </motion.span>
          </AnimatePresence>
          <span className="hidden text-zinc-600 sm:inline">/</span>
          <span className="hidden text-zinc-400 sm:inline">
            <AnimatedCounter value={indexedFiles} /> indexed
          </span>
        </div>
        <div className="hidden max-w-[220px] truncate text-[11px] text-zinc-500 md:block">
          {pendingFiles > 0 ? `${pendingFiles} pending - ${message}` : message}
        </div>
      </div>
    </motion.div>
  );
});

function AnimatedCounter({ value }: { value: number }) {
  const [displayValue, setDisplayValue] = useState(value);
  const previousValueRef = useRef(value);

  useEffect(() => {
    const from = previousValueRef.current;
    const to = value;

    if (from === to) {
      setDisplayValue(to);
      return;
    }

    let frame = 0;
    const start = window.performance.now();
    const duration = 520;

    function tick(now: number) {
      const progress = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplayValue(Math.round(from + (to - from) * eased));

      if (progress < 1) {
        frame = window.requestAnimationFrame(tick);
      } else {
        previousValueRef.current = to;
      }
    }

    frame = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(frame);
  }, [value]);

  return <motion.span layout="position">{displayValue.toLocaleString()}</motion.span>;
}

function getStatus({
  online,
  checking,
  indexingState,
  indexedFiles,
}: Pick<SystemStatusProps, "online" | "checking" | "indexingState" | "indexedFiles">) {
  if (checking || indexingState === "running") {
    return {
      Icon: Loader2,
      label: indexingState === "running" ? "Indexing" : "Checking",
      tone: "border-white/10 bg-white/[0.055] text-zinc-300",
      dotClass: "bg-aura-amber shadow-[0_0_16px_rgba(240,185,91,0.75)]",
    };
  }
  if (!online) {
    return {
      Icon: AlertCircle,
      label: "Offline",
      tone: "border-aura-rose/30 bg-aura-rose/10 text-aura-rose",
      dotClass: "bg-aura-rose shadow-[0_0_16px_rgba(237,122,134,0.75)]",
    };
  }
  if (indexedFiles === 0) {
    return {
      Icon: Database,
      label: "Ready",
      tone: "border-aura-amber/30 bg-aura-amber/10 text-aura-amber",
      dotClass: "bg-aura-amber shadow-[0_0_16px_rgba(240,185,91,0.75)]",
    };
  }
  if (indexingState === "idle") {
    return {
      Icon: CheckCircle2,
      label: "Synced",
      tone: "border-aura-mint/30 bg-aura-mint/10 text-aura-mint",
      dotClass: "bg-aura-mint shadow-[0_0_16px_rgba(126,231,209,0.75)]",
    };
  }
  return {
    Icon: Activity,
    label: "Active",
    tone: "border-aura-mint/30 bg-aura-mint/10 text-aura-mint",
    dotClass: "bg-aura-mint shadow-[0_0_16px_rgba(126,231,209,0.75)]",
  };
}
