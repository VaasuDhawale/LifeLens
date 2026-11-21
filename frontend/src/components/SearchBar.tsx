import { AnimatePresence, motion } from "framer-motion";
import { Keyboard, Loader2, Search, Sparkles, X } from "lucide-react";
import { type FormEvent, memo, useEffect, useMemo, useRef, useState } from "react";

import type { SearchMode } from "../services/api.ts";

const PLACEHOLDERS = [
  "Find my DBMS notes",
  "Goa trip photos",
  "DAX formulas",
  "AI project files",
];

const MODE_PLACEHOLDERS: Record<SearchMode, string[]> = {
  exact: [
    "DAX formulas",
    "Find my DBMS notes",
    "AI project files",
    "invoice march 2026",
  ],
  keyword: [
    "DAX",
    "Power BI",
    "ऑक्टोबर",
    "Hinglish",
  ],
  hybrid: PLACEHOLDERS,
  semantic: [
    "photos from a beach vacation",
    "documents about database theory",
    "screenshots with neural networks",
    "study material for upcoming exams",
  ],
};

const SMART_SUGGESTIONS = [
  {
    query: "Find screenshots about AI",
    reason: "Image OCR + filename signals",
    keywords: ["ai", "screenshot", "screenshots", "image", "png", "jpg"],
  },
  {
    query: "Search DBMS notes",
    reason: "Notes, PDFs, and extracted text",
    keywords: ["dbms", "database", "notes", "pdf", "study"],
  },
  {
    query: "Show final year project files",
    reason: "Project names and related documents",
    keywords: ["project", "final", "year", "report", "presentation"],
  },
  {
    query: "Find DAX formulas",
    reason: "Exact keyword matching across content",
    keywords: ["dax", "formula", "power", "bi", "measure"],
  },
  {
    query: "Travel photos from Goa",
    reason: "Visual embeddings + filename context",
    keywords: ["goa", "trip", "travel", "photo", "photos", "vacation"],
  },
  {
    query: "PDFs mentioning machine learning",
    reason: "Full document text extraction",
    keywords: ["machine", "learning", "ml", "pdf", "ai"],
  },
];

const THINKING_STEPS = [
  "Reading filename signals",
  "Scanning extracted text",
  "Comparing visual embeddings",
  "Ranking exact matches first",
  "Refining semantic context",
];

type SearchBarProps = {
  query: string;
  threshold: number;
  mode: SearchMode;
  busy: boolean;
  loading: boolean;
  onQueryChange: (query: string) => void;
  onThresholdChange: (threshold: number) => void;
  onModeChange: (mode: SearchMode) => void;
  onSubmit: (query?: string) => void;
};

const SEARCH_MODES: Array<{ id: SearchMode; label: string; description: string }> = [
  {
    id: "exact",
    label: "Exact",
    description: "Only ranks literal filename and extracted content matches.",
  },
  {
    id: "keyword",
    label: "Keyword",
    description: "Unicode-aware tokenized keyword search with script preservation.",
  },
  {
    id: "hybrid",
    label: "Hybrid",
    description: "Combines keyword accuracy with semantic context.",
  },
  {
    id: "semantic",
    label: "Semantic",
    description: "Uses embedding similarity to discover related meaning.",
  },
];

