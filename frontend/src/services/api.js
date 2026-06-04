import { clusterFileToResult, normalizeSearchResult } from "../utils/files.js";

export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000";

function apiUrl(path) {
  return API_BASE_URL ? `${API_BASE_URL}${path}` : path;
}

export async function searchFiles({
  query,
  signal,
  threshold = 0.45,
  mode = "hybrid",
  limit = 24,
  fileTypes = [],
}) {
  const response = await fetch(apiUrl("/api/v1/search"), {
    method: "POST",
    signal,
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      query,
      threshold,
      mode,
      limit,
      file_types: fileTypes,
    }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => null);
    throw new Error(error?.detail || "Search failed.");
  }

  const data = await response.json();
  return {
    ...data,
    results: (data.results || []).map((result) =>
      normalizeSearchResult(result, getPreviewUrl),
    ),
  };
}

export async function getClusters({ threshold = 0.72, minSize = 2, limit = 8 } = {}) {
  const searchParams = new URLSearchParams({
    threshold: String(threshold),
    min_size: String(minSize),
    limit: String(limit),
  });
  const response = await fetch(apiUrl(`/api/v1/clusters?${searchParams.toString()}`));

  if (!response.ok) {
    const error = await response.json().catch(() => null);
    throw new Error(error?.detail || "Unable to load smart collections.");
  }

  return response.json();
}

export async function getIndexingStatus() {
  const response = await fetch(apiUrl("/api/v1/index/status"));
  if (!response.ok) {
    throw new Error("Unable to load indexing status.");
  }
  return response.json();
}

export function getPreviewUrl(path) {
  const url = new URL(apiUrl("/api/v1/files/preview"), window.location.origin);
  url.searchParams.set("path", path);
  return url.toString();
}

export function clusterToResults(cluster) {
  return (cluster.files || []).map((file) => clusterFileToResult(file, cluster, getPreviewUrl));
}
