import { AnimatePresence, motion } from "framer-motion";
import {
  AlertCircle,
  Clock3,
  Cpu,
  FolderOpen,
  Loader2,
  Search,
  Settings,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { Suspense, lazy, useDeferredValue, useEffect, useMemo, useState } from "react";

import { PreviewPanel } from "../components/PreviewPanel.tsx";
import { ResultCard } from "../components/ResultCard.tsx";
import { SearchBar } from "../components/SearchBar.tsx";
import { SystemStatus } from "../components/SystemStatus.tsx";
import { useBackendStatus } from "../hooks/useBackendStatus.ts";
import { useSearch } from "../hooks/useSearch.ts";
import type { SearchResult } from "../services/api.ts";

const EXAMPLE_SEARCHES = [
  "Find my Goa trip photos",
  "Search DBMS notes",
  "Find screenshots about AI",
  "Show final year project files",
];

const MemoryCoreScene = lazy(() =>
  import("../components/MemoryCoreScene.tsx").then((module) => ({
    default: module.MemoryCoreScene,
  })),
);

const NAV_ITEMS = [
  { label: "Search", Icon: Search },
  { label: "Collections", Icon: FolderOpen },
  { label: "Recent", Icon: Clock3 },
  { label: "Settings", Icon: Settings },
];

export function Home() {
  const {
    currentQuery,
    threshold,
    mode,
    loading,
    isTyping,
    results,
    error,
    status,
    setCurrentQuery,
    setThreshold,
    setMode,
    submitSearch,
  } = useSearch(320);
  const [selectedResult, setSelectedResult] = useState<SearchResult | null>(null);
  const deferredResults = useDeferredValue(results);
  const backendStatus = useBackendStatus();
  const busy = loading || isTyping;
  const showInitialLoading = busy && results.length === 0;
  const showRefreshing = busy && results.length > 0;

  const statusText = useMemo(() => {
    if (isTyping) {
      return "Preparing local search";
    }
    if (loading) {
      return "Searching local AI indexes";
    }
    if (status === "success") {
      return `${results.length} ${results.length === 1 ? "match" : "matches"} found`;
    }
    if (status === "empty") {
      return "No matches found";
    }
    if (status === "error") {
      return "Backend unavailable";
    }
    return "Ready";
  }, [isTyping, loading, results.length, status]);

  useEffect(() => {
    if (!selectedResult) {
      return;
    }

    const updatedResult = results.find((result) => result.filePath === selectedResult.filePath);
    if (updatedResult && updatedResult.id !== selectedResult.id) {
      setSelectedResult(updatedResult);
      return;
    }

    if (!updatedResult && status !== "loading") {
      setSelectedResult(null);
    }
  }, [results, selectedResult, status]);

  return (
    <motion.main
      className="relative isolate min-h-screen overflow-x-hidden bg-ink-950 text-white"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.42, ease: [0.22, 1, 0.36, 1] }}
    >
      <div className="pointer-events-none fixed inset-0 z-0 bg-[linear-gradient(135deg,#050505_0%,#07110f_42%,#050505_100%)]" />
      <div className="infinite-grid pointer-events-none fixed inset-0 z-0" />
      <HeroBackdrop />

      <motion.header
        className="topbar-shell fixed inset-x-2 top-2 z-40 mx-auto flex min-h-[64px] max-w-[1180px] items-center justify-between gap-2 rounded-full border border-white/10 bg-ink-950/72 px-2 py-2 shadow-glass backdrop-blur-2xl sm:inset-x-4 sm:top-5 sm:gap-3 sm:px-3"
        initial={{ opacity: 0, y: -18, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.42, ease: [0.22, 1, 0.36, 1] }}
      >
        <div className="flex min-w-0 items-center gap-2 sm:gap-3">
          <div className="relative grid size-9 shrink-0 place-items-center rounded-full border border-aura-mint/25 bg-aura-mint/10 text-aura-mint shadow-glow sm:size-10">
            <Sparkles className="size-4 sm:size-5" />
            <span className="absolute -right-0.5 -top-0.5 size-2.5 rounded-full bg-aura-mint shadow-[0_0_16px_rgba(126,231,209,0.8)]" />
          </div>
          <div className="min-w-0 leading-tight">
            <div className="flex items-center gap-2">
              <div className="truncate text-sm font-semibold text-white">LifeLens AI</div>
              <span className="hidden rounded-full border border-aura-mint/20 bg-aura-mint/10 px-2 py-0.5 text-[10px] font-medium text-aura-mint sm:inline-flex">
                Local-first
              </span>
            </div>
            <div className="mt-0.5 hidden items-center gap-1.5 text-xs text-zinc-500 sm:flex">
              <ShieldCheck className="size-3 text-aura-mint" />
              <span>Private personal search</span>
            </div>
          </div>
        </div>

        <nav
          className="hidden items-center gap-1 rounded-full border border-white/10 bg-white/[0.045] p-1 text-xs text-zinc-400 shadow-soft backdrop-blur-xl lg:flex"
          aria-label="Primary navigation"
        >
          {NAV_ITEMS.map(({ label, Icon }) => (
            <motion.button
              className={`flex min-h-9 items-center gap-2 rounded-full px-3 py-2 transition ${
                label === "Search"
                  ? "bg-aura-mint/12 text-aura-mint"
                  : "hover:bg-white/[0.06] hover:text-white"
              }`}
              key={label}
              type="button"
              aria-current={label === "Search" ? "page" : undefined}
              whileHover={{ y: -1 }}
              whileTap={{ scale: 0.97 }}
            >
              <Icon className="size-3.5" />
              <span>{label}</span>
            </motion.button>
          ))}
        </nav>

        <div className="flex min-w-0 items-center gap-2">
          <motion.div
            className="hidden items-center gap-2 rounded-full border border-aura-mint/20 bg-aura-mint/10 px-3 py-2 text-xs font-medium text-aura-mint shadow-soft backdrop-blur-xl min-[760px]:flex"
            title={`Current search mode: ${mode}`}
            layout
          >
            <Search className="size-3.5" />
            <span className="capitalize">{mode} mode</span>
          </motion.div>
          <SystemStatus
            online={backendStatus.online}
            checking={backendStatus.checking}
            indexingState={backendStatus.indexingState}
            indexedFiles={backendStatus.indexedFiles}
            pendingFiles={backendStatus.pendingFiles}
            message={busy ? statusText : backendStatus.message}
          />
        </div>
      </motion.header>

      <section className="relative z-10 flex min-h-screen w-full items-center overflow-hidden px-3 pb-10 pt-28 text-center sm:px-4 sm:pb-14 sm:pt-32 lg:pt-36">
        <Suspense fallback={<div className="memory-core-fallback pointer-events-none absolute inset-0 z-0" />}>
          <MemoryCoreScene active={busy} />
        </Suspense>
        <div className="relative z-10 mx-auto flex w-full max-w-6xl flex-col items-center">
          <motion.div
            className="mb-5 inline-flex max-w-full items-center gap-2 rounded-full border border-aura-mint/20 bg-aura-mint/[0.08] px-3 py-2 text-xs text-zinc-300 shadow-soft backdrop-blur-xl sm:mb-7 sm:px-4 sm:text-sm"
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.42 }}
          >
            <Cpu className="size-4 text-aura-mint" />
            <span className="truncate">AI Memory Core connected to your local index</span>
          </motion.div>

          <motion.h1
            aria-label="Search Your Entire Digital Life"
            className="max-w-5xl text-balance text-4xl font-semibold leading-[1.02] text-white min-[380px]:text-5xl sm:text-6xl md:text-7xl lg:text-8xl"
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.04 }}
          >
            Search Your Entire <span className="hero-gradient-text">Digital Life</span>
          </motion.h1>

          <motion.p
            className="mt-5 max-w-2xl text-balance text-sm leading-6 text-zinc-400 sm:mt-6 sm:text-base sm:leading-7 md:text-lg"
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.48, delay: 0.1 }}
          >
            Find documents, notes, PDFs, images, screenshots and files using natural language.
          </motion.p>

          <motion.div
            className="mt-8 w-full sm:mt-10 md:mt-12"
            initial={{ opacity: 0, y: 18, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.54, delay: 0.16, ease: "easeOut" }}
          >
            <SearchBar
              query={currentQuery}
              threshold={threshold}
              mode={mode}
              busy={busy}
              loading={loading}
              onQueryChange={setCurrentQuery}
              onThresholdChange={setThreshold}
              onModeChange={setMode}
              onSubmit={submitSearch}
            />
          </motion.div>
        </div>
      </section>

      <section className="relative z-10 mx-auto w-full max-w-[1500px] px-3 py-6 sm:px-4 sm:py-10 xl:px-8">
        <motion.div
          className="mb-4 flex flex-col gap-3 sm:mb-5 md:flex-row md:items-end md:justify-between"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.34, delay: 0.18, ease: [0.22, 1, 0.36, 1] }}
        >
          <div>
            <h2 className="text-lg font-semibold text-white sm:text-xl">Search results</h2>
            <p className="mt-1 text-sm text-zinc-500">{statusText}</p>
          </div>
          <motion.div
            className="max-w-full truncate rounded-full border border-white/10 bg-white/[0.045] px-3 py-2 text-xs text-zinc-500"
            layout
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
          >
            {backendStatus.online
              ? `${mode} mode - threshold ${threshold.toFixed(2)}`
              : "Waiting for localhost:8000"}
          </motion.div>
        </motion.div>

        <AnimatePresence mode="wait">
          {error && (
            <motion.div
              className="mb-5 flex items-start gap-3 rounded-lg border border-aura-rose/30 bg-aura-rose/10 p-4 text-sm text-aura-rose"
              role="alert"
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
            >
              <AlertCircle className="mt-0.5 size-4 shrink-0" />
              <span>{error}</span>
            </motion.div>
          )}
        </AnimatePresence>

        <SearchContent
          status={status}
          loading={showInitialLoading}
          refreshing={showRefreshing}
          results={deferredResults}
          backendOnline={backendStatus.online}
          hasIndexedFiles={backendStatus.hasIndexedFiles}
          query={currentQuery}
          mode={mode}
          selectedResultId={selectedResult?.id ?? null}
          onExampleSearch={submitSearch}
          onSelectResult={setSelectedResult}
        />
      </section>

      <PreviewPanel result={selectedResult} onClose={() => setSelectedResult(null)} />
    </motion.main>
  );
}