export const SearchBar = memo(function SearchBar({
  query,
  threshold,
  mode,
  busy,
  loading,
  onQueryChange,
  onThresholdChange,
  onModeChange,
  onSubmit,
}: SearchBarProps) {
  const [placeholderIndex, setPlaceholderIndex] = useState(0);
  const [focused, setFocused] = useState(false);
  const [thinkingIndex, setThinkingIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const isExactMode = mode === "exact";
  const placeholderExamples = MODE_PLACEHOLDERS[mode] || PLACEHOLDERS;
  const activePlaceholder = placeholderExamples[placeholderIndex % placeholderExamples.length];
  const typedPlaceholder = useTypewriterText(activePlaceholder);
  const activeMode = SEARCH_MODES.find((item) => item.id === mode) || SEARCH_MODES[1];

  useEffect(() => {
    const timer = window.setInterval(
      () => setPlaceholderIndex((index) => (index + 1) % placeholderExamples.length),
      focused ? 3400 : 2800,
    );

    return () => window.clearInterval(timer);
  }, [focused, placeholderExamples.length]);

  useEffect(() => {
    setPlaceholderIndex(0);
  }, [mode]);

  useEffect(() => {
    if (!busy) {
      setThinkingIndex(0);
      return;
    }

    const timer = window.setInterval(
      () => setThinkingIndex((index) => (index + 1) % THINKING_STEPS.length),
      1150,
    );

    return () => window.clearInterval(timer);
  }, [busy]);

  useEffect(() => {
    function handleShortcut(event: KeyboardEvent) {
      const isSearchShortcut =
        (event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k";

      if (!isSearchShortcut) {
        return;
      }

      event.preventDefault();
      inputRef.current?.focus();
      inputRef.current?.select();
    }

    window.addEventListener("keydown", handleShortcut);
    return () => window.removeEventListener("keydown", handleShortcut);
  }, []);

  const suggestions = useMemo(() => {
    return buildSmartSuggestions(query, mode);
  }, [mode, query]);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onSubmit(query);
  }

  return (
    <div className="relative mx-auto w-full max-w-4xl">
      <motion.form
        className="relative z-10"
        aria-label="AI personal file search"
        onSubmit={handleSubmit}
        initial={{ opacity: 0, y: 18, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.42, ease: [0.22, 1, 0.36, 1] }}
      >
        <motion.div
          className="premium-search-shell group relative isolate grid min-h-16 grid-cols-[auto_minmax(0,1fr)_auto_auto] items-center gap-1.5 overflow-hidden rounded-[24px] border border-white/10 bg-ink-900/70 p-1.5 shadow-glass backdrop-blur-2xl transition sm:min-h-[80px] sm:gap-3 sm:rounded-[30px] sm:p-3"
          aria-busy={busy}
          data-focused={focused ? "true" : "false"}
          data-thinking={busy ? "true" : "false"}
          animate={{ y: focused ? -2 : 0, scale: focused ? 1.01 : 1 }}
          transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
        >
          <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(115deg,rgba(255,255,255,0.12),transparent_28%,rgba(126,231,209,0.08)_52%,transparent_78%)] opacity-60" />
          <motion.div
            className="relative z-10 ml-1 grid size-10 place-items-center rounded-lg border border-white/10 bg-white/[0.07] text-aura-mint shadow-soft sm:ml-2 sm:size-12"
            animate={
              busy
                ? { rotate: [0, -5, 5, 0], scale: [1, 1.08, 1] }
                : { rotate: focused ? -3 : 0, scale: focused ? 1.05 : 1 }
            }
            transition={
              busy
                ? { duration: 1.35, repeat: Infinity, ease: "easeInOut" }
                : { duration: 0.24, ease: [0.22, 1, 0.36, 1] }
            }
          >
            <Search className="size-4 sm:size-6" />
          </motion.div>
          <label className="sr-only" htmlFor="ai-search-input">
            Search files
          </label>
          <div className="relative z-10 min-w-0 text-left">
            <input
              id="ai-search-input"
              ref={inputRef}
              className="h-10 w-full min-w-0 bg-transparent text-base font-medium text-white outline-none placeholder:text-transparent sm:h-12 sm:text-lg md:text-xl"
              value={query}
              autoComplete="off"
              spellCheck={false}
              onFocus={() => setFocused(true)}
              onBlur={() => setFocused(false)}
              onChange={(event) => onQueryChange(event.target.value)}
            />
            {!query && (
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center overflow-hidden text-sm text-zinc-500 min-[380px]:text-base sm:text-lg md:text-xl">
                <span className="mr-2 hidden rounded-full border border-white/10 bg-white/[0.055] px-2 py-1 text-xs font-medium text-zinc-400 sm:inline-flex">
                  Try
                </span>
                <AnimatePresence mode="wait">
                  <motion.span
                    className="block truncate"
                    key={activePlaceholder}
                    initial={{ opacity: 0, y: 12, filter: "blur(6px)" }}
                    animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                    exit={{ opacity: 0, y: -12, filter: "blur(6px)" }}
                    transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
                  >
                    {typedPlaceholder}
                  </motion.span>
                </AnimatePresence>
                <motion.span
                  className="ml-2 h-5 w-px bg-aura-mint/70"
                  animate={{ opacity: [0.2, 1, 0.2] }}
                  transition={{ duration: 1.2, repeat: Infinity, ease: "easeInOut" }}
                />
              </div>
            )}
          </div>

          <div className="relative z-10 hidden min-w-[88px] items-center justify-end sm:flex">
            <AnimatePresence mode="wait">
              {busy ? (
                <motion.div
                  className="flex items-center gap-2 rounded-lg border border-aura-mint/20 bg-aura-mint/10 px-3 py-2 text-xs font-medium text-aura-mint"
                  key="searching"
                  initial={{ opacity: 0, x: 8 }}
                  animate={{ opacity: 1, x: 0, scale: [1, 1.03, 1] }}
                  exit={{ opacity: 0, x: 8 }}
                  transition={{ duration: 0.22, scale: { duration: 1.6, repeat: Infinity } }}
                >
                  <Loader2 className="size-3.5 animate-spin" />
                  <span>Thinking</span>
                </motion.div>
              ) : query ? (
                <motion.button
                  className="grid size-10 place-items-center rounded-lg border border-white/10 text-zinc-400 transition hover:bg-white/10 hover:text-white"
                  key="clear"
                  type="button"
                  aria-label="Clear search"
                  onClick={() => onQueryChange("")}
                  initial={{ opacity: 0, x: 8 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 8 }}
                  whileTap={{ scale: 0.96 }}
                >
                  <X className="size-5" />
                </motion.button>
              ) : (
                <motion.div
                  className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-xs text-zinc-400"
                  key="shortcut"
                  initial={{ opacity: 0, x: 8 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 8 }}
                >
                  <Keyboard className="size-3.5 text-aura-mint" />
                  <kbd className="font-medium text-zinc-300">Ctrl</kbd>
                  <span>+</span>
                  <kbd className="font-medium text-zinc-300">K</kbd>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {query && (
            <motion.button
              className="relative z-10 grid size-10 place-items-center rounded-lg text-zinc-400 transition hover:bg-white/10 hover:text-white sm:hidden"
              type="button"
              aria-label="Clear search"
              onClick={() => onQueryChange("")}
              initial={{ opacity: 0, scale: 0.92 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.92 }}
              whileTap={{ scale: 0.94 }}
            >
              <X className="size-5" />
            </motion.button>
          )}

          <motion.button
            className="relative z-10 grid size-10 place-items-center overflow-hidden rounded-lg bg-aura-mint text-ink-950 shadow-glow transition disabled:cursor-wait disabled:opacity-75 sm:size-12"
            type="submit"
            aria-label="Search"
            disabled={loading}
            whileHover={{ y: -1, scale: 1.03 }}
            whileTap={{ scale: 0.98 }}
          >
            <span className="search-button-shine absolute inset-0" />
            <AnimatePresence mode="wait" initial={false}>
              {busy ? (
                <motion.span
                  key="loading"
                  initial={{ opacity: 0, rotate: -20, scale: 0.82 }}
                  animate={{ opacity: 1, rotate: 0, scale: 1 }}
                  exit={{ opacity: 0, rotate: 20, scale: 0.82 }}
                  className="relative z-10"
                >
                  <Loader2 className="size-5 animate-spin" />
                </motion.span>
              ) : (
                <motion.span
                  key="ready"
                  initial={{ opacity: 0, x: -4, scale: 0.9 }}
                  animate={{ opacity: 1, x: 0, scale: 1 }}
                  exit={{ opacity: 0, x: 4, scale: 0.9 }}
                  className="relative z-10"
                >
                  <Sparkles className="size-5" />
                </motion.span>
              )}
            </AnimatePresence>
          </motion.button>
          <AnimatePresence>
            {busy && (
              <motion.div
                className="absolute bottom-0 left-6 right-6 z-10 h-px origin-left bg-[linear-gradient(90deg,transparent,rgba(126,231,209,0.95),rgba(240,185,91,0.8),transparent)]"
                initial={{ opacity: 0, scaleX: 0.2, x: "-20%" }}
                animate={{ opacity: 1, scaleX: [0.2, 1, 0.2], x: ["-20%", "20%", "100%"] }}
                exit={{ opacity: 0, scaleX: 0.2 }}
                transition={{ duration: 1.35, repeat: Infinity, ease: "easeInOut" }}
              />
            )}
          </AnimatePresence>
        </motion.div>
      </motion.form>

      <AnimatePresence>
        {busy && (
          <motion.div
            className="ai-thinking-panel mt-3 overflow-hidden rounded-lg border border-aura-mint/20 bg-ink-900/70 p-3 text-left shadow-soft backdrop-blur-2xl"
            role="status"
            aria-live="polite"
            initial={{ opacity: 0, y: -8, height: 0 }}
            animate={{ opacity: 1, y: 0, height: "auto" }}
            exit={{ opacity: 0, y: -8, height: 0 }}
            transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
          >
            <div className="flex items-center gap-3">
              <ThinkingGlyph />
              <div className="min-w-0">
                <div className="flex items-center gap-2 text-xs font-semibold text-white">
                  <Sparkles className="size-3.5 text-aura-mint" />
                  <span>AI search is reasoning</span>
                </div>
                <AnimatePresence mode="wait" initial={false}>
                  <motion.div
                    className="mt-1 text-xs text-zinc-500"
                    key={THINKING_STEPS[thinkingIndex]}
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -5 }}
                    transition={{ duration: 0.2 }}
                  >
                    {THINKING_STEPS[thinkingIndex]}
                  </motion.div>
                </AnimatePresence>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.div
        className="threshold-panel mt-4 grid gap-4 rounded-lg border border-white/10 bg-ink-950/62 p-3 text-left shadow-soft backdrop-blur-2xl sm:p-4 lg:grid-cols-[minmax(0,270px)_1fr_auto] lg:items-center"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.36, delay: 0.08, ease: [0.22, 1, 0.36, 1] }}
      >
        <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center lg:block">
          <div className="min-w-0">
            <label className="block text-sm font-semibold text-white" htmlFor="similarity-threshold">
              Similarity Threshold
            </label>
            <p className="mt-1 text-xs leading-5 text-zinc-500">
              {isExactMode ? "Exact keyword search is active." : activeMode.description}
            </p>
          </div>
          <div
            className="relative inline-grid grid-cols-4 rounded-lg border border-white/10 bg-black/25 p-1"
            role="group"
            aria-label="Search ranking mode"
          >
            {SEARCH_MODES.map((item) => (
              <motion.button
                className={`group/mode relative min-h-10 rounded-md px-2.5 py-2 text-xs font-medium transition sm:px-3 ${
                  mode === item.id
                    ? "bg-aura-mint text-ink-950 shadow-glow"
                    : "text-zinc-400 hover:bg-white/[0.07] hover:text-white"
                }`}
                key={item.id}
                layout
                title={item.description}
                type="button"
                aria-label={`${item.label} mode. ${item.description}`}
                aria-pressed={mode === item.id}
                onClick={() => onModeChange(item.id)}
                whileHover={{ y: -1 }}
                whileTap={{ scale: 0.96 }}
                transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
              >
                {item.label}
                <span className="pointer-events-none absolute left-1/2 top-[calc(100%+10px)] z-30 hidden w-56 -translate-x-1/2 rounded-lg border border-white/10 bg-ink-900/95 px-3 py-2 text-left text-[11px] font-normal leading-5 text-zinc-300 shadow-glass backdrop-blur-xl group-hover/mode:block">
                  {item.description}
                </span>
              </motion.button>
            ))}
          </div>
        </div>

        <div className="min-w-0" aria-disabled={isExactMode}>
          <div className="mb-2 flex items-center justify-between gap-3">
            <span className="text-xs font-medium text-zinc-400">Strict Search</span>
            <AnimatePresence mode="wait" initial={false}>
              {isExactMode ? (
                <motion.span
                  className="rounded-full border border-aura-amber/30 bg-aura-amber/10 px-2.5 py-1 text-[11px] font-medium text-aura-amber"
                  key="exact-disabled"
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -5 }}
                >
                  Threshold disabled in Exact Mode
                </motion.span>
              ) : (
                <motion.span
                  className="rounded-full border border-aura-mint/30 bg-aura-mint/10 px-2.5 py-1 text-[11px] font-medium text-aura-mint"
                  key="threshold-value"
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -5 }}
                >
                  {threshold.toFixed(2)}
                </motion.span>
              )}
            </AnimatePresence>
          </div>
          <input
            id="similarity-threshold"
            className={`premium-range h-3 w-full touch-pan-x appearance-none rounded-full bg-white/10 accent-aura-mint ${
              isExactMode ? "cursor-not-allowed opacity-45" : "cursor-pointer"
            }`}
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={threshold}
            disabled={isExactMode}
            aria-valuemin={0}
            aria-valuemax={1}
            aria-valuenow={threshold}
            aria-valuetext={`${Math.round(threshold * 100)} percent similarity`}
            onChange={(event) => onThresholdChange(Number(event.target.value))}
            style={{
              background: isExactMode
                ? "rgba(255,255,255,0.12)"
                : `linear-gradient(90deg, #7ee7d1 0%, #8ef7ff ${threshold * 100}%, rgba(255,255,255,0.12) ${threshold * 100}%, rgba(255,255,255,0.12) 100%)`,
            }}
          />
          <div className="mt-2 flex items-center justify-between text-[11px] text-zinc-500">
            <span>Broad 0.0</span>
            <span>Strict 1.0</span>
          </div>
        </div>

        <output
          className={`w-fit justify-self-start rounded-full border px-3 py-1.5 text-sm font-semibold lg:justify-self-auto ${
            isExactMode
              ? "border-aura-amber/30 bg-aura-amber/10 text-aura-amber"
              : "border-aura-mint/30 bg-aura-mint/10 text-aura-mint"
          }`}
          htmlFor="similarity-threshold"
        >
          {isExactMode ? "Exact" : threshold.toFixed(2)}
        </output>
      </motion.div>

      <AnimatePresence>
        {query && suggestions.length > 0 && !busy && (
          <motion.div
            className="absolute left-0 right-0 top-[72px] z-20 max-h-[min(70vh,22rem)] overflow-y-auto rounded-lg border border-white/10 bg-ink-900/94 p-2 shadow-glass backdrop-blur-2xl sm:top-[88px]"
            aria-label="Smart search suggestions"
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
          >
            {suggestions.map((suggestion) => (
              <motion.button
                className="flex w-full items-center gap-3 rounded-lg px-4 py-3 text-left transition hover:bg-white/[0.06] hover:text-white"
                key={suggestion.query}
                type="button"
                onClick={() => onSubmit(suggestion.query)}
                initial={{ opacity: 0, x: -6 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 6 }}
                whileHover={{ x: 3 }}
                whileTap={{ scale: 0.99 }}
                transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
              >
                <Search className="size-4 text-aura-mint" />
                <span className="min-w-0">
                  <span className="block truncate text-sm text-zinc-200">{suggestion.query}</span>
                  <span className="mt-0.5 block truncate text-xs text-zinc-500">
                    {suggestion.reason}
                  </span>
                </span>
              </motion.button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
});

function ThinkingGlyph() {
  return (
    <div className="ai-thinking-glyph relative grid size-10 shrink-0 place-items-center rounded-lg border border-aura-mint/20 bg-aura-mint/10">
      <motion.span
        className="absolute h-px w-6 bg-aura-mint/60"
        animate={{ rotate: [0, 90, 180], opacity: [0.35, 1, 0.35] }}
        transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.span
        className="absolute h-6 w-px bg-aura-amber/55"
        animate={{ rotate: [0, -90, -180], opacity: [1, 0.35, 1] }}
        transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
      />
      <Sparkles className="relative size-4 text-aura-mint" />
    </div>
  );
}

function useTypewriterText(text: string) {
  const [displayText, setDisplayText] = useState("");

  useEffect(() => {
    setDisplayText("");
    let index = 0;

    const timer = window.setInterval(() => {
      index += 1;
      setDisplayText(text.slice(0, index));

      if (index >= text.length) {
        window.clearInterval(timer);
      }
    }, 28);

    return () => window.clearInterval(timer);
  }, [text]);

  return displayText;
}

function buildSmartSuggestions(query: string, mode: SearchMode) {
  const trimmedQuery = query.trim();
  const normalizedQuery = trimmedQuery.toLowerCase();

  if (!normalizedQuery) {
    return MODE_PLACEHOLDERS[mode].slice(0, 3).map((item) => ({
      query: item,
      reason: getModeReason(mode),
    }));
  }

  const scored = SMART_SUGGESTIONS.map((suggestion) => {
    const keywordScore = suggestion.keywords.reduce(
      (score, keyword) => score + (normalizedQuery.includes(keyword) ? 2 : 0),
      0,
    );
    const titleScore = suggestion.query.toLowerCase().includes(normalizedQuery) ? 3 : 0;

    return {
      ...suggestion,
      score: keywordScore + titleScore,
    };
  })
    .filter((suggestion) => suggestion.score > 0)
    .sort((left, right) => right.score - left.score);

  const inferred = [
    {
      query: `${trimmedQuery} in PDFs`,
      reason: "Search full document text",
    },
    {
      query: `${trimmedQuery} screenshots`,
      reason: "Use OCR from image previews",
    },
    {
      query: `${trimmedQuery} project files`,
      reason: "Find related local documents",
    },
  ];

  return dedupeSuggestions([...scored, ...inferred]).slice(0, 4);
}

function dedupeSuggestions(
  suggestions: Array<{ query: string; reason: string; score?: number; keywords?: string[] }>,
) {
  const seen = new Set<string>();

  return suggestions.filter((suggestion) => {
    const key = suggestion.query.toLowerCase();
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
}

function getModeReason(mode: SearchMode) {
  if (mode === "exact") {
    return "Prioritizes literal filename and content matches";
  }
  if (mode === "keyword") {
    return "Unicode-aware tokenized keyword search with script preservation";
  }
  if (mode === "semantic") {
    return "Expands meaning across indexed embeddings";
  }
  return "Combines exact keywords with AI context";
}
