"use client";

import { useEffect, useRef, useState } from "react";

/**
 * The one orchestrated motion (section 7.2): figures settle with a single
 * 300ms count-up on first render, then follow the target directly.
 * Honours prefers-reduced-motion.
 */
export function useCountUp(target: number, duration = 300): number {
  const [value, setValue] = useState(target);
  const animated = useRef(false);

  useEffect(() => {
    if (animated.current) {
      setValue(target);
      return;
    }
    animated.current = true;
    if (typeof window === "undefined" || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setValue(target);
      return;
    }
    const start = performance.now();
    let frame = 0;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - (1 - t) ** 3;
      setValue(target * eased);
      if (t < 1) frame = requestAnimationFrame(tick);
    };
    setValue(0);
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [target, duration]);

  return value;
}
