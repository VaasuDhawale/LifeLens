import { AnimatePresence, motion } from "framer-motion";

import { staggerContainer } from "../animations/variants.js";
import { EmptyState } from "./EmptyState.jsx";
import { LoadingSkeleton } from "./LoadingSkeleton.jsx";
import { ResultCard } from "./ResultCard.jsx";

export function ResultGrid({
  results,
  selectedResult,
  isSearching,
  error,
  hasSearched,
  onSelectResult,
  onRunQuery,
}) {
  if (isSearching) {
    return <LoadingSkeleton />;
  }

  if (error) {
    return (
      <div className="rounded-lg border border-aura-rose/30 bg-aura-rose/10 p-6 text-sm text-aura-rose">
        {error}
      </div>
    );
  }

  if (!results.length) {
    return <EmptyState hasSearched={hasSearched} onRunQuery={onRunQuery} />;
  }

  return (
    <motion.div
      className="grid gap-4 md:grid-cols-2 xl:grid-cols-3"
      variants={staggerContainer}
      initial="initial"
      animate="animate"
      layout
    >
      <AnimatePresence mode="popLayout">
        {results.map((result) => (
          <ResultCard
            key={result.id}
            result={result}
            isSelected={selectedResult?.id === result.id}
            onSelect={() => onSelectResult(result)}
          />
        ))}
      </AnimatePresence>
    </motion.div>
  );
}
