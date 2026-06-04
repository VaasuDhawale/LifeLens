import { Command, Orbit, Sparkles } from "lucide-react";
import { motion } from "framer-motion";

import { IndexingStatus } from "./IndexingStatus.jsx";

export function FloatingNav({ indexingStatus, onOpenCommand }) {
  return (
    <motion.header
      className="fixed left-1/2 top-5 z-40 flex w-[min(1120px,calc(100%-32px))] -translate-x-1/2 items-center justify-between rounded-lg border border-white/10 bg-ink-900/75 px-4 py-3 shadow-glass backdrop-blur-2xl"
      initial={{ opacity: 0, y: -18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
    >
      <div className="flex items-center gap-3">
        <div className="grid size-10 place-items-center rounded-xl bg-white/[0.06] text-aura-mint ring-1 ring-white/10">
          <Orbit className="size-5" />
        </div>
        <div className="leading-tight">
          <div className="flex items-center gap-2 text-sm font-semibold text-white">
            <span>LifeLens AI</span>
            <Sparkles className="size-3.5 text-aura-amber" />
          </div>
          <p className="text-xs text-zinc-500">Personal Search Engine</p>
        </div>
      </div>

      <div className="hidden items-center gap-3 md:flex">
        <IndexingStatus status={indexingStatus} />
        <button
          className="group flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.05] px-3 py-2 text-xs text-zinc-300 transition hover:border-aura-mint/40 hover:text-white"
          type="button"
          onClick={onOpenCommand}
        >
          <Command className="size-4" />
          <kbd className="rounded-md border border-white/10 bg-white/[0.06] px-1.5 py-0.5 text-[10px] text-zinc-400">
            Ctrl K
          </kbd>
        </button>
      </div>
    </motion.header>
  );
}
