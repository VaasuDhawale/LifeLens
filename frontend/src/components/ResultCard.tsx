import { AnimatePresence, motion } from "framer-motion";
import {
  Check,
  CheckCircle2,
  ChevronDown,
  Circle,
  Copy,
  ExternalLink,
  File,
  FileText,
  Image,
  Search,
  Video,
  Zap,
  type LucideIcon,
} from "lucide-react";
import { memo, type KeyboardEvent, useEffect, useMemo, useState } from "react";

import { getPreviewUrl, type SearchResult } from "../services/api.ts";

type ResultCardProps = {
  result: SearchResult;
  selected?: boolean;
  onSelect?: (result: SearchResult) => void;
};

type TypeConfig = {
  label: string;
  Icon: LucideIcon;
  accentClass: string;
  chipClass: string;
  previewClass: string;
};

const TYPE_CONFIGS: Record<string, TypeConfig> = {
  image: {
    label: "Image",
    Icon: Image,
    accentClass: "from-aura-mint/45 via-aura-violet/25 to-transparent",
    chipClass: "border-aura-mint/25 bg-aura-mint/10 text-aura-mint",
    previewClass: "from-aura-mint/18 via-aura-violet/10 to-white/[0.035]",
  },
  pdf: {
    label: "PDF",
    Icon: FileText,
    accentClass: "from-aura-rose/40 via-aura-amber/22 to-transparent",
    chipClass: "border-aura-rose/25 bg-aura-rose/10 text-aura-rose",
    previewClass: "from-aura-rose/16 via-aura-amber/10 to-white/[0.035]",
  },
  docx: {
    label: "DOCX",
    Icon: FileText,
    accentClass: "from-aura-violet/42 via-aura-mint/20 to-transparent",
    chipClass: "border-aura-violet/25 bg-aura-violet/10 text-aura-violet",
    previewClass: "from-aura-violet/16 via-aura-mint/10 to-white/[0.035]",
  },
  text: {
    label: "Note",
    Icon: FileText,
    accentClass: "from-aura-amber/42 via-aura-mint/18 to-transparent",
    chipClass: "border-aura-amber/25 bg-aura-amber/10 text-aura-amber",
    previewClass: "from-aura-amber/16 via-aura-mint/10 to-white/[0.035]",
  },
  video: {
    label: "Video",
    Icon: Video,
    accentClass: "from-aura-violet/45 via-aura-rose/20 to-transparent",
    chipClass: "border-aura-violet/25 bg-aura-violet/10 text-aura-violet",
    previewClass: "from-aura-violet/18 via-aura-rose/10 to-white/[0.035]",
  },
  file: {
    label: "File",
    Icon: File,
    accentClass: "from-white/24 via-aura-mint/16 to-transparent",
    chipClass: "border-white/10 bg-white/[0.06] text-zinc-300",
    previewClass: "from-white/[0.08] via-aura-mint/10 to-white/[0.035]",
  },
};

