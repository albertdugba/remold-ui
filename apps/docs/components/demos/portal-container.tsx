"use client";
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

const PortalContext = createContext<HTMLElement | null>(null);
const PreviewContext = createContext(false);

export function PreviewScope({ layer, children }: { layer: HTMLElement | null; children: ReactNode }) {
  return (
    <PreviewContext.Provider value={true}>
      <PortalContext.Provider value={layer}>{children}</PortalContext.Provider>
    </PreviewContext.Provider>
  );
}

export function usePortalContainer(): HTMLElement | null {
  const inside = useContext(PortalContext);
  const [body, setBody] = useState<HTMLElement | null>(null);
  useEffect(() => setBody(document.body), []);
  return inside ?? body;
}

export function useInPreview(): boolean {
  return useContext(PreviewContext);
}
