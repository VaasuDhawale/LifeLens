import { Clock3, FileText, Heart, Image, MonitorUp, Sparkles, Video } from "lucide-react";
import { motion } from "framer-motion";

import { FILE_FILTERS } from "../store/searchStore.js";

const ICONS = {
  all: Sparkles,
  image: Image,
  video: Video,
  document: FileText,
  screenshot: MonitorUp,
  recent: Clock3,
  favorite: Heart,
};

export function FilterBar({ activeFilterIds, onToggleFilter }) {
  return (
    <div className="flex flex-wrap justify-center gap-2">
      {FILE_FILTERS.map((filter) => {
        const Icon = ICONS[filter.id] || Sparkles;
        const isActive = activeFilterIds.includes(filter.id);

        return (
          <motion.button
            key={filter.id}
            className={`flex h-10 items-center gap-2 rounded-full border px-4 text-sm transition ${
              isActive
                ? "border-aura-mint/50 bg-aura-mint/10 text-white shadow-glow"
                : "border-white/10 bg-white/[0.04] text-zinc-400 hover:border-white/20 hover:text-white"
            }`}
            type="button"
            onClick={() => onToggleFilter(filter.id)}
            whileHover={{ y: -2 }}
            whileTap={{ scale: 0.97 }}
          >
            <Icon className="size-4" />
            <span>{filter.label}</span>
          </motion.button>
        );
      })}
    </div>
  );
}