function HeroBackdrop() {
  return (
    <div className="pointer-events-none fixed inset-x-0 top-0 z-0 h-[640px] overflow-hidden">
      <motion.div
        className="hero-gradient-glow absolute inset-x-[-18%] top-0 h-[430px]"
        animate={{ backgroundPosition: ["0% 50%", "100% 50%", "0% 50%"] }}
        transition={{ duration: 18, repeat: Infinity, ease: "linear" }}
      />
      <div className="hero-particle-field absolute inset-0" />
      <div className="absolute inset-x-0 top-0 h-px bg-[linear-gradient(90deg,transparent,rgba(255,255,255,0.22),transparent)]" />
      <div className="absolute inset-x-0 bottom-0 h-52 bg-[linear-gradient(to_bottom,transparent,#050505)]" />
    </div>
  );
}

type SearchContentProps = {
  status: string;
  loading: boolean;
  refreshing: boolean;
  results: ReturnType<typeof useSearch>["results"];
  backendOnline: boolean;
  hasIndexedFiles: boolean;
  query: string;
  mode: string;
  selectedResultId: string | null;
  onExampleSearch: (query?: string) => void;
  onSelectResult: (result: SearchResult) => void;
};

function SearchContent({
  status,
  loading,
  refreshing,
  results,
  backendOnline,
  hasIndexedFiles,
  query,
  mode,
  selectedResultId,
  onExampleSearch,
  onSelectResult,
}: SearchContentProps) {
  if (loading) {
    return (
      <motion.div
        key="loading"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -8 }}
        transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
      >
        <LoadingSkeletons />
      </motion.div>
    );
  }

  if (status === "idle" || status === "empty" || status === "error") {
    return (
      <EmptyState
        status={status}
        backendOnline={backendOnline}
        hasIndexedFiles={hasIndexedFiles}
        query={query}
        mode={mode}
        onExampleSearch={onExampleSearch}
      />
    );
  }

  return (
    <div className="relative">
      <AnimatePresence>
        {refreshing && (
          <motion.div
            className="absolute right-0 top-0 z-10 flex items-center gap-2 rounded-full border border-white/10 bg-ink-900/90 px-3 py-2 text-xs text-zinc-300 shadow-soft backdrop-blur-xl"
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
          >
            <Loader2 className="size-3.5 animate-spin text-aura-mint" />
            <span>Updating</span>
          </motion.div>
        )}
      </AnimatePresence>
      <motion.div
        className={`grid gap-3 transition-opacity sm:grid-cols-2 sm:gap-4 xl:grid-cols-3 ${
          refreshing ? "opacity-75" : "opacity-100"
        }`}
        initial="hidden"
        animate="show"
        variants={{
          hidden: {},
          show: { transition: { staggerChildren: 0.06, delayChildren: 0.04 } },
        }}
      >
        {results.map((result) => (
          <ResultCard
            key={result.id}
            result={result}
            selected={selectedResultId === result.id}
            onSelect={onSelectResult}
          />
        ))}
      </motion.div>
    </div>
  );
}

