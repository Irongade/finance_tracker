"use client";

import { useCallback, useEffect, useState } from "react";

/**
 * A per-device preference: renders with the fallback, adopts the stored value
 * after mount (avoids SSR mismatches), and survives reloads. Deliberately not
 * in the database - each of you keeps your own.
 */
export function useLocalSetting<T>(key: string, fallback: T): [T, (v: T) => void] {
  const [value, setValue] = useState<T>(fallback);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(key);
      if (raw !== null) setValue(JSON.parse(raw) as T);
    } catch {
      // unreadable storage or corrupt value: stay on the fallback
    }
  }, [key]);

  const set = useCallback(
    (v: T) => {
      setValue(v);
      try {
        localStorage.setItem(key, JSON.stringify(v));
      } catch {
        // storage may be unavailable; the choice just doesn't persist
      }
    },
    [key],
  );

  return [value, set];
}
