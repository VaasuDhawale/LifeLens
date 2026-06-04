import { AnimatePresence, motion } from "framer-motion";
import {
  ExternalLink,
  File,
  FileText,
  Folder,
  Image,
  Info,
  Search,
  Tag,
  X,
  Zap,
  type LucideIcon,
} from "lucide-react";
import { memo, useEffect, useMemo } from "react";

import { getPreviewUrl, type SearchResult } from "../services/api.ts";

type PreviewPanelProps = {
  result: SearchResult | null;
  onClose: () => void;
};

type PreviewConfig = {
  label: string;
  Icon: LucideIcon;
  accentClass: string;
};

const PREVIEW_CONFIGS: Record<string, PreviewConfig> = {
  image: {
    label: "Image",
    Icon: Image,
    accentClass: "border-aura-mint/25 bg-aura-mint/10 text-aura-mint",
  },
  pdf: {
    label: "PDF",
    Icon: FileText,
    accentClass: "border-aura-rose/25 bg-aura-rose/10 text-aura-rose",
  },
  docx: {
    label: "DOCX",
    Icon: FileText,
    accentClass: "border-aura-violet/25 bg-aura-violet/10 text-aura-violet",
  },
  text: {
    label: "Text",
    Icon: FileText,
    accentClass: "border-aura-amber/25 bg-aura-amber/10 text-aura-amber",
  },
  file: {
    label: "File",
    Icon: File,
    accentClass: "border-white/10 bg-white/[0.06] text-zinc-300",
  },
};

