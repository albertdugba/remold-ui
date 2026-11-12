"use client";

import { useLayoutEffect, useRef, useState } from "react";

export function useMeasuredSize<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [size, setSize] = useState<{ width: number; height: number } | null>(null);

  useLayoutEffect(() => {
    const element = ref.current;
    if (!element) return;
    const measure = () => {
      const measured = { width: element.offsetWidth, height: element.offsetHeight };
      setSize((current) =>
        current && current.width === measured.width && current.height === measured.height
          ? current
          : measured,
      );
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(element, { box: "border-box" });
    return () => observer.disconnect();
  }, []);

  return [ref, size] as const;
}
