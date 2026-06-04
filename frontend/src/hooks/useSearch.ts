import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { searchFiles, type SearchMode, type SearchResult } from "../services/api.ts";

type SearchStatus = "idle" | "loading" | "success" | "empty" | "error";

type SearchState = {
  currentQuery: string;
  debouncedQuery: string;
  threshold: number;
  mode: SearchMode;
  loading: boolean;
  isTyping: boolean;
  results: SearchResult[];
  error: string | null;
  status: SearchStatus;
  setCurrentQuery: (query: string) => void;
  setThreshold: (threshold: number) => void;
  setMode: (mode: SearchMode) => void;
  submitSearch: (query?: string) => Promise<void>;
  resetSearch: () => void;
};

const MIN_QUERY_LENGTH = 2;
const MAX_CACHE_ENTRIES = 24;
const DEFAULT_THRESHOLD = 0.45;
const DEFAULT_MODE: SearchMode = "hybrid";

export function useSearch(debounceMs = 320): SearchState {
  const [currentQuery, setCurrentQuery] = useState("");
  const debouncedQuery = useDebouncedValue(currentQuery, debounceMs);
  const [threshold, setThresholdState] = useState(DEFAULT_THRESHOLD);
  const debouncedThreshold = useDebouncedValue(threshold, 180);
  const [mode, setModeState] = useState<SearchMode>(DEFAULT_MODE);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const cacheRef = useRef(new Map<string, SearchResult[]>());
  const currentQueryRef = useRef("");
  const inFlightSearchKeyRef = useRef("");
  const lastSearchKeyRef = useRef("");
  const thresholdRef = useRef(DEFAULT_THRESHOLD);
  const modeRef = useRef<SearchMode>(DEFAULT_MODE);

  const updateCurrentQuery = useCallback((query: string) => {
    currentQueryRef.current = query;
    setCurrentQuery(query);
  }, []);

  const updateThreshold = useCallback((nextThreshold: number) => {
    const normalizedThreshold = clampThreshold(nextThreshold);
    thresholdRef.current = normalizedThreshold;
    setThresholdState(normalizedThreshold);
  }, []);

  const updateMode = useCallback((nextMode: SearchMode) => {
    modeRef.current = nextMode;
    setModeState(nextMode);
  }, []);

  const runSearch = useCallback(async (
    rawQuery: string,
    force = false,
    thresholdValue = thresholdRef.current,
    modeValue = modeRef.current,
  ) => {
    const query = rawQuery.trim();
    const normalizedThreshold = clampThreshold(thresholdValue);
    const effectiveThreshold = modeValue === "exact" ? DEFAULT_THRESHOLD : normalizedThreshold;
    const cacheKey = buildSearchKey(query, effectiveThreshold, modeValue);

    if (query.length < MIN_QUERY_LENGTH) {
      abortRef.current?.abort();
      inFlightSearchKeyRef.current = "";
      lastSearchKeyRef.current = "";
      setLoading(false);
      setError(null);
      setResults([]);
      setHasSearched(false);
      return;
    }

    if (!force && currentQueryRef.current.trim() !== query) {
      return;
    }

    if (!force && cacheRef.current.has(cacheKey)) {
      abortRef.current?.abort();
      inFlightSearchKeyRef.current = "";
      lastSearchKeyRef.current = cacheKey;
      setResults(cacheRef.current.get(cacheKey) || []);
      setError(null);
      setLoading(false);
      setHasSearched(true);
      return;
    }

    if (!force && cacheKey === lastSearchKeyRef.current) {
      return;
    }

    abortRef.current?.abort();
    lastSearchKeyRef.current = cacheKey;
    inFlightSearchKeyRef.current = cacheKey;
    const controller = new AbortController();
    abortRef.current = controller;
    setLoading(true);
    setError(null);
    setHasSearched(true);

    try {
      const response = await searchFiles(
        query,
        controller.signal,
        effectiveThreshold,
        modeValue,
      );
      const isStillCurrent =
        currentQueryRef.current.trim() === query &&
        (modeValue === "exact" || sameThreshold(thresholdRef.current, effectiveThreshold)) &&
        modeRef.current === modeValue;

      if (!controller.signal.aborted && isStillCurrent) {
        rememberCachedResults(cacheRef.current, cacheKey, response.results);
        setResults(response.results);
      }
    } catch (searchError) {
      if (controller.signal.aborted) {
        return;
      }

      setResults([]);
      setError(
        searchError instanceof Error
          ? searchError.message
          : "Unable to reach the search backend.",
      );
    } finally {
      if (!controller.signal.aborted) {
        inFlightSearchKeyRef.current = "";
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    runSearch(debouncedQuery, false, debouncedThreshold, mode);

    return () => {
      abortRef.current?.abort();
    };
  }, [debouncedQuery, debouncedThreshold, mode, runSearch]);

  const submitSearch = useCallback(
    async (query = currentQuery) => {
      updateCurrentQuery(query);
      await runSearch(query, true, thresholdRef.current, modeRef.current);
    },
    [currentQuery, runSearch, updateCurrentQuery],
  );

  const resetSearch = useCallback(() => {
    abortRef.current?.abort();
    lastSearchKeyRef.current = "";
    updateCurrentQuery("");
    setResults([]);
    setError(null);
    setLoading(false);
    setHasSearched(false);
  }, [updateCurrentQuery]);

  const status = useMemo<SearchStatus>(() => {
    if (loading) {
      return "loading";
    }
    if (error) {
      return "error";
    }
    if (hasSearched && results.length === 0) {
      return "empty";
    }
    if (results.length > 0) {
      return "success";
    }
    return "idle";
  }, [error, hasSearched, loading, results.length]);

  const isTyping = useMemo(() => {
    const current = currentQuery.trim();
    return (
      current.length >= MIN_QUERY_LENGTH &&
      (current !== debouncedQuery.trim() ||
        (mode !== "exact" && !sameThreshold(threshold, debouncedThreshold)))
    );
  }, [currentQuery, debouncedQuery, threshold, debouncedThreshold, mode]);

  return {
    currentQuery,
    debouncedQuery,
    threshold,
    mode,
    loading,
    isTyping,
    results,
    error,
    status,
    setCurrentQuery: updateCurrentQuery,
    setThreshold: updateThreshold,
    setMode: updateMode,
    submitSearch,
    resetSearch,
  };
}

function buildSearchKey(query: string, threshold: number, mode: SearchMode) {
  return `${query.toLowerCase()}::${threshold.toFixed(2)}::${mode}`;
}

function clampThreshold(threshold: number) {
  if (Number.isNaN(threshold)) {
    return DEFAULT_THRESHOLD;
  }
  return Math.min(Math.max(threshold, 0), 1);
}

function sameThreshold(left: number, right: number) {
  return Math.abs(left - right) < 0.0001;
}

function rememberCachedResults(
  cache: Map<string, SearchResult[]>,
  key: string,
  results: SearchResult[],
) {
  cache.delete(key);
  cache.set(key, results);

  if (cache.size <= MAX_CACHE_ENTRIES) {
    return;
  }

  const oldestKey = cache.keys().next().value;
  if (oldestKey) {
    cache.delete(oldestKey);
  }
}

function useDebouncedValue<TValue>(value: TValue, delayMs: number) {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedValue(value), delayMs);
    return () => window.clearTimeout(timer);
  }, [delayMs, value]);

  return debouncedValue;
}
