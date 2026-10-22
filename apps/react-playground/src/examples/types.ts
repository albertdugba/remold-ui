/**
 * What every example provides: a demo that can play itself (for its card on the landing page)
 * or be driven by hand (on its own page), and the documentation around it.
 */
import { useEffect, useRef, type ComponentType, type ReactNode } from "react";
import { useMotion } from "../motion";

export interface DemoProps {
  /** Shown as a small live preview on a card, rather than as the full example. */
  preview: boolean;
  /** Step through the demo's states on a timer. On for a visible card, off once someone takes over. */
  autoplay: boolean;
}

export interface ComponentUse {
  /** The part or function, as written in code. */
  name: string;
  /** What it does in this example. */
  role: string;
}

/** The collections the gallery groups examples into. */
export type Category = "Text" | "Icons" | "SVG" | "Interfaces" | "Fintech" | "Canvas";

export interface Collection {
  /** Used in the address: `#/canvas`. */
  id: string;
  category: Category;
  /** One line for the card. */
  summary: string;
  headline: ReactNode;
  lead: string;
  /** The example whose live preview stands for the collection on its card. */
  featured: string;
}

export interface Example {
  /** Used in the address, after its collection: `#/canvas/wallet`. */
  id: string;
  category: Category;
  title: string;
  /** One line for the card. */
  summary: string;
  headline: ReactNode;
  lead: string;
  tries: ReactNode[];
  code: string;
  uses: ComponentUse[];
  /** How the preview is framed on its card. */
  frame: "window" | "panel";
  Demo: ComponentType<DemoProps>;
}

/**
 * Call `step` every `interval` ms while `enabled`, with an increasing counter. Slow motion
 * stretches the timing so a preview never outruns its own animations.
 */
export function useAutoplay(enabled: boolean, interval: number, step: (count: number) => void): void {
  const { slow } = useMotion();
  const latest = useRef(step);
  latest.current = step;
  useEffect(() => {
    if (!enabled) return;
    let count = 0;
    const timer = setInterval(() => latest.current(count++), interval * (slow ? 3 : 1));
    return () => clearInterval(timer);
  }, [enabled, interval, slow]);
}
