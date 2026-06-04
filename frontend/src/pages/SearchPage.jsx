import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useMemo } from "react";

import { pageVariants } from "../animations/variants.js";
import { CommandPalette } from "../components/CommandPalette.jsx";
import { FilterBar } from "../components/FilterBar.jsx";
import { FloatingNav } from "../components/FloatingNav.jsx";
import { HeroSearch } from "../components/HeroSearch.jsx";
import { PreviewPanel } from "../components/PreviewPanel.jsx";
import { RecentSearchRail } from "../components/RecentSearchRail.jsx";
import { ResultGrid } from "../components/ResultGrid.jsx";
import { SmartCollections } from "../components/SmartCollections.jsx";
import { ToastStack } from "../components/ToastStack.jsx";
import { useDebouncedValue } from "../hooks/useDebouncedValue.js";
import { useKeyboardShortcuts } from "../hooks/useKeyboardShortcuts.js";
import { SMART_COLLECTIONS, useSearchStore } from "../store/searchStore.js";

export function SearchPage() {
  const query = useSearchStore((state) => state.query);
  const setQuery = useSearchStore((state) => state.setQuery);
  const activeFilterIds = useSearchStore((state) => state.activeFilterIds);
  const toggleFilter = useSearchStore((state) => state.toggleFilter);
  const results = useSearchStore((state) => state.results);
  const selectedResult = useSearchStore((state) => state.selectedResult);
  const selectResult = useSearchStore((state) => state.selectResult);
  const isSearching = useSearchStore((state) => state.isSearching);
  const error = useSearchStore((state) => state.error);
  const hasSearched = useSearchStore((state) => state.hasSearched);
  const recentSearches = useSearchStore((state) => state.recentSearches);
  const clusters = useSearchStore((state) => state.clusters);
  const isLoadingClusters = useSearchStore((state) => state.isLoadingClusters);
  const commandOpen = useSearchStore((state) => state.commandOpen);
  const setCommandOpen = useSearchStore((state) => state.setCommandOpen);
  const toasts = useSearchStore((state) => state.toasts);
  const removeToast = useSearchStore((state) => state.removeToast);
  const indexingStatus = useSearchStore((state) => state.indexingStatus);
  const performSearch = useSearchStore((state) => state.performSearch);
  const runQuery = useSearchStore((state) => state.runQuery);
  const loadClusters = useSearchStore((state) => state.loadClusters);
  const selectCluster = useSearchStore((state) => state.selectCluster);
  const loadIndexingStatus = useSearchStore((state) => state.loadIndexingStatus);
  const addToast = useSearchStore((state) => state.addToast);
  const debouncedQuery = useDebouncedValue(query, 320);

  useEffect(() => {
    loadClusters();
    loadIndexingStatus();
    const statusTimer = window.setInterval(loadIndexingStatus, 5000);
    return () => window.clearInterval(statusTimer);
  }, [loadClusters, loadIndexingStatus]);

  useEffect(() => {
    if (debouncedQuery.trim().length >= 2) {
      performSearch({ quiet: true });
    }
  }, [debouncedQuery, activeFilterIds, performSearch]);

  const shortcuts = useMemo(
    () => [
      {
        key: "k",
        meta: true,
        allowInInput: true,
        handler: () => setCommandOpen(true),
      },
      {
        key: "Escape",
        handler: () => {
          setCommandOpen(false);
          selectResult(null);
        },
      },
    ],
    [selectResult, setCommandOpen],
  );
  useKeyboardShortcuts(shortcuts);

  const statusText = getResultStatus({ isSearching, error, hasSearched, count: results.length });

  function handleManualSearch() {
    performSearch();
    if (query.trim()) {
      addToast({ tone: "success", message: "Search updated." });
    }
  }

  function handleCollectionCommand(collection) {
    runQuery(collection.query);
  }

  function handleSelectRelated(file) {
    const match = results.find((result) => result.path === String(file.path));
    if (match) {
      selectResult(match);
    }
  }

  return (
    <motion.main
      className="min-h-screen overflow-x-hidden bg-ink-950 text-white"
      variants={pageVariants}
      initial="initial"
      animate="animate"
    >
      <div className="fixed inset-0 -z-10 bg-[linear-gradient(135deg,#090b0a_0%,#15120f_42%,#101715_100%)]" />
      <div className="fixed inset-x-0 top-0 -z-10 h-[460px] bg-[linear-gradient(90deg,rgba(126,231,209,0.14),rgba(240,185,91,0.09),rgba(237,122,134,0.1))]" />

      <FloatingNav
        indexingStatus={indexingStatus}
        onOpenCommand={() => setCommandOpen(true)}
      />

      <HeroSearch
        query={query}
        setQuery={setQuery}
        isSearching={isSearching}
        recentSearches={recentSearches}
        onSearch={handleManualSearch}
        onRunQuery={runQuery}
      />

      <section className="mx-auto mt-6 w-full max-w-6xl px-4">
        <FilterBar activeFilterIds={activeFilterIds} onToggleFilter={toggleFilter} />
      </section>

      <RecentSearchRail recentSearches={recentSearches} onRunQuery={runQuery} />

      <SmartCollections
        clusters={clusters}
        isLoading={isLoadingClusters}
        onSelectCluster={selectCluster}
        onRunQuery={runQuery}
      />

      <section className="mx-auto grid w-full max-w-[1500px] gap-5 px-4 py-10 lg:grid-cols-[minmax(0,1fr)_420px] xl:px-8">
        <div className="min-w-0">
          <div className="mb-5 flex items-end justify-between gap-4">
            <div>
              <h2 className="text-xl font-semibold text-white">Results</h2>
              <p className="mt-1 text-sm text-zinc-500">{statusText}</p>
            </div>
          </div>

          <ResultGrid
            results={results}
            selectedResult={selectedResult}
            isSearching={isSearching}
            error={error}
            hasSearched={hasSearched}
            onSelectResult={selectResult}
            onRunQuery={runQuery}
          />
        </div>

        <PreviewPanel
          result={selectedResult}
          clusters={clusters}
          onClose={() => selectResult(null)}
          onSelectRelated={handleSelectRelated}
        />
      </section>

      <AnimatePresence>
        <CommandPalette
          open={commandOpen}
          onClose={() => setCommandOpen(false)}
          onRunQuery={runQuery}
          recentSearches={recentSearches}
          onSelectCollection={handleCollectionCommand}
        />
      </AnimatePresence>

      <ToastStack toasts={toasts} onRemove={removeToast} />
    </motion.main>
  );
}

function getResultStatus({ isSearching, error, hasSearched, count }) {
  if (isSearching) {
    return "Searching across local indexes...";
  }
  if (error) {
    return "Backend search is unavailable";
  }
  if (!hasSearched) {
    return `${SMART_COLLECTIONS.length} suggested collections ready`;
  }
  return `${count} ${count === 1 ? "match" : "matches"} ranked by similarity`;
}
