import { BookOpen, GraduationCap, Plane, Sparkles } from "lucide-react";
import { motion } from "framer-motion";

import { SMART_COLLECTIONS } from "../store/searchStore.js";

const ICONS = {
  GraduationCap,
  Plane,
  BookOpen,
  Sparkles,
};

export function SmartCollections({ clusters, isLoading, onSelectCluster, onRunQuery }) {
  return (
    <section className="mx-auto mt-10 w-full max-w-6xl px-4">
      <div className="mb-4 flex items-end justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-white">Smart Collections</h2>
          <p className="mt-1 text-sm text-zinc-500">Local graph</p>
        </div>
        {isLoading && <span className="text-xs text-zinc-500">Refreshing</span>}
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {(clusters.length ? clusters.slice(0, 4) : SMART_COLLECTIONS).map((item, index) => {
          const isCluster = Boolean(item.files);
          const title = item.title;
          const Icon = ICONS[item.icon] || Sparkles;

          return (
            <motion.button
              className="group min-h-28 rounded-lg border border-white/10 bg-white/[0.055] p-4 text-left shadow-soft backdrop-blur-xl transition hover:border-aura-mint/40 hover:bg-white/[0.075]"
              key={`${title}-${index}`}
              type="button"
              onClick={() => (isCluster ? onSelectCluster(item) : onRunQuery(item.query))}
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.045, duration: 0.32 }}
              whileHover={{ y: -4 }}
              whileTap={{ scale: 0.98 }}
            >
              <div className="mb-4 flex items-center justify-between">
                <div className="grid size-10 place-items-center rounded-lg bg-aura-mint/10 text-aura-mint ring-1 ring-white/10">
                  <Icon className="size-5" />
                </div>
                <span className="rounded-full bg-white/[0.05] px-2.5 py-1 text-xs text-zinc-500">
                  {isCluster ? `${item.size} files` : "Suggested"}
                </span>
              </div>
              <strong className="block truncate text-sm font-semibold text-white">{title}</strong>
              <span className="mt-2 block truncate text-xs text-zinc-500">
                {isCluster ? `${Math.round(item.average_similarity * 100)}% similar` : item.query}
              </span>
            </motion.button>
          );
        })}
      </div>
    </section>
  );
}
