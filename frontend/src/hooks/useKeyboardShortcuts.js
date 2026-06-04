import { useEffect } from "react";

export function useKeyboardShortcuts(shortcuts) {
  useEffect(() => {
    function handleKeyDown(event) {
      for (const shortcut of shortcuts) {
        const target = event.target;
        const isEditable =
          target instanceof HTMLInputElement ||
          target instanceof HTMLTextAreaElement ||
          target?.isContentEditable;
        if (isEditable && !shortcut.allowInInput) {
          continue;
        }

        const matchesKey = event.key.toLowerCase() === shortcut.key.toLowerCase();
        const matchesMeta = shortcut.meta ? event.metaKey || event.ctrlKey : true;
        const matchesShift = shortcut.shift ? event.shiftKey : true;

        if (matchesKey && matchesMeta && matchesShift) {
          event.preventDefault();
          shortcut.handler(event);
          return;
        }
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [shortcuts]);
}
