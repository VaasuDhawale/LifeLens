import { ArrowUpRight, Loader2, Search, X } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useMemo, useRef, useState } from "react";

import { SUGGESTED_SEARCHES, SMART_COLLECTIONS } from "../store/searchStore.js";
import { useKeyboardShortcuts } from "../hooks/useKeyboardShortcuts.js";

const PLACEHOLDERS = [
  "Find my Goa trip photos",
  "Search DBMS notes",
  "Find screenshots about AI",
  "Show final year project files",
];

export function HeroSearch({
  query,
  setQuery,
  isSearching,
  recentSearches,
  onSearch,
  onRunQuery,
}) {
  const [placeholderIndex, setPlaceholderIndex] = useState(0);
  const inputRef = useRef(null);

  useEffect(() => {
    const timer = window.setInterval(
      () => setPlaceholderIndex((index) => (index + 1) % PLACEHOLDERS.length),
      2600,
    );
    return () => window.clearInterval(timer);
  }, []);

  const shortcuts = useMemo(
    () => [
      {
        key: "/",
        handler: () => inputRef.current?.focus(),
      },
    ],
    [],
  );
  useKeyboardShortcuts(shortcuts);

  const suggestions = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    const source = [
      ...recentSearches,
      ...SUGGESTED_SEARCHES,
      ...SMART_COLLECTIONS.map((collection) => collection.query),
    ];

    if (!normalizedQuery) {
      return source.slice(0, 5);
    }

    return source
      .filter((suggestion) => suggestion.toLowerCase().includes(normalizedQuery))
      .slice(0, 5);
  }, [query, recentSearches]);

  function handleSubmit(event) {
    event.preventDefault();
    onSearch();
  }

  return (
    <section className="mx-auto flex w-full max-w-5xl flex-col items-center px-4 pt-36 text-center lg:pt-40">
      <motion.div
        className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.05] px-4 py-2 text-sm text-zinc-300 shadow-soft backdrop-blur-xl"
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45 }}
      >
        <span className="size-2 rounded-full bg-aura-mint shadow-glow" />
        <span>Search your digital life</span>
      </motion.div>

      <motion.h1
        className="max-w-4xl text-balance text-4xl font-semibold text-white md:text-6xl"
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.55, delay: 0.04 }}
      >
        One intelligent search layer for every file you own.
      </motion.h1>

      <motion.form
        className="relative mt-10 w-full"
        onSubmit={handleSubmit}
        initial={{ opacity: 0, y: 20, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.55, delay: 0.1 }}
      >
        <div className="group relative grid min-h-[76px] grid-cols-[auto_1fr_auto_auto] items-center gap-3 rounded-[28px] border border-white/10 bg-white/[0.07] p-3 shadow-glass backdrop-blur-2xl transition focus-within:border-aura-mint/60 focus-within:shadow-glow">
          <Search className="ml-3 size-6 text-aura-mint" />
          <label className="sr-only" htmlFor="life-search-input">
            Search
          </label>
          <div className="relative min-w-0 text-left">
            <input
              ref={inputRef}
              id="life-search-input"
              className="peer h-12 w-full min-w-0 bg-transparent text-lg text-white outline-none placeholder:text-transparent md:text-xl"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              autoComplete="off"
            />
            {!query && (
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center overflow-hidden text-lg text-zinc-500 md:text-xl">
                <AnimatePresence mode="wait">
                  <motion.span
                    key={PLACEHOLDERS[placeholderIndex]}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.24 }}
                  >
                    {PLACEHOLDERS[placeholderIndex]}
                  </motion.span>
                </AnimatePresence>
              </div>
            )}
          </div>
          {query && (
            <button
              className="grid size-10 place-items-center rounded-full text-zinc-400 transition hover:bg-white/10 hover:text-white"
              type="button"
              aria-label="Clear search"
              onClick={() => setQuery("")}
            >
              <X className="size-5" />
            </button>
          )}
          <motion.button
            className="flex h-12 min-w-28 items-center justify-center gap-2 rounded-lg bg-aura-mint px-5 font-semibold text-ink-950 shadow-glow transition disabled:cursor-wait disabled:opacity-70"
            type="submit"
            disabled={isSearching}
            whileHover={{ y: -1 }}
            whileTap={{ scale: 0.98 }}
          >
            {isSearching ? <Loader2 className="size-5 animate-spin" /> : <ArrowUpRight className="size-5" />}
            <span>Search</span>
          </motion.button>
        </div>

        <AnimatePresence>
          {query && suggestions.length > 0 && (
            <motion.div
              className="absolute left-0 right-0 top-[88px] z-20 overflow-hidden rounded-lg border border-white/10 bg-ink-900/92 p-2 text-left shadow-glass backdrop-blur-2xl"
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
            >
              {suggestions.map((suggestion) => (
                <button
                  className="flex w-full items-center gap-3 rounded-lg px-4 py-3 text-sm text-zinc-300 transition hover:bg-white/[0.06] hover:text-white"
                  key={suggestion}
                  type="button"
                  onClick={() => onRunQuery(suggestion)}
                >
                  <Search className="size-4 text-aura-mint" />
                  <span>{suggestion}</span>
                </button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.form>
    </section>
  );
}
