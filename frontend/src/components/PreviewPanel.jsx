import { AnimatePresence, motion } from "framer-motion";
import { ExternalLink, FileText, Image, Link2, Sparkles, Tag, Video, X } from "lucide-react";

import { panelVariants } from "../animations/variants.js";
import { formatScore, isPreviewableDocument } from "../utils/files.js";

const ICONS = {
  image: Image,
  video: Video,
  pdf: FileText,
  note: FileText,
  document: FileText,
};

export function PreviewPanel({ result, clusters, onClose, onSelectRelated }) {
  const relatedFiles = getRelatedFiles(result, clusters);

  return (
    <AnimatePresence mode="wait">
      {result ? (
        <motion.aside
          className="sticky top-28 max-h-[calc(100vh-8rem)] overflow-hidden rounded-lg border border-white/10 bg-white/[0.06] shadow-glass backdrop-blur-2xl"
          key={result.id}
          variants={panelVariants}
          initial="initial"
          animate="animate"
          exit="exit"
          layout
        >
          <PreviewHeader result={result} onClose={onClose} />
          <PreviewSurface result={result} />
          <Metadata result={result} />
          <RelatedFiles files={relatedFiles} onSelectRelated={onSelectRelated} />
        </motion.aside>
      ) : (
        <motion.aside
          className="sticky top-28 grid min-h-[520px] place-items-center rounded-lg border border-white/10 bg-white/[0.04] p-8 text-center shadow-soft backdrop-blur-2xl"
          variants={panelVariants}
          initial="initial"
          animate="animate"
          exit="exit"
        >
          <div>
            <div className="mx-auto mb-5 grid size-16 place-items-center rounded-lg bg-white/[0.06] text-aura-mint ring-1 ring-white/10">
              <Sparkles className="size-7" />
            </div>
            <h2 className="text-lg font-semibold text-white">No file selected</h2>
            <p className="mt-2 text-sm text-zinc-500">Awaiting selection.</p>
          </div>
        </motion.aside>
      )}
    </AnimatePresence>
  );
}

function PreviewHeader({ result, onClose }) {
  const Icon = ICONS[result.type] || FileText;

  return (
    <div className="flex items-start justify-between gap-4 border-b border-white/10 p-5">
      <div className="flex min-w-0 gap-3">
        <div className="grid size-11 shrink-0 place-items-center rounded-lg bg-aura-mint/10 text-aura-mint ring-1 ring-aura-mint/20">
          <Icon className="size-5" />
        </div>
        <div className="min-w-0">
          <h2 className="truncate text-base font-semibold text-white">{result.title}</h2>
          <p className="mt-1 line-clamp-2 text-xs leading-5 text-zinc-500">{result.path}</p>
        </div>
      </div>
      <button
        className="grid size-9 shrink-0 place-items-center rounded-full border border-white/10 bg-white/[0.04] text-zinc-400 transition hover:text-white"
        type="button"
        aria-label="Close preview"
        onClick={onClose}
      >
        <X className="size-4" />
      </button>
    </div>
  );
}

function PreviewSurface({ result }) {
  if (result.type === "image") {
    return (
      <div className="grid min-h-80 place-items-center bg-black/20">
        <img
          className="max-h-[420px] w-full object-contain"
          src={result.previewUrl}
          alt={result.title}
          loading="lazy"
        />
      </div>
    );
  }

  if (result.type === "video") {
    return (
      <div className="grid min-h-80 place-items-center bg-black/20 text-aura-rose">
        <Video className="size-14" />
      </div>
    );
  }

  if (isPreviewableDocument(result.path)) {
    return (
      <div className="min-h-80 overflow-hidden bg-white/[0.03]">
        <iframe className="h-80 w-full border-0" src={result.previewUrl} title={result.title} />
      </div>
    );
  }

  return (
    <div className="grid min-h-80 place-items-center bg-white/[0.03] text-zinc-400">
      <FileText className="size-14" />
    </div>
  );
}

function Metadata({ result }) {
  const rows = [
    ["Similarity", formatScore(result.score)],
    ["Kind", result.type],
    ["Source", result.metadata.content_source || result.metadata.search_backend || "file"],
  ];

  return (
    <div className="grid gap-2 border-t border-white/10 p-5">
      <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase text-zinc-500">
        <Tag className="size-3.5" />
        Metadata
      </div>
      {rows.map(([label, value]) => (
        <div className="flex items-center justify-between gap-4 text-sm" key={label}>
          <span className="text-zinc-500">{label}</span>
          <span className="truncate text-zinc-200">{value}</span>
        </div>
      ))}
      <div className="mt-2 flex flex-wrap gap-1.5">
        {result.tags.map((tag) => (
          <span
            className="rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-xs capitalize text-zinc-400"
            key={tag}
          >
            {tag}
          </span>
        ))}
      </div>
    </div>
  );
}

function RelatedFiles({ files, onSelectRelated }) {
  if (!files.length) {
    return null;
  }

  return (
    <div className="border-t border-white/10 p-5">
      <div className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase text-zinc-500">
        <Link2 className="size-3.5" />
        Related
      </div>
      <div className="grid gap-2">
        {files.slice(0, 4).map((file) => (
          <button
            className="flex items-center justify-between gap-3 rounded-lg border border-white/10 bg-white/[0.035] px-3 py-2 text-left text-sm text-zinc-300 transition hover:border-aura-mint/40 hover:text-white"
            key={file.path}
            type="button"
            onClick={() => onSelectRelated(file)}
          >
            <span className="truncate">{file.file_name}</span>
            <ExternalLink className="size-3.5 shrink-0 text-zinc-500" />
          </button>
        ))}
      </div>
    </div>
  );
}

function getRelatedFiles(result, clusters) {
  if (!result) {
    return [];
  }

  const matchingCluster = clusters.find((cluster) =>
    (cluster.files || []).some((file) => String(file.path) === result.path),
  );

  if (!matchingCluster) {
    return [];
  }

  return (matchingCluster.files || []).filter((file) => String(file.path) !== result.path);
}
