import { Clock3, Search } from "lucide-react";
import { motion } from "framer-motion";

import { SUGGESTED_SEARCHES } from "../store/searchStore.js";

export function RecentSearchRail({ recentSearches, onRunQuery }) {
  const hasRecent = recentSearches.length > 0;
  const groups = [
    {
      title: "Recent Searches",
      icon: Clock3,
      items: recentSearches.slice(0, 5),
    },
    {
      title: "Suggested Searches",
      icon: Search,
      items: SUGGESTED_SEARCHES.slice(0, 5),
    },
  ].filter((group) => group.items.length);

  if (!hasRecent && !groups.length) {
    return null;
  }

  return (
    <section className="mx-auto mt-7 grid w-full max-w-6xl gap-4 px-4 lg:grid-cols-2">
      {groups.map((group, groupIndex) => {
        const Icon = group.icon;

        return (
          <motion.div
            className="rounded-lg border border-white/10 bg-white/[0.04] p-4 shadow-soft backdrop-blur-xl"
            key={group.title}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: groupIndex * 0.06, duration: 0.34 }}
          >
            <div className="mb-3 flex items-center gap-2 text-sm font-medium text-zinc-300">
              <Icon className="size-4 text-aura-mint" />
              <span>{group.title}</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {group.items.map((item) => (
                <button
                  className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-2 text-xs text-zinc-400 transition hover:border-aura-mint/40 hover:text-white"
                  key={item}
                  type="button"
                  onClick={() => onRunQuery(item)}
                >
                  {item}
                </button>
              ))}
            </div>
          </motion.div>
        );
      })}
    </section>
  );
}