export const ResultCard = memo(function ResultCard({
  result,
  selected = false,
  onSelect,
}: ResultCardProps) {
  const [imageFailed, setImageFailed] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [copied, setCopied] = useState(false);
  const typeConfig = getTypeConfig(result.fileType);
  const keywords = result.matchExplanation.matchedKeywords;
  const showPreview = Boolean(result.previewUrl && !imageFailed);
  const extension = getExtension(result.fileName || result.filePath);
  const previewText = result.snippet || result.matchExplanation.summary;
  const openUrl = useMemo(() => getPreviewUrl(result.filePath), [result.filePath]);

  useEffect(() => {
    setImageFailed(false);
  }, [result.previewUrl]);

  useEffect(() => {
    setCopied(false);
  }, [result.filePath]);

  async function copyPath() {
    try {
      await navigator.clipboard.writeText(result.filePath);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1400);
    } catch {
      setCopied(false);
    }
  }

  function handleSelect() {
    onSelect?.(result);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLElement>) {
    if (event.key !== "Enter" && event.key !== " ") {
      return;
    }

    event.preventDefault();
    handleSelect();
  }

  const signals = useMemo(
    () => [
      {
        active: result.matchExplanation.filenameMatch,
        label: "Filename",
        tone: "mint" as const,
      },
      {
        active: result.matchExplanation.contentMatch,
        label: "Content",
        tone: "amber" as const,
      },
    ],
    [result.matchExplanation.contentMatch, result.matchExplanation.filenameMatch],
  );

  return (
    <motion.article
      className={`result-card-shell group relative isolate h-full cursor-pointer overflow-hidden rounded-lg border bg-ink-900/62 p-3 shadow-soft backdrop-blur-2xl ${
        selected ? "border-aura-mint/45 ring-1 ring-aura-mint/30" : "border-white/10"
      }`}
      aria-label={`Search result: ${result.fileName}`}
      aria-pressed={selected}
      data-expanded={expanded ? "true" : "false"}
      role="button"
      tabIndex={0}
      layout
      onClick={handleSelect}
      onKeyDown={handleKeyDown}
      variants={{
        hidden: { opacity: 0, y: 18, scale: 0.96, filter: "blur(6px)" },
        show: { opacity: 1, y: 0, scale: 1, filter: "blur(0px)" },
      }}
      exit={{ opacity: 0, y: 10, scale: 0.98 }}
      transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
      whileHover={{ y: -6, scale: 1.01 }}
    >
      <div
        className={`pointer-events-none absolute inset-x-0 top-0 z-0 h-32 bg-gradient-to-b ${typeConfig.accentClass} opacity-45 transition duration-300 group-hover:opacity-70`}
      />

      <FilePreview
        extension={extension}
        imageFailed={imageFailed}
        result={result}
        showPreview={showPreview}
        typeConfig={typeConfig}
        onImageError={() => setImageFailed(true)}
      />

      <div className="relative z-10 px-1 pb-1 pt-4">
        <div className="flex flex-col gap-3 min-[420px]:flex-row min-[420px]:items-start min-[420px]:justify-between">
          <div className="flex min-w-0 items-start gap-3">
            <div className={`grid size-9 shrink-0 place-items-center rounded-lg border sm:size-10 ${typeConfig.chipClass}`}>
              <typeConfig.Icon className="size-5" />
            </div>
            <div className="min-w-0">
              <h3 className="line-clamp-2 text-sm font-semibold leading-5 text-white">
                <HighlightedText text={result.fileName} terms={keywords} />
              </h3>
              <p className="mt-1 truncate text-xs text-zinc-500">{result.filePath}</p>
            </div>
          </div>
          <RelevanceScore value={result.matchExplanation.finalScore ?? result.score} />
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <span className={`rounded-full border px-2.5 py-1 text-[11px] font-medium ${typeConfig.chipClass}`}>
            {typeConfig.label}
          </span>
          <span className="rounded-full border border-white/10 bg-white/[0.045] px-2.5 py-1 text-[11px] capitalize text-zinc-400">
            {result.matchExplanation.searchMode}
          </span>
          {result.matchExplanation.occurrenceCount > 0 && (
            <span className="rounded-full border border-aura-mint/20 bg-aura-mint/10 px-2.5 py-1 text-[11px] text-aura-mint">
              {result.matchExplanation.occurrenceCount} exact
            </span>
          )}
        </div>

        {previewText && (
          <p className="mt-4 line-clamp-2 text-xs leading-5 text-zinc-400">
            <HighlightedText text={previewText} terms={keywords} />
          </p>
        )}

        <div className="mt-4 rounded-lg border border-white/10 bg-white/[0.035] p-3">
          <div className="flex items-start gap-2 text-xs text-zinc-300">
            <Search className="mt-0.5 size-3.5 shrink-0 text-aura-mint" />
            <p className="line-clamp-2 leading-5">
              <span className="font-medium text-white">Match reason: </span>
              {result.matchExplanation.summary}
            </p>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-1.5">
          {keywords.length > 0 ? (
            keywords.slice(0, 5).map((keyword) => (
              <motion.span
                className="rounded-full border border-aura-mint/20 bg-aura-mint/10 px-2 py-1 text-[11px] text-aura-mint shadow-[0_0_18px_rgba(126,231,209,0.12)]"
                key={keyword}
                layout
              >
                {keyword}
              </motion.span>
            ))
          ) : (
            <span className="rounded-full border border-white/10 bg-white/[0.035] px-2 py-1 text-[11px] text-zinc-500">
              Semantic signal
            </span>
          )}
        </div>

        <div className="mt-4 grid grid-cols-1 gap-2 min-[360px]:grid-cols-2">
          {signals.map((signal) => (
            <MatchIndicator
              active={signal.active}
              key={signal.label}
              label={signal.label}
              tone={signal.tone}
            />
          ))}
        </div>

        <div className="mt-4 grid grid-cols-1 gap-2 min-[420px]:grid-cols-2">
          <motion.a
            className="flex min-h-11 items-center justify-center gap-2 rounded-lg border border-aura-mint/25 bg-aura-mint/10 px-3 py-2 text-xs font-semibold text-aura-mint transition hover:bg-aura-mint hover:text-ink-950"
            href={openUrl}
            target="_blank"
            rel="noreferrer"
            aria-label={`Open file preview for ${result.fileName}`}
            onClick={(event) => event.stopPropagation()}
            whileHover={{ y: -1 }}
            whileTap={{ scale: 0.98 }}
          >
            <ExternalLink className="size-4" />
            <span>Open file</span>
          </motion.a>
          <motion.button
            className="flex min-h-11 items-center justify-center gap-2 rounded-lg border border-white/10 bg-white/[0.045] px-3 py-2 text-xs font-semibold text-zinc-300 transition hover:border-aura-mint/30 hover:bg-white/[0.08] hover:text-white"
            type="button"
            aria-label={`Copy path for ${result.fileName}`}
            onClick={(event) => {
              event.stopPropagation();
              void copyPath();
            }}
            whileHover={{ y: -1 }}
            whileTap={{ scale: 0.98 }}
          >
            {copied ? <Check className="size-4 text-aura-mint" /> : <Copy className="size-4" />}
            <span>{copied ? "Copied" : "Copy path"}</span>
          </motion.button>
        </div>

        <motion.button
          className="mt-4 flex min-h-11 w-full items-center justify-between rounded-lg border border-white/10 bg-white/[0.045] px-3 py-2 text-left text-xs font-medium text-zinc-300 transition hover:border-aura-mint/30 hover:bg-aura-mint/10 hover:text-white"
          type="button"
          aria-expanded={expanded}
          aria-label={`${expanded ? "Hide" : "Show"} match details for ${result.fileName}`}
          onClick={(event) => {
            event.stopPropagation();
            setExpanded((value) => !value);
          }}
          whileTap={{ scale: 0.99 }}
        >
          <span>{expanded ? "Hide match details" : "Show match details"}</span>
          <motion.span animate={{ rotate: expanded ? 180 : 0 }} transition={{ duration: 0.22 }}>
            <ChevronDown className="size-4" />
          </motion.span>
        </motion.button>

        <AnimatePresence initial={false}>
          {expanded && (
            <motion.div
              className="overflow-hidden"
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
            >
              <MatchExplanationPanel result={result} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.article>
  );
});

function FilePreview({
  extension,
  imageFailed,
  result,
  showPreview,
  typeConfig,
  onImageError,
}: {
  extension: string;
  imageFailed: boolean;
  result: SearchResult;
  showPreview: boolean;
  typeConfig: TypeConfig;
  onImageError: () => void;
}) {
  return (
    <div
      className={`relative z-10 grid aspect-[1.34] place-items-center overflow-hidden rounded-lg border border-white/10 bg-gradient-to-br sm:aspect-[1.55] ${typeConfig.previewClass}`}
    >
      <div className="absolute inset-0 bg-[linear-gradient(120deg,rgba(255,255,255,0.12),transparent_32%,rgba(126,231,209,0.08)_68%,transparent)] opacity-50" />
      {showPreview ? (
        <img
          className="relative z-10 h-full w-full object-cover opacity-90 transition duration-500 group-hover:scale-105 group-hover:opacity-100"
          src={result.previewUrl || undefined}
          alt={result.fileName}
          loading="lazy"
          decoding="async"
          onError={onImageError}
        />
      ) : (
        <div className="relative z-10 flex flex-col items-center px-6 text-center">
          <motion.div
            className={`grid size-16 place-items-center rounded-lg border ${typeConfig.chipClass} shadow-glow`}
            animate={{ y: [0, -3, 0], scale: [1, 1.04, 1] }}
            transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
          >
            <typeConfig.Icon className="size-8" />
          </motion.div>
          <div className="mt-4 text-sm font-semibold text-white">
            {imageFailed ? "Preview unavailable" : `${typeConfig.label} preview`}
          </div>
          <div className="mt-1 text-xs uppercase text-zinc-500">
            {extension || result.fileType || "file"}
          </div>
        </div>
      )}

      <div className="absolute inset-x-3 bottom-3 z-20 flex items-center justify-between gap-3">
        <div className={`rounded-full border px-2.5 py-1 text-[11px] font-medium backdrop-blur-xl ${typeConfig.chipClass}`}>
          {typeConfig.label}
        </div>
        <div className="hidden rounded-full border border-white/10 bg-black/35 px-2.5 py-1 text-[11px] text-white backdrop-blur-xl min-[380px]:block">
          Local file
        </div>
      </div>

      <div className="absolute inset-0 z-10 bg-black/0 transition duration-300 group-hover:bg-black/10" />
    </div>
  );
}

function RelevanceScore({ value }: { value: number | null }) {
  const score = clampScore(value);
  const percent = score === null ? null : Math.round(score * 100);

  return (
    <div className="w-full rounded-lg border border-white/10 bg-black/25 p-2 text-left backdrop-blur-xl min-[420px]:w-auto min-[420px]:min-w-[74px] min-[420px]:text-right">
      <div className="flex items-center gap-1.5 text-[11px] text-zinc-500 min-[420px]:justify-end">
        <Zap className="size-3 text-aura-mint" />
        <span>Relevance</span>
      </div>
      <div className="mt-1 text-lg font-semibold leading-none text-white">
        <AnimatePresence mode="wait" initial={false}>
          <motion.span
            key={percent === null ? "ai" : percent}
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -5 }}
            transition={{ duration: 0.18 }}
          >
            {percent === null ? "AI" : `${percent}%`}
          </motion.span>
        </AnimatePresence>
      </div>
      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/10">
        <motion.div
          className="h-full rounded-full bg-[linear-gradient(90deg,#7ee7d1,#f0b95b)] shadow-[0_0_16px_rgba(126,231,209,0.38)]"
          initial={{ width: 0 }}
          animate={{ width: `${percent ?? 42}%` }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
        />
      </div>
    </div>
  );
}

