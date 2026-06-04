import { Search, Sparkles } from "lucide-react";
import { motion } from "framer-motion";

export function EmptyState({ hasSearched, onRunQuery }) {
  return (
    <motion.div
      className="grid min-h-72 place-items-center rounded-lg border border-white/10 bg-white/[0.04] p-8 text-center shadow-soft backdrop-blur-xl"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <div>
        <div className="mx-auto mb-5 grid size-16 place-items-center rounded-lg bg-aura-mint/10 text-aura-mint ring-1 ring-aura-mint/20">
          {hasSearched ? <Search className="size-7" /> : <Sparkles className="size-7" />}
        </div>
        <h3 className="text-lg font-semibold text-white">
          {hasSearched ? "No files surfaced" : "Your search canvas is ready"}
        </h3>
        <div className="mt-5 flex flex-wrap justify-center gap-2">
          {["Final year project", "Goa photos", "DBMS notes"].map((query) => (
            <button
              className="rounded-full border border-white/10 bg-white/[0.05] px-3 py-2 text-xs text-zinc-300 transition hover:border-aura-mint/40 hover:text-white"
              key={query}
              type="button"
              onClick={() => onRunQuery(query)}
            >
              {query}
            </button>
          ))}
        </div>
      </div>
    </motion.div>
  );
}
