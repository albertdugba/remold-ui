"use client";

import { useEffect } from "react";
import { track } from "@/lib/analytics";

const LIBRARY_BUTTONS: Record<string, () => void> = {
  "Copy Markdown": () => track("Copy markdown"),
  "Copy Text": () => track("Copy code", { source: "code block" }),
};

export function Analytics() {
  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      const label = (event.target as Element | null)?.closest("button")?.textContent?.trim();
      if (label) LIBRARY_BUTTONS[label]?.();
    };
    document.addEventListener("click", onClick, { capture: true });
    return () => document.removeEventListener("click", onClick, { capture: true });
  }, []);

  return null;
}
