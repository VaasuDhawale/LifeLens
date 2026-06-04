import { Command, Search, Sparkles, X } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useMemo, useState } from "react";

import { paletteVariants } from "../animations/variants.js";
import { SUGGESTED_SEARCHES, SMART_COLLECTIONS } from "../store/searchStore.js";

export function CommandPalette({
  open,
  onClose,
  onRunQuery,
  recentSearches,
  onSelectCollection,
}) {
  const [value, setValue] = useState("");

  useEffect(() => {
    if (open) {
      setValue("");
    }
  }, [open]);

  const items = useMemo(() => {
    const collectionItems = SMART_COLLECTIONS.map((collection) => ({
      id: collection.id,
      label: collection.title,
      sublabel: collection.query,
      type: "collection",
      value: collection,
    }));
    const searchItems = [...recentSearches, ...SUGGESTED_SEARCHES].map((query) => ({
      id: query,
      label: query,
      sublabel: "Search",
      type: "search",
      value: query,
    }));
    const allItems = [...collectionItems, ...searchItems];
    const normalizedValue = value.trim().toLowerCase();

    if (!normalizedValue) {
      return allItems.slice(0, 9);
    }

    return allItems
      .filter((item) => `${item.label} ${item.sublabel}`.toLowerCase().includes(normalizedValue))
      .slice(0, 9);
  }, [recentSearches, value]);

  function runItem(item) {
    if (item.type === "collection") {
      onSelectCollection(item.value);
    } else {
      onRunQuery(item.value);
    }
    onClose();
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 grid place-items-start bg-black/45 px-4 pt-24 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onMouseDown={onClose}
        >
          <motion.div
            className="mx-auto w-full max-w-2xl overflow-hidden rounded-lg border border-white/10 bg-ink-900/96 shadow-glass backdrop-blur-2xl"
            variants={paletteVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className="grid grid-cols-[auto_1fr_auto] items-center gap-3 border-b border-white/10 p-4">
              <Command className="size-5 text-aura-mint" />
              <input
                className="h-10 bg-transparent text-base text-white outline-none placeholder:text-zinc-600"
                value={value}
                autoFocus
                placeholder="Search commands and collections"
                onChange={(event) => setValue(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && items[0]) {
                    runItem(items[0]);
                  }
                  if (event.key === "Escape") {
                    onClose();
                  }
                }}
              />
              <button
                className="grid size-9 place-items-center rounded-full text-zinc-500 transition hover:bg-white/[0.06] hover:text-white"
                type="button"
                aria-label="Close command palette"
                onClick={onClose}
              >
                <X className="size-4" />
              </button>
            </div>

            <div className="max-h-[460px] overflow-y-auto p-2">
              {items.map((item) => (
                <button
                  className="flex w-full items-center gap-3 rounded-lg px-4 py-3 text-left transition hover:bg-white/[0.06]"
                  key={`${item.type}-${item.id}`}
                  type="button"
                  onClick={() => runItem(item)}
                >
                  <div className="grid size-9 place-items-center rounded-xl bg-white/[0.05] text-aura-mint ring-1 ring-white/10">
                    {item.type === "collection" ? <Sparkles className="size-4" /> : <Search className="size-4" />}
                  </div>
                  <div className="min-w-0">
                    <div className="truncate text-sm font-medium text-white">{item.label}</div>
                    <div className="truncate text-xs text-zinc-500">{item.sublabel}</div>
                  </div>
                </button>
              ))}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