function LoadingSkeletons() {
  return (
    <motion.div
      className="grid gap-3 sm:grid-cols-2 sm:gap-4 xl:grid-cols-3"
      aria-hidden="true"
      initial="hidden"
      animate="show"
      variants={{
        hidden: {},
        show: { transition: { staggerChildren: 0.07 } },
      }}
    >
      {Array.from({ length: 6 }).map((_, index) => (
        <motion.div
          className="skeleton-card min-h-52 rounded-lg border border-white/10 bg-white/[0.045] p-3 sm:min-h-60 sm:p-4"
          key={index}
          variants={{
            hidden: { opacity: 0, y: 14, scale: 0.98 },
            show: {
              opacity: 1,
              y: 0,
              scale: 1,
              transition: { duration: 0.32, ease: [0.22, 1, 0.36, 1] },
            },
          }}
        >
          <div className="skeleton-shimmer h-24 rounded-lg sm:h-28" />
          <div className="skeleton-shimmer mt-5 h-4 w-3/4 rounded-full" />
          <div className="skeleton-shimmer mt-3 h-3 w-full rounded-full" />
          <div className="skeleton-shimmer mt-2 h-3 w-2/3 rounded-full" />
        </motion.div>
      ))}
    </motion.div>
  );
}

function EmptyState({
  status,
  backendOnline,
  hasIndexedFiles,
  query,
  mode,
  onExampleSearch,
}: {
  status: string;
  backendOnline: boolean;
  hasIndexedFiles: boolean;
  query: string;
  mode: string;
  onExampleSearch: (query?: string) => void;
}) {
  const isOffline = !backendOnline;
  const needsIndex = backendOnline && !hasIndexedFiles;
  const normalizedQuery = query.trim();
  const title = getEmptyTitle({ status, isOffline, needsIndex, query: normalizedQuery });
  const subtitle = getEmptySubtitle({ status, isOffline, needsIndex, query: normalizedQuery, mode });
  const suggestions = getEmptySuggestions({ query: normalizedQuery, isOffline, needsIndex, mode });
  const signals = getEmptySignals({ status, isOffline, needsIndex, query: normalizedQuery, mode });
  const Icon = isOffline || status === "error" ? AlertCircle : status === "empty" ? Search : Sparkles;

  return (
    <motion.div
      className="grid min-h-64 place-items-center rounded-lg border border-white/10 bg-white/[0.04] p-5 text-center shadow-soft backdrop-blur-xl sm:min-h-72 sm:p-8"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
    >
      <div className="w-full max-w-3xl">
        <motion.div
          className="mx-auto mb-5 grid size-16 place-items-center rounded-lg bg-aura-mint/10 text-aura-mint ring-1 ring-aura-mint/20"
          animate={{ y: [0, -4, 0], scale: [1, 1.03, 1] }}
          transition={{ duration: 3.2, repeat: Infinity, ease: "easeInOut" }}
        >
          <Icon className="size-7" />
        </motion.div>
        <h3 className="text-base font-semibold text-white sm:text-lg">{title}</h3>
        <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-zinc-500">{subtitle}</p>
        <div className="mx-auto mt-5 grid max-w-2xl gap-2 min-[520px]:grid-cols-3">
          {signals.map((signal) => (
            <motion.div
              className="rounded-lg border border-white/10 bg-white/[0.035] px-3 py-2 text-left"
              key={signal.label}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.24, delay: signal.delay }}
            >
              <div className="text-[11px] font-medium text-zinc-500">{signal.label}</div>
              <div className="mt-1 text-xs text-zinc-300">{signal.value}</div>
            </motion.div>
          ))}
        </div>
        <motion.div
          className="mt-6 flex flex-wrap justify-center gap-2"
          initial="hidden"
          animate="show"
          variants={{
            hidden: {},
            show: { transition: { staggerChildren: 0.055, delayChildren: 0.08 } },
          }}
        >
          {suggestions.map((query) => (
            <motion.button
              className="min-h-10 rounded-full border border-white/10 bg-white/[0.05] px-3 py-2 text-xs text-zinc-300 transition hover:border-aura-mint/40 hover:text-white"
              key={query}
              type="button"
              onClick={() => onExampleSearch(query)}
              variants={{
                hidden: { opacity: 0, y: 8 },
                show: { opacity: 1, y: 0 },
              }}
              whileHover={{ y: -2, scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
            >
              {query}
            </motion.button>
          ))}
        </motion.div>
      </div>
    </motion.div>
  );
}