function MatchExplanationPanel({ result }: { result: SearchResult }) {
  const explanation = result.matchExplanation;
  const similarity = explanation.semanticSimilarity ?? result.score;

  return (
    <div className="result-detail-panel mt-3 border-t border-white/10 pt-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2 text-xs font-semibold text-white">
          <Search className="size-3.5 shrink-0 text-aura-mint" />
          <span>Why it matched</span>
        </div>
        <div className="shrink-0 rounded-full border border-white/10 bg-white/[0.045] px-2 py-1 text-[11px] text-zinc-300">
          Similarity {formatPercent(similarity)}
        </div>
      </div>

      <p className="mt-2 text-xs leading-5 text-zinc-400">{explanation.summary}</p>

      <div className="mt-4 grid grid-cols-1 gap-2 text-[11px] text-zinc-500 min-[420px]:grid-cols-3">
        <ScoreMetric label="Keyword" value={explanation.keywordScore} />
        <ScoreMetric label="Semantic" value={explanation.semanticSimilarity} />
        <ScoreMetric label="Final" value={explanation.finalScore ?? result.score} />
      </div>
    </div>
  );
}

function MatchIndicator({
  active,
  label,
  tone = "mint",
}: {
  active: boolean;
  label: string;
  tone?: "mint" | "amber";
}) {
  const activeClass =
    tone === "mint"
      ? "border-aura-mint/25 bg-aura-mint/10 text-aura-mint"
      : "border-aura-amber/25 bg-aura-amber/10 text-aura-amber";

  return (
    <motion.div
      className={`flex items-center gap-2 rounded-lg border px-2.5 py-2 text-[11px] ${
        active ? activeClass : "border-white/10 bg-white/[0.035] text-zinc-500"
      }`}
      whileHover={{ y: -1 }}
      transition={{ duration: 0.16 }}
    >
      {active ? <CheckCircle2 className="size-3.5" /> : <Circle className="size-3.5" />}
      <span>{label}</span>
    </motion.div>
  );
}

