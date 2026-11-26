"use client";

import { useCallback, useState } from "react";

export function useMeasuredHeight() {
  const [height, setHeight] = useState<number | null>(null);

  const measure = useCallback((node: HTMLElement | null) => {
    if (!node) return;

    const observer = new ResizeObserver(() => setHeight(node.offsetHeight));
    observer.observe(node);

    return () => observer.disconnect();
  }, []);

  return [measure, height] as const;
}
