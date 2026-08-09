import { useEffect, useRef, useState } from "react";

export type AutosaveStatus = "idle" | "pending" | "saving" | "saved" | "error";

type Options = {
  enabled: boolean;
  /** Change this (e.g. page id) to treat the next snapshot as the baseline. */
  resetKey?: string;
  /** Stable snapshot of the data that should be persisted. */
  snapshot: string;
  delayMs?: number;
  save: () => Promise<void>;
};

/**
 * Debounced autosave. Calls `save` when `snapshot` changes and differs from the last successful save.
 */
export function useAutosave({ enabled, resetKey, snapshot, delayMs = 1500, save }: Options): AutosaveStatus {
  const [status, setStatus] = useState<AutosaveStatus>("idle");
  const lastSavedRef = useRef<string | null>(null);
  const saveRef = useRef(save);
  const inFlightRef = useRef(false);
  const queuedRef = useRef<string | null>(null);

  useEffect(() => {
    saveRef.current = save;
  }, [save]);

  useEffect(() => {
    lastSavedRef.current = null;
    queuedRef.current = null;
    setStatus("idle");
  }, [resetKey]);

  useEffect(() => {
    if (!enabled) {
      setStatus("idle");
      return;
    }
    if (lastSavedRef.current === null) {
      lastSavedRef.current = snapshot;
      setStatus("idle");
      return;
    }
    if (snapshot === lastSavedRef.current) {
      return;
    }

    setStatus("pending");
    const timer = window.setTimeout(() => {
      const run = async (target: string) => {
        if (inFlightRef.current) {
          queuedRef.current = target;
          return;
        }
        inFlightRef.current = true;
        setStatus("saving");
        try {
          await saveRef.current();
          lastSavedRef.current = target;
          setStatus("saved");
        } catch {
          setStatus("error");
        } finally {
          inFlightRef.current = false;
          const queued = queuedRef.current;
          queuedRef.current = null;
          if (queued && queued !== lastSavedRef.current) {
            void run(queued);
          }
        }
      };
      void run(snapshot);
    }, delayMs);

    return () => window.clearTimeout(timer);
  }, [enabled, snapshot, delayMs]);

  useEffect(() => {
    if (!enabled) {
      lastSavedRef.current = null;
    }
  }, [enabled]);

  return status;
}

export function autosaveLabel(status: AutosaveStatus): string | null {
  switch (status) {
    case "pending":
      return "Unsaved changes…";
    case "saving":
      return "Saving…";
    case "saved":
      return "Saved";
    case "error":
      return "Autosave failed";
    default:
      return null;
  }
}
