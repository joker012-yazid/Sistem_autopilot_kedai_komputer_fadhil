"use client";

import { useEffect, useCallback } from "react";

const STORAGE_KEY_PREFIX = "fadhil-draft-";

export function useDraftAutosave<T extends Record<string, unknown>>(
  key: string,
  data: T,
  debounceMs = 1000
) {
  const storageKey = `${STORAGE_KEY_PREFIX}${key}`;

  useEffect(() => {
    const timer = setTimeout(() => {
      try {
        localStorage.setItem(storageKey, JSON.stringify(data));
      } catch {
        // Ignore quota errors
      }
    }, debounceMs);

    return () => clearTimeout(timer);
  }, [data, storageKey, debounceMs]);

  const restoreDraft = useCallback((): T | null => {
    try {
      const raw = localStorage.getItem(storageKey);
      if (!raw) return null;
      return JSON.parse(raw) as T;
    } catch {
      return null;
    }
  }, [storageKey]);

  const clearDraft = useCallback(() => {
    localStorage.removeItem(storageKey);
  }, [storageKey]);

  return { restoreDraft, clearDraft };
}

