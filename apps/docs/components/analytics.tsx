"use client";

import { GoogleAnalytics } from "@next/third-parties/google";
import { useEffect } from "react";
import { track } from "@/lib/analytics";

const GA_ID = process.env.NODE_ENV === "production" ? process.env.NEXT_PUBLIC_GA_ID : undefined;

const currentPage = () => window.location.pathname.split("/").filter(Boolean).at(-1) ?? "";

const LIBRARY_BUTTONS: Record<string, () => void> = {
  "Copy Markdown": () => track("Copy markdown", { component: currentPage(), source: "page" }),
  "Copy Text": () => track("Copy code", { component: currentPage(), source: "code block" }),
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

  return GA_ID ? <GoogleAnalytics gaId={GA_ID} /> : null;
}