function getEmptyTitle({
  status,
  isOffline,
  needsIndex,
  query,
}: {
  status: string;
  isOffline: boolean;
  needsIndex: boolean;
  query: string;
}) {
  if (isOffline) {
    return "Backend is not running";
  }
  if (needsIndex) {
    return "No files indexed yet";
  }
  if (status === "empty") {
    return query ? `No strong match for "${truncateQuery(query)}"` : "No matching files yet";
  }
  if (status === "error") {
    return "Search is temporarily unavailable";
  }
  return "Ask the local AI index";
}

function getEmptySubtitle({
  status,
  isOffline,
  needsIndex,
  query,
  mode,
}: {
  status: string;
  isOffline: boolean;
  needsIndex: boolean;
  query: string;
  mode: string;
}) {
  if (isOffline) {
    return "Start FastAPI on localhost:8000 to connect the local search engine.";
  }
  if (needsIndex) {
    return "Run python index_files.py or index a folder before searching.";
  }
  if (status === "empty") {
    if (query) {
      return `The ${mode} ranker filtered weak matches for this query. Related file names, OCR text, and document content will appear here when confidence is high enough.`;
    }
    return "The AI ranker will combine filenames, extracted text, OCR, and embeddings as soon as you search.";
  }
  if (status === "error") {
    return "Check the backend logs, then try again.";
  }
  return "Search across filenames, PDFs, notes, screenshots, images, and extracted content.";
}

