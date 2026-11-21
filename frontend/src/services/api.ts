export type BackendSearchResult = {
  path: string;
  score?: number;
  title?: string | null;
  snippet?: string | null;
  metadata?: Record<string, unknown>;
};

export type BackendSearchResponse = {
  query: string;
  results: BackendSearchResult[];
  count: number;
};

export type SearchResult = {
  id: string;
  fileName: string;
  fileType: string;
  filePath: string;
  previewUrl: string | null;
  score: number | null;
  snippet: string;
  metadata: Record<string, unknown>;
  matchExplanation: MatchExplanation;
};

export type MatchExplanation = {
  matchedKeywords: string[];
  filenameMatch: boolean;
  contentMatch: boolean;
  keywordScore: number | null;
  semanticSimilarity: number | null;
  finalScore: number | null;
  occurrenceCount: number;
  searchMode: string;
  summary: string;
};

export type SearchMode = "exact" | "keyword" | "hybrid" | "semantic";

export type HealthResponse = {
  status: string;
  app_name: string;
  version: string;
  environment: string;
};

export type IndexingStatusResponse = {
  state: "idle" | "running" | "paused" | "error";
  indexed_files: number;
  pending_files: number;
  index_location: string;
};

const DEFAULT_API_BASE_URL = "http://127.0.0.1:8000";

export const API_BASE_URL = normalizeBaseUrl(
  import.meta.env.VITE_API_BASE_URL || DEFAULT_API_BASE_URL,
);

function normalizeBaseUrl(value: string) {
  return value.replace(/\/$/, "");
}

function apiUrl(path: string) {
  return `${API_BASE_URL}${path}`;
}

async function requestJson<TResponse>(
  path: string,
  options: RequestInit = {},
): Promise<TResponse> {
  const headers = new Headers(options.headers);
  headers.set("Content-Type", "application/json");

  const response = await fetch(apiUrl(path), {
    ...options,
    headers,
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => null);
    const detail = typeof payload?.detail === "string" ? payload.detail : null;
    throw new Error(detail || `Request failed with status ${response.status}`);
  }

  return response.json() as Promise<TResponse>;
}

export async function searchFiles(
  query: string,
  signal?: AbortSignal,
  threshold = 0.45,
  mode: SearchMode = "hybrid",
  limit = 24,
) {
  const payload = await requestJson<BackendSearchResponse>("/api/v1/search", {
    method: "POST",
    signal,
    body: JSON.stringify({ query, threshold, mode, limit }),
  });

  return {
    ...payload,
    results: payload.results.map(normalizeSearchResult),
  };
}

export async function getHealth(signal?: AbortSignal) {
  return requestJson<HealthResponse>("/api/v1/health", { signal });
}

export async function getIndexingStatus(signal?: AbortSignal) {
  return requestJson<IndexingStatusResponse>("/api/v1/index/status", { signal });
}

export function getPreviewUrl(filePath: string) {
  const url = new URL(apiUrl("/api/v1/files/preview"));
  url.searchParams.set("path", filePath);
  return url.toString();
}

function normalizeSearchResult(result: BackendSearchResult): SearchResult {
  const filePath = String(result.path || "");
  const metadata = result.metadata || {};
  const fileName = String(result.title || metadata.file_name || getFileName(filePath));
  const fileType = getFileType(filePath, metadata);
  const score = typeof result.score === "number" ? result.score : null;
  const matchExplanation = normalizeMatchExplanation(metadata, score);

  return {
    id: `${filePath}-${score ?? "scoreless"}`,
    fileName,
    fileType,
    filePath,
    previewUrl: fileType === "image" ? getPreviewUrl(filePath) : null,
    score,
    snippet: result.snippet || "",
    metadata,
    matchExplanation,
  };
}

function normalizeMatchExplanation(
  metadata: Record<string, unknown>,
  fallbackScore: number | null,
): MatchExplanation {
  const nestedExplanation = isRecord(metadata.match_explanation)
    ? metadata.match_explanation
    : {};
  const source = {
    ...metadata,
    ...nestedExplanation,
  };
  const matchedKeywords = Array.isArray(source.matched_keywords)
    ? source.matched_keywords.map(String).filter(Boolean)
    : [];
  const filenameMatch = Boolean(source.filename_match);
  const contentMatch = Boolean(source.content_match);
  const semanticSimilarity = readNumeric(source.semantic_similarity);
  const keywordScore = readNumeric(source.keyword_score);
  const finalScore = readNumeric(source.final_score) ?? fallbackScore;
  const occurrenceCount = Math.max(0, Math.round(readNumeric(source.occurrence_count) ?? 0));
  const searchMode = String(source.search_mode || "hybrid");

  return {
    matchedKeywords,
    filenameMatch,
    contentMatch,
    keywordScore,
    semanticSimilarity,
    finalScore,
    occurrenceCount,
    searchMode,
    summary: buildMatchSummary({
      matchedKeywords,
      filenameMatch,
      contentMatch,
      semanticSimilarity,
      occurrenceCount,
      searchMode,
    }),
  };
}

function buildMatchSummary({
  matchedKeywords,
  filenameMatch,
  contentMatch,
  semanticSimilarity,
  occurrenceCount,
  searchMode,
}: Pick<
  MatchExplanation,
  | "matchedKeywords"
  | "filenameMatch"
  | "contentMatch"
  | "semanticSimilarity"
  | "occurrenceCount"
  | "searchMode"
>) {
  const reasons = [];
  if (filenameMatch) {
    reasons.push("filename contains query keywords");
  }
  if (contentMatch) {
    reasons.push("extracted content contains query keywords");
  }
  if (semanticSimilarity !== null && semanticSimilarity > 0) {
    reasons.push(`${Math.round(semanticSimilarity * 100)}% semantic similarity`);
  }
  if (matchedKeywords.length > 0) {
    reasons.push(`${matchedKeywords.length} matched keyword${matchedKeywords.length === 1 ? "" : "s"}`);
  }
  if (occurrenceCount > 0) {
    reasons.push(`${occurrenceCount} exact occurrence${occurrenceCount === 1 ? "" : "s"}`);
  }
  if (!reasons.length) {
    return `${searchMode} ranking signals matched this file`;
  }
  return reasons.join("; ");
}

function readNumeric(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function getFileName(filePath: string) {
  return filePath.split(/[\\/]/).pop() || filePath || "Untitled file";
}

function getExtension(filePath: string) {
  const fileName = getFileName(filePath);
  const parts = fileName.split(".");
  return parts.length > 1 ? String(parts.pop()).toLowerCase() : "";
}

function getFileType(filePath: string, metadata: Record<string, unknown>) {
  const explicitType = metadata.file_type || metadata.type;
  if (explicitType) {
    return normalizeType(String(explicitType));
  }

  const extension = getExtension(filePath);
  if (["png", "jpg", "jpeg", "webp", "gif", "bmp", "tif", "tiff", "ppm"].includes(extension)) {
    return "image";
  }
  if (["mp4", "mov", "mkv", "avi", "webm"].includes(extension)) {
    return "video";
  }
  if (extension === "pdf") {
    return "pdf";
  }
  if (extension === "docx") {
    return "docx";
  }
  if (["txt", "md", "csv", "json", "log"].includes(extension)) {
    return "text";
  }
  return extension || "file";
}

function normalizeType(type: string) {
  const normalized = type.toLowerCase();
  if (normalized === "note" || normalized === "document") {
    return "text";
  }
  return normalized;
}
