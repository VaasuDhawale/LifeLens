import { useEffect, useMemo, useState } from "react";

import { getHealth, getIndexingStatus, type IndexingStatusResponse } from "../services/api.ts";

type BackendStatus = {
  online: boolean;
  checking: boolean;
  message: string;
  indexedFiles: number;
  pendingFiles: number;
  indexingState: IndexingStatusResponse["state"] | "unknown";
  hasIndexedFiles: boolean;
};

export function useBackendStatus(pollMs = 6000): BackendStatus {
  const [online, setOnline] = useState(false);
  const [checking, setChecking] = useState(true);
  const [indexingStatus, setIndexingStatus] = useState<IndexingStatusResponse | null>(null);

  useEffect(() => {
    let active = true;

    async function refreshStatus() {
      const controller = new AbortController();
      const timeout = window.setTimeout(() => controller.abort(), 3500);

      try {
        await getHealth(controller.signal);
        const nextIndexingStatus = await getIndexingStatus(controller.signal);

        if (active) {
          setOnline(true);
          setIndexingStatus(nextIndexingStatus);
          setChecking(false);
        }
      } catch {
        if (active) {
          setOnline(false);
          setIndexingStatus(null);
          setChecking(false);
        }
      } finally {
        window.clearTimeout(timeout);
      }
    }

    refreshStatus();
    const timer = window.setInterval(refreshStatus, pollMs);

    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, [pollMs]);

  return useMemo(() => {
    const indexedFiles = indexingStatus?.indexed_files ?? 0;
    const pendingFiles = indexingStatus?.pending_files ?? 0;
    const indexingState = indexingStatus?.state ?? "unknown";

    return {
      online,
      checking,
      indexedFiles,
      pendingFiles,
      indexingState,
      hasIndexedFiles: indexedFiles > 0,
      message: getStatusMessage({ online, checking, indexedFiles, pendingFiles, indexingState }),
    };
  }, [checking, indexingStatus, online]);
}

function getStatusMessage({
  online,
  checking,
  indexedFiles,
  pendingFiles,
  indexingState,
}: {
  online: boolean;
  checking: boolean;
  indexedFiles: number;
  pendingFiles: number;
  indexingState: BackendStatus["indexingState"];
}) {
  if (checking) {
    return "Checking backend";
  }
  if (!online) {
    return "Backend offline";
  }
  if (indexingState === "running") {
    return `${pendingFiles} pending`;
  }
  if (indexedFiles === 0) {
    return "No files indexed";
  }
  return `${indexedFiles} indexed`;
}
