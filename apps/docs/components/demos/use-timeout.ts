"use client";

import { useEffect, useRef } from "react";

export function useTimeout() {
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => () => clearTimeout(timer.current), []);

  return {
    schedule: (callback: () => void, delay: number) => {
      clearTimeout(timer.current);
      timer.current = setTimeout(callback, delay);
    },
    cancel: () => clearTimeout(timer.current),
  };
}