function ScoreMetric({ label, value }: { label: string; value: number | null }) {
  const percent = clampScore(value);

  return (
    <div className="rounded-lg bg-white/[0.035] px-2 py-2">
      <div>{label}</div>
      <div className="mt-1 font-semibold text-zinc-300">{formatPercent(value)}</div>
      <div className="mt-2 h-1 overflow-hidden rounded-full bg-white/10">
        <motion.div
          className="h-full rounded-full bg-aura-mint"
          initial={{ width: 0 }}
          animate={{ width: `${percent === null ? 0 : percent * 100}%` }}
          transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
        />
      </div>
    </div>
  );
}

function HighlightedText({ text, terms }: { text: string; terms: string[] }) {
  const parts = splitHighlightedText(text, terms);

  return (
    <>
      {parts.map((part, index) =>
        part.highlight ? (
          <mark className="result-keyword-highlight" key={`${part.text}-${index}`}>
            {part.text}
          </mark>
        ) : (
          <span key={`${part.text}-${index}`}>{part.text}</span>
        ),
      )}
    </>
  );
}

function splitHighlightedText(text: string, terms: string[]) {
  const normalizedTerms = terms.map((term) => term.trim()).filter(Boolean);
  if (!text || normalizedTerms.length === 0) {
    return [{ text, highlight: false }];
  }

  const pattern = normalizedTerms
    .sort((left, right) => right.length - left.length)
    .map(escapeRegExp)
    .join("|");
  const regex = new RegExp(`(${pattern})`, "gi");
  const parts: Array<{ text: string; highlight: boolean }> = [];
  let lastIndex = 0;

  for (const match of text.matchAll(regex)) {
    const matchText = match[0];
    const index = match.index ?? 0;

    if (index > lastIndex) {
      parts.push({ text: text.slice(lastIndex, index), highlight: false });
    }

    parts.push({ text: matchText, highlight: true });
    lastIndex = index + matchText.length;
  }

  if (lastIndex < text.length) {
    parts.push({ text: text.slice(lastIndex), highlight: false });
  }

  return parts.length ? parts : [{ text, highlight: false }];
}

function getTypeConfig(fileType: string) {
  return TYPE_CONFIGS[fileType] || TYPE_CONFIGS.file;
}

function getExtension(path: string) {
  const fileName = path.split(/[\\/]/).pop() || path;
  const parts = fileName.split(".");
  return parts.length > 1 ? String(parts.pop()).toUpperCase() : "";
}

function clampScore(value: number | null | undefined) {
  if (typeof value !== "number" || Number.isNaN(value)) {
    return null;
  }
  return Math.min(Math.max(value, 0), 1);
}

function formatPercent(value: number | null | undefined) {
  const score = clampScore(value);
  if (score === null) {
    return "--";
  }
  return `${Math.round(score * 100)}%`;
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
