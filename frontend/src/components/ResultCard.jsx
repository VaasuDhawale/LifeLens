import { FileText, Image, NotebookText, Video } from "lucide-react";
import { motion } from "framer-motion";

import { cardVariants } from "../animations/variants.js";
import { formatScore } from "../utils/files.js";

const TYPE_STYLES = {
  image: {
    icon: Image,
    className: "from-aura-green/20 via-aura-mint/10 to-white/[0.03] text-aura-mint",
  },
  video: {
    icon: Video,
    className: "from-aura-rose/20 via-aura-violet/10 to-white/[0.03] text-aura-rose",
  },
  pdf: {
    icon: FileText,
    className: "from-aura-amber/20 via-aura-amber/10 to-white/[0.03] text-aura-amber",
  },
  note: {
    icon: NotebookText,
    className: "from-aura-violet/20 via-aura-violet/10 to-white/[0.03] text-aura-violet",
  },
  document: {
    icon: FileText,
    className: "from-white/[0.12] via-aura-mint/10 to-white/[0.03] text-zinc-200",
  },
};

export function ResultCard({ result, isSelected, onSelect }) {
  const style = TYPE_STYLES[result.type] || TYPE_STYLES.document;
  const Icon = style.icon;
  const isImage = result.type === "image";

  return (
    <motion.button
      className={`group relative overflow-hidden rounded-lg border bg-white/[0.045] p-3 text-left shadow-soft backdrop-blur-xl transition ${
        isSelected ? "border-aura-mint/60 shadow-glow" : "border-white/10 hover:border-white/20"
      }`}
      type="button"
      onClick={onSelect}
      variants={cardVariants}
      layout
      whileHover={{ y: -6, scale: 1.01 }}
      whileTap={{ scale: 0.985 }}
    >
      <div className={`relative grid aspect-[1.55] place-items-center overflow-hidden rounded-lg bg-gradient-to-br ${style.className}`}>
        {isImage ? (
          <img
            className="h-full w-full object-cover opacity-90 transition duration-300 group-hover:scale-105 group-hover:opacity-100"
            src={result.previewUrl}
            alt={result.title}
            loading="lazy"
            onError={(event) => {
              event.currentTarget.style.display = "none";
            }}
          />
        ) : (
          <Icon className="size-10" />
        )}
        <div className="absolute right-3 top-3 rounded-full border border-white/10 bg-black/30 px-2.5 py-1 text-xs font-medium text-white backdrop-blur-xl">
          {formatScore(result.score)}
        </div>
      </div>

      <div className="px-1 pb-1 pt-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="truncate text-sm font-semibold text-white">{result.title}</h3>
            <p className="mt-1 line-clamp-2 text-xs leading-5 text-zinc-500">{result.path}</p>
          </div>
          <Icon className="mt-0.5 size-4 shrink-0 text-zinc-500" />
        </div>

        <div className="mt-4 flex flex-wrap gap-1.5">
          {[result.type, ...result.tags].slice(0, 4).map((tag) => (
            <span
              className="rounded-full border border-white/10 bg-white/[0.04] px-2 py-1 text-[11px] capitalize text-zinc-400"
              key={tag}
            >
              {tag}
            </span>
          ))}
        </div>
      </div>
    </motion.button>
  );
}
