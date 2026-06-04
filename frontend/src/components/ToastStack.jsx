import { CheckCircle2, Info, XCircle } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";

const ICONS = {
  success: CheckCircle2,
  error: XCircle,
  default: Info,
};

export function ToastStack({ toasts, onRemove }) {
  return (
    <div className="fixed bottom-5 right-5 z-50 grid gap-2">
      <AnimatePresence initial={false}>
        {toasts.map((toast) => {
          const Icon = ICONS[toast.tone] || Info;
          return (
            <motion.button
              className="flex min-w-72 items-center gap-3 rounded-lg border border-white/10 bg-ink-900/92 px-4 py-3 text-left text-sm text-zinc-200 shadow-glass backdrop-blur-2xl"
              key={toast.id}
              type="button"
              onClick={() => onRemove(toast.id)}
              initial={{ opacity: 0, y: 12, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.96 }}
            >
              <Icon className="size-5 text-aura-mint" />
              <span>{toast.message}</span>
            </motion.button>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