export const PreviewPanel = memo(function PreviewPanel({ result, onClose }: PreviewPanelProps) {
  useEffect(() => {
    if (!result) {
      return;
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose, result]);

  return (
    <AnimatePresence>
      {result && (
        <>
          <motion.button
            className="fixed inset-0 z-40 bg-black/35 backdrop-blur-[2px] lg:hidden"
            type="button"
            aria-label="Close preview panel"
            onClick={onClose}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.22 }}
          />
          <motion.aside
            className="preview-panel fixed bottom-0 right-0 top-auto z-50 flex h-[88vh] w-full flex-col overflow-hidden rounded-t-lg border border-white/10 bg-ink-950/88 shadow-glass backdrop-blur-2xl sm:h-[86vh] sm:max-w-[520px] lg:bottom-4 lg:right-4 lg:top-4 lg:h-auto lg:rounded-lg"
            key={result.id}
            role="dialog"
            aria-modal="true"
            aria-label={`Preview ${result.fileName}`}
            initial={{ opacity: 0, x: 44, y: 18, scale: 0.98 }}
            animate={{ opacity: 1, x: 0, y: 0, scale: 1 }}
            exit={{ opacity: 0, x: 44, y: 18, scale: 0.98 }}
            transition={{ duration: 0.34, ease: [0.22, 1, 0.36, 1] }}
          >
            <PreviewHeader result={result} onClose={onClose} />
            <div className="min-h-0 flex-1 overflow-y-auto">
              <PreviewSurface result={result} />
              <PanelBody result={result} />
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
});

function PreviewHeader({ result, onClose }: { result: SearchResult; onClose: () => void }) {
  const config = getPreviewConfig(result.fileType);
  const Icon = config.Icon;
  const openUrl = useMemo(() => getPreviewUrl(result.filePath), [result.filePath]);

  return (
    <div className="flex items-start justify-between gap-3 border-b border-white/10 p-4 sm:p-5">
      <div className="flex min-w-0 gap-3">
        <div
          className={`grid size-11 shrink-0 place-items-center rounded-lg border shadow-glow ${config.accentClass}`}
        >
          <Icon className="size-5" />
        </div>
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="line-clamp-2 text-sm font-semibold leading-5 text-white sm:text-base">
              {result.fileName}
            </h2>
            <span
              className={`rounded-full border px-2 py-0.5 text-[11px] font-medium ${config.accentClass}`}
            >
              {config.label}
            </span>
          </div>
          <p className="mt-1 line-clamp-2 text-xs leading-5 text-zinc-500">{result.filePath}</p>
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <motion.a
          className="hidden min-h-10 items-center gap-2 rounded-lg border border-aura-mint/25 bg-aura-mint/10 px-3 py-2 text-xs font-semibold text-aura-mint transition hover:bg-aura-mint hover:text-ink-950 sm:flex"
          href={openUrl}
          target="_blank"
          rel="noreferrer"
          aria-label={`Open ${result.fileName}`}
          whileHover={{ y: -1 }}
          whileTap={{ scale: 0.98 }}
        >
          <ExternalLink className="size-4" />
          <span>Open File</span>
        </motion.a>
        <motion.button
          className="grid size-10 place-items-center rounded-lg border border-white/10 bg-white/[0.045] text-zinc-400 transition hover:bg-white/[0.08] hover:text-white"
          type="button"
          aria-label="Close preview panel"
          onClick={onClose}
          whileHover={{ y: -1 }}
          whileTap={{ scale: 0.96 }}
        >
          <X className="size-4" />
        </motion.button>
      </div>
    </div>
  );
}

function PreviewSurface({ result }: { result: SearchResult }) {
  const previewUrl = useMemo(() => getPreviewUrl(result.filePath), [result.filePath]);
  const isImage = result.fileType === "image";
  const isDocument = isPreviewableDocument(result.fileType);
  const config = getPreviewConfig(result.fileType);
  const Icon = config.Icon;

  if (isImage) {
    return (
      <div className="relative grid min-h-[300px] place-items-center overflow-hidden border-b border-white/10 bg-black/35 sm:min-h-[360px]">
        <img
          className="max-h-[460px] w-full object-contain"
          src={result.previewUrl || previewUrl}
          alt={result.fileName}
          loading="lazy"
          decoding="async"
        />
      </div>
    );
  }

  if (isDocument) {
    return (
      <div className="overflow-hidden border-b border-white/10 bg-white/[0.03]">
        <iframe
          className="h-[340px] w-full border-0 bg-white sm:h-[420px]"
          src={previewUrl}
          title={result.fileName}
          loading="lazy"
        />
      </div>
    );
  }

  return (
    <div className="grid min-h-[300px] place-items-center border-b border-white/10 bg-white/[0.03] p-8 text-center sm:min-h-[360px]">
      <div>
        <div
          className={`mx-auto grid size-16 place-items-center rounded-lg border shadow-glow ${config.accentClass}`}
        >
          <Icon className="size-8" />
        </div>
        <h3 className="mt-4 text-sm font-semibold text-white">Preview unavailable</h3>
        <p className="mx-auto mt-2 max-w-xs text-xs leading-5 text-zinc-500">
          This file type can still be ranked and opened from the local preview endpoint.
        </p>
      </div>
    </div>
  );
}

function PanelBody({ result }: { result: SearchResult }) {
  const explanation = result.matchExplanation;
  const similarity = explanation.semanticSimilarity ?? result.score;
  const finalScore = explanation.finalScore ?? result.score;
  const metadataRows = buildMetadataRows(result);
  const openUrl = useMemo(() => getPreviewUrl(result.filePath), [result.filePath]);

  return (
    <div className="grid gap-4 p-4 sm:p-5">
      <div className="grid grid-cols-2 gap-2">
        <MetricCard icon={Zap} label="Similarity" value={formatPercent(similarity)} />
        <MetricCard icon={Search} label="Final score" value={formatPercent(finalScore)} />
      </div>

      <section className="rounded-lg border border-white/10 bg-white/[0.035] p-4">
        <div className="mb-3 flex items-center gap-2 text-xs font-semibold text-white">
          <Tag className="size-4 text-aura-mint" />
          <span>Matched keywords</span>
        </div>
        {explanation.matchedKeywords.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {explanation.matchedKeywords.map((keyword) => (
              <span
                className="rounded-full border border-aura-mint/20 bg-aura-mint/10 px-2.5 py-1 text-xs text-aura-mint"
                key={keyword}
              >
                {keyword}
              </span>
            ))}
          </div>
        ) : (
          <p className="text-xs leading-5 text-zinc-500">No exact keyword terms were reported.</p>
        )}
        <p className="mt-3 text-xs leading-5 text-zinc-400">{explanation.summary}</p>
      </section>

      <section className="rounded-lg border border-white/10 bg-white/[0.035] p-4">
        <div className="mb-3 flex items-center gap-2 text-xs font-semibold text-white">
          <Folder className="size-4 text-aura-mint" />
          <span>File path</span>
        </div>
        <p className="break-words rounded-lg border border-white/10 bg-black/25 p-3 text-xs leading-5 text-zinc-400">
          {result.filePath}
        </p>
      </section>

      <section className="rounded-lg border border-white/10 bg-white/[0.035] p-4">
        <div className="mb-3 flex items-center gap-2 text-xs font-semibold text-white">
          <Info className="size-4 text-aura-mint" />
          <span>File metadata</span>
        </div>
        <div className="grid gap-2">
          {metadataRows.map((row) => (
            <div className="flex items-start justify-between gap-4 text-xs" key={row.label}>
              <span className="shrink-0 text-zinc-500">{row.label}</span>
              <span className="min-w-0 break-words text-right text-zinc-300">{row.value}</span>
            </div>
          ))}
        </div>
      </section>

      <motion.a
        className="flex min-h-12 items-center justify-center gap-2 rounded-lg border border-aura-mint/25 bg-aura-mint px-4 py-3 text-sm font-semibold text-ink-950 shadow-glow transition hover:brightness-110"
        href={openUrl}
        target="_blank"
        rel="noreferrer"
        aria-label={`Open ${result.fileName}`}
        whileHover={{ y: -1 }}
        whileTap={{ scale: 0.98 }}
      >
        <ExternalLink className="size-4" />
        <span>Open File</span>
      </motion.a>
    </div>
  );
}

function MetricCard({
  icon: Icon,
  label,
  value,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-lg border border-white/10 bg-black/25 p-3">
      <div className="flex items-center gap-2 text-[11px] text-zinc-500">
        <Icon className="size-3.5 text-aura-mint" />
        <span>{label}</span>
      </div>
      <div className="mt-2 text-xl font-semibold text-white">{value}</div>
    </div>
  );
}

function buildMetadataRows(result: SearchResult) {
  const metadata = result.metadata;
  const preferredRows = [
    ["File name", result.fileName],
    ["File type", result.fileType],
    ["Search mode", result.matchExplanation.searchMode],
    ["Filename match", result.matchExplanation.filenameMatch ? "Yes" : "No"],
    ["Content match", result.matchExplanation.contentMatch ? "Yes" : "No"],
    ["Exact occurrences", String(result.matchExplanation.occurrenceCount)],
  ];

  const extraRows = Object.entries(metadata)
    .filter(([key, value]) => isDisplayableMetadata(key, value))
    .slice(0, 8)
    .map(([key, value]) => [formatMetadataKey(key), formatMetadataValue(value)]);

  return [...preferredRows, ...extraRows].map(([label, value]) => ({
    label,
    value: String(value),
  }));
}

function isDisplayableMetadata(key: string, value: unknown) {
  if (value === null || value === undefined || key === "match_explanation") {
    return false;
  }
  return ["string", "number", "boolean"].includes(typeof value);
}

function formatMetadataKey(key: string) {
  return key
    .replace(/_/g, " ")
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

function formatMetadataValue(value: unknown) {
  if (typeof value === "number") {
    return Number.isInteger(value) ? value.toLocaleString() : value.toFixed(3);
  }
  if (typeof value === "boolean") {
    return value ? "Yes" : "No";
  }
  return String(value);
}

function isPreviewableDocument(fileType: string) {
  return fileType === "pdf" || fileType === "text";
}

function getPreviewConfig(fileType: string) {
  return PREVIEW_CONFIGS[fileType] || PREVIEW_CONFIGS.file;
}

function clampScore(value: number | null | undefined) {
  if (typeof value !== "number" || Number.isNaN(value)) {
    return null;
  }
  return Math.min(Math.max(value, 0), 1);
}

function formatPercent(value: number | null | undefined) {
  const score = clampScore(value);
  return score === null ? "--" : `${Math.round(score * 100)}%`;
}
