/**
 * Dust: parts of the page that break into dots and pour somewhere else.
 *
 * ```ts
 * const trail = dust(card, { palette: ["var(--ink)", "var(--muted)", "var(--surface)"] });
 * row.hidden = true;            // hide it as its dust takes over
 * await trail.away(row, binIcon);
 * await trail.back(row, binIcon); // undo: the same dots pour back out
 * ```
 *
 * Each pour samples the elements as they look, draws the dots on a canvas laid over `container`,
 * and removes the canvas once they land, so nothing is left running between pours.
 */
import { clusterPoints, type CloudPoint, type SpringConfig } from "@remold-ui/core";
import type { FrameLoop, ReducedMotion } from "@remold-ui/dom";
import { boxIn, sampleElementPoints } from "./element";
import { particles } from "./index";
import type { ParticleTransition } from "./types";

export interface DustOptions {
  /** Colours to sort dots into: any CSS colours, `var(--name)` included, read from `container`. The last should match what the elements sit on. */
  palette?: readonly string[];
  /** Dots per element. Default 600. */
  count?: number;
  /** Dot radius, in CSS pixels. Default 1.2. */
  radius?: number;
  /** How far a heap reaches from the target's middle, in CSS pixels. Default 6. */
  heap?: number;
  /** Whether each element's own background becomes dots too. Default false: only what's drawn on it. */
  background?: boolean;
  /** How the dots travel. Default a short scatter that gathers like a breath. */
  transition?: ParticleTransition;
  spring?: SpringConfig;
  reducedMotion?: ReducedMotion;
  loop?: FrameLoop;
}

export interface Dust {
  /** Breaks `elements` into dots that pour into `target`. Hide the elements as you call it; it resolves once the dots land. */
  away(elements: Element | readonly Element[], target: Element): Promise<void>;
  /** The reverse: dots pour out of `source` and settle into `elements`. Show them once it resolves. */
  back(elements: Element | readonly Element[], source: Element): Promise<void>;
  /** Stops every pour in flight and removes its canvas. */
  destroy(): void;
}

const GATHER: ParticleTransition = { type: "scatter", spread: 0.25, hold: 0.05, stagger: 0.45 };

export function dust(container: HTMLElement, options: DustOptions = {}): Dust {
  const pours = new Set<() => void>();
  // The canvas covers the container, so the container has to be what it's positioned against.
  const position = typeof getComputedStyle === "function" ? getComputedStyle(container).position : "relative";
  if (!position || position === "static") container.style.position = "relative";

  const pour = async (elements: Element | readonly Element[], spot: Element, out: boolean) => {
    const list: readonly Element[] = elements instanceof Element ? [elements] : elements;
    const shape: CloudPoint[] = list.flatMap((element) =>
      sampleElementPoints(element, {
        relativeTo: container,
        count: options.count ?? 600,
        palette: options.palette,
        background: options.background ?? false,
      }),
    );
    if (shape.length === 0) return;
    const box = boxIn(spot, container);
    const heap = clusterPoints(shape, { x: box.x + box.width / 2, y: box.y + box.height / 2, radius: options.heap ?? 6 });

    const canvas = document.createElement("canvas");
    canvas.setAttribute("aria-hidden", "true");
    Object.assign(canvas.style, { position: "absolute", inset: "0", width: "100%", height: "100%", pointerEvents: "none" });
    container.append(canvas);
    // The first shape is drawn at once and at full size, so the dots stand exactly where the elements were.
    const dots = particles(canvas, {
      points: out ? heap : shape,
      palette: options.palette,
      radius: options.radius ?? 1.2,
      fit: "none",
      pointer: false,
      spring: options.spring ?? { duration: 0.6, bounce: 0.1 },
      reducedMotion: options.reducedMotion,
      loop: options.loop,
    });
    const end = () => {
      dots.destroy();
      canvas.remove();
      pours.delete(end);
    };
    pours.add(end);
    dots.to(out ? shape : heap, { pairing: "index", transition: options.transition ?? GATHER });
    await dots.settled();
    end();
  };

  return {
    away: (elements, target) => pour(elements, target, false),
    back: (elements, source) => pour(elements, source, true),
    destroy() {
      for (const end of [...pours]) end();
    },
  };
}