function getEmptySuggestions({
  query,
  isOffline,
  needsIndex,
  mode,
}: {
  query: string;
  isOffline: boolean;
  needsIndex: boolean;
  mode: string;
}) {
  if (!query || isOffline || needsIndex) {
    return EXAMPLE_SEARCHES;
  }

  const suffixes =
    mode === "exact"
      ? ["notes", "PDF", "formulas", "report"]
      : ["PDFs", "screenshots", "project files", "notes"];

  return suffixes.map((suffix) => `${query} ${suffix}`);
}

function getEmptySignals({
  status,
  isOffline,
  needsIndex,
  query,
  mode,
}: {
  status: string;
  isOffline: boolean;
  needsIndex: boolean;
  query: string;
  mode: string;
}) {
  if (isOffline) {
    return [
      { label: "Backend", value: "Offline", delay: 0.04 },
      { label: "Index", value: "Unavailable", delay: 0.08 },
      { label: "AI ranker", value: "Waiting", delay: 0.12 },
    ];
  }

  if (needsIndex) {
    return [
      { label: "Index", value: "No vectors yet", delay: 0.04 },
      { label: "OCR text", value: "Pending", delay: 0.08 },
      { label: "Semantic memory", value: "Empty", delay: 0.12 },
    ];
  }

  if (status === "empty" && query) {
    return [
      { label: "Query", value: truncateQuery(query), delay: 0.04 },
      { label: "Mode", value: mode, delay: 0.08 },
      { label: "Confidence", value: "Below threshold", delay: 0.12 },
    ];
  }

  return [
    { label: "Filename scan", value: "Ready", delay: 0.04 },
    { label: "Text extraction", value: "Ready", delay: 0.08 },
    { label: "AI embeddings", value: "Ready", delay: 0.12 },
  ];
}

function truncateQuery(query: string) {
  return query.length > 34 ? `${query.slice(0, 31)}...` : query;
}
