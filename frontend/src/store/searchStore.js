import { create } from "zustand";

import { clusterToResults, getClusters, getIndexingStatus, searchFiles } from "../services/api.js";

export const FILE_FILTERS = [
  { id: "all", label: "All", fileTypes: [] },
  { id: "image", label: "Images", fileTypes: ["image"] },
  { id: "video", label: "Videos", fileTypes: ["video"] },
  { id: "document", label: "Documents", fileTypes: ["document", "pdf", "text"] },
  { id: "screenshot", label: "Screenshots", fileTypes: ["image"] },
  { id: "recent", label: "Recent", fileTypes: [] },
  { id: "favorite", label: "Favorites", fileTypes: [] },
];

export const SUGGESTED_SEARCHES = [
  "Find my Goa trip photos",
  "Search DBMS notes",
  "Find screenshots about AI",
  "Show final year project files",
  "Open resume PDFs",
  "Find travel receipts",
];

export const SMART_COLLECTIONS = [
  {
    id: "final-year-project",
    title: "Final Year Project",
    query: "final year project files",
    icon: "GraduationCap",
  },
  {
    id: "travel-photos",
    title: "Travel Photos",
    query: "Goa trip photos travel",
    icon: "Plane",
  },
  {
    id: "study-material",
    title: "Study Material",
    query: "DBMS notes assignments study material",
    icon: "BookOpen",
  },
  {
    id: "screenshots-ai",
    title: "AI Screenshots",
    query: "screenshots about AI prompts",
    icon: "Sparkles",
  },
];

const RECENT_KEY = "personal-search:recent";

function readRecentSearches() {
  if (typeof localStorage === "undefined") {
    return [];
  }

  try {
    return JSON.parse(localStorage.getItem(RECENT_KEY) || "[]");
  } catch {
    return [];
  }
}

function saveRecentSearches(searches) {
  if (typeof localStorage !== "undefined") {
    localStorage.setItem(RECENT_KEY, JSON.stringify(searches.slice(0, 8)));
  }
}

function getFileTypes(activeFilterIds) {
  if (activeFilterIds.includes("all") || activeFilterIds.length === 0) {
    return [];
  }

  return [
    ...new Set(
      activeFilterIds.flatMap(
        (filterId) => FILE_FILTERS.find((filter) => filter.id === filterId)?.fileTypes || [],
      ),
    ),
  ];
}

function buildQuery(query, activeFilterIds) {
  if (activeFilterIds.includes("screenshot") && !query.toLowerCase().includes("screenshot")) {
    return `${query} screenshot`;
  }

  return query;
}

export const useSearchStore = create((set, get) => ({
  query: "",
  activeFilterIds: ["all"],
  results: [],
  selectedResult: null,
  clusters: [],
  recentSearches: readRecentSearches(),
  isSearching: false,
  isLoadingClusters: false,
  error: "",
  clusterError: "",
  hasSearched: false,
  commandOpen: false,
  toasts: [],
  indexingStatus: null,
  searchToken: 0,

  setQuery: (query) => set({ query }),

  setCommandOpen: (commandOpen) => set({ commandOpen }),

  selectResult: (selectedResult) => set({ selectedResult }),

  toggleFilter: (filterId) => {
    const { activeFilterIds } = get();
    if (filterId === "all") {
      set({ activeFilterIds: ["all"] });
      return;
    }

    const withoutAll = activeFilterIds.filter((id) => id !== "all");
    const nextFilters = withoutAll.includes(filterId)
      ? withoutAll.filter((id) => id !== filterId)
      : [...withoutAll, filterId];

    set({ activeFilterIds: nextFilters.length ? nextFilters : ["all"] });
  },

  runQuery: async (query, filterIds) => {
    set({
      query,
      activeFilterIds: filterIds?.length ? filterIds : get().activeFilterIds,
      commandOpen: false,
    });
    await get().performSearch({ immediateQuery: query });
  },

  performSearch: async ({ immediateQuery, quiet = false } = {}) => {
    const state = get();
    const rawQuery = (immediateQuery ?? state.query).trim();
    if (!rawQuery) {
      set({ results: [], selectedResult: null, hasSearched: false, error: "" });
      return;
    }

    const token = state.searchToken + 1;
    const activeFilterIds = state.activeFilterIds;
    set({
      isSearching: true,
      error: "",
      hasSearched: true,
      searchToken: token,
    });

    try {
      const data = await searchFiles({
        query: buildQuery(rawQuery, activeFilterIds),
        limit: 24,
        fileTypes: getFileTypes(activeFilterIds),
      });

      if (get().searchToken !== token) {
        return;
      }

      const nextRecent = [rawQuery, ...state.recentSearches.filter((item) => item !== rawQuery)].slice(0, 8);
      saveRecentSearches(nextRecent);

      set({
        results: data.results || [],
        selectedResult: data.results?.[0] || null,
        recentSearches: nextRecent,
        isSearching: false,
      });
    } catch (error) {
      if (get().searchToken !== token) {
        return;
      }

      set({
        results: [],
        selectedResult: null,
        isSearching: false,
        error: error.message,
      });
      get().addToast({ tone: "error", message: error.message || "Search failed." });
    }
  },

  loadClusters: async ({ quiet = false } = {}) => {
    if (!quiet) {
      set({ isLoadingClusters: true });
    }
    set({ clusterError: "" });

    try {
      const data = await getClusters({ limit: 10 });
      set({
        clusters: data.clusters || [],
        isLoadingClusters: false,
      });
    } catch (error) {
      set({
        clusters: [],
        clusterError: error.message,
        isLoadingClusters: false,
      });
    }
  },

  selectCluster: (cluster) => {
    const results = clusterToResults(cluster);
    set({
      query: cluster.title,
      results,
      selectedResult: results[0] || null,
      hasSearched: true,
      error: "",
    });
    get().addToast({ tone: "success", message: `${cluster.title} opened.` });
  },

  loadIndexingStatus: async () => {
    try {
      const indexingStatus = await getIndexingStatus();
      set({ indexingStatus });
    } catch {
      set({ indexingStatus: null });
    }
  },

  addToast: ({ message, tone = "default" }) => {
    const toast = {
      id: globalThis.crypto?.randomUUID
        ? globalThis.crypto.randomUUID()
        : `${Date.now()}-${message}`,
      message,
      tone,
    };
    set({ toasts: [...get().toasts, toast].slice(-4) });
    window.setTimeout(() => get().removeToast(toast.id), 3600);
  },

  removeToast: (id) => {
    set({ toasts: get().toasts.filter((toast) => toast.id !== id) });
  },
}));
