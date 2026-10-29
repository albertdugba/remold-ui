"use client";
/**
 * Where a demo's popups (menus, popovers, tooltips) mount. On a page of its own that's <body>; when
 * the demo is shown as a scaled preview (the components page), the preview provides a layer inside
 * itself, so the popups stay in the card and scale with it instead of escaping onto the page.
 */
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

const PortalContext = createContext<HTMLElement | null>(null);
const PreviewContext = createContext(false);

/** Marks everything inside as drawn in a preview card, with its popups going to `layer`. */
export function PreviewScope({ layer, children }: { layer: HTMLElement | null; children: ReactNode }) {
  return (
    <PreviewContext.Provider value={true}>
      <PortalContext.Provider value={layer}>{children}</PortalContext.Provider>
    </PreviewContext.Provider>
  );
}

/** The element to portal into: the preview's layer if there is one, else <body> once mounted. */
export function usePortalContainer(): HTMLElement | null {
  const inside = useContext(PortalContext);
  const [body, setBody] = useState<HTMLElement | null>(null);
  useEffect(() => setBody(document.body), []);
  return inside ?? body;
}

/** Whether this is drawn inside a preview card, which is a link itself: nested links aren't allowed. */
export function useInPreview(): boolean {
  return useContext(PreviewContext);
}
