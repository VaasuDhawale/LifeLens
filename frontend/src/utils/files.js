export function getFileName(path = "") {
  return path.split(/[\\/]/).pop() || path;
}

export function getExtension(path = "") {
  const fileName = getFileName(path);
  const extension = fileName.includes(".") ? fileName.split(".").pop() : "";
  return extension.toLowerCase();
}

export function inferFileType(path = "", metadata = {}) {
  const explicitType = metadata.file_type || metadata.type;
  if (explicitType) {
    return normalizeFileType(explicitType);
  }

  const extension = getExtension(path);
  if (["png", "jpg", "jpeg", "gif", "webp", "bmp", "tif", "tiff", "ppm"].includes(extension)) {
    return "image";
  }
  if (["mp4", "mov", "mkv", "webm", "avi"].includes(extension)) {
    return "video";
  }
  if (extension === "pdf") {
    return "pdf";
  }
  if (extension === "docx") {
    return "docx";
  }
  if (["md", "txt", "log", "json", "csv", "yaml", "yml"].includes(extension)) {
    return "note";
  }
  return "document";
}

export function normalizeFileType(type = "") {
  const normalized = String(type).toLowerCase();
  if (normalized === "text") {
    return "note";
  }
  if (normalized === "document") {
    return "document";
  }
  return normalized;
}

export function isPreviewableDocument(path = "") {
  return ["pdf", "txt", "md", "csv", "json", "log"].includes(getExtension(path));
}

export function formatScore(score = 0) {
  return `${Math.round(Math.min(Math.max(Number(score) || 0, 0), 1) * 100)}%`;
}

export function buildTags(result) {
  const metadata = result.metadata || {};
  return [
    metadata.content_source,
    metadata.search_backend,
    metadata.cluster_title,
    metadata.suffix,
    ...(metadata.match_sources || []),
  ]
    .filter(Boolean)
    .map((tag) => String(tag).replace(/^[_\.]+/, "").replaceAll("_", " "))
    .slice(0, 5);
}

export function normalizeSearchResult(result, getPreviewUrl) {
  const metadata = result.metadata || {};
  const path = String(result.path || "");
  const fileType = inferFileType(path, metadata);

  return {
    id: `${path}-${metadata.vector_id || metadata.vector_ids?.join("-") || result.score || ""}`,
    path,
    title: result.title || getFileName(path),
    snippet: result.snippet || "",
    score: Number(result.score || 0),
    type: fileType,
    metadata: {
      ...metadata,
      file_type: metadata.file_type || fileType,
    },
    previewUrl: metadata.preview_url || getPreviewUrl(path),
    tags: buildTags(result),
  };
}

export function clusterFileToResult(file, cluster, getPreviewUrl) {
  const metadata = {
    ...(file.metadata || {}),
    cluster_title: cluster.title,
    file_type: file.file_type,
    search_backend: cluster.source,
  };
  const path = String(file.path || "");
  const fileType = inferFileType(path, metadata);

  return {
    id: `${path}-${cluster.title}`,
    path,
    title: file.file_name || getFileName(path),
    snippet: "",
    score: Number(cluster.average_similarity || 0),
    type: fileType,
    metadata,
    previewUrl: getPreviewUrl(path),
    tags: buildTags({ metadata }),
  };
}
