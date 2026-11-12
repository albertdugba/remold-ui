import { clusterPoints, type CloudPoint, type SpringConfig } from "@remold-ui/core";
import type { FrameLoop, ReducedMotion } from "@remold-ui/dom";
import { boxIn, sampleElementPoints } from "./element";
import { particles } from "./index";
import type { ParticleTransition } from "./types";

export interface DustOptions {
  /** Colours to sort dots into: any CSS colours, `var(--name)` included, read from `container`. */
  palette?: readonly string[];
  /** Dots per element. Default 600. */
  count?: number;
  /** Dot radius, in CSS pixels. */
  radius?: number;
  /** How far a heap reaches from the target's middle, in CSS pixels. */
  heap?: number;
  /** Whether each element's own background becomes dots too. */
  background?: boolean;
  /** How the dots travel. */
  transition?: ParticleTransition;
  spring?: SpringConfig;
  reducedMotion?: ReducedMotion;
  loop?: FrameLoop;
}

export interface Dust {
  /** Breaks `elements` into dots that pour into `target`. */
  away(elements: Element | readonly Element[], target: Element): Promise<void>;
  /** The reverse: dots pour out of `source` and settle into `elements`. */
  back(elements: Element | readonly Element[], source: Element): Promise<void>;
  /** Stops every pour in flight and removes its canvas. */
  destroy(): void;
}

const GATHER: ParticleTransition = { type: "scatter", spread: 0.25, hold: 0.05, stagger: 0.45 };
const DEFAULT_COUNT = 600;
const DEFAULT_HEAP = 6;
const DEFAULT_RADIUS = 1.2;
const DEFAULT_SPRING: SpringConfig = { duration: 0.6, bounce: 0.1 };
const OVERLAY_STYLE = { position: "absolute", inset: "0", width: "100%", height: "100%", pointerEvents: "none" };

function ensurePositioned(container: HTMLElement) {
  const position = typeof getComputedStyle === "function" ? getComputedStyle(container).position : "relative";

  if (!position || position === "static") container.style.position = "relative";
}

function overlay(container: HTMLElement): HTMLCanvasElement {
  const canvas = document.createElement("canvas");

  canvas.setAttribute("aria-hidden", "true");
  Object.assign(canvas.style, OVERLAY_STYLE);
  container.append(canvas);

  return canvas;
}

function shapeOf(elements: Element | readonly Element[], container: HTMLElement, options: DustOptions): CloudPoint[] {
  const list: readonly Element[] = elements instanceof Element ? [elements] : elements;

  return list.flatMap((element) =>
    sampleElementPoints(element, {
      relativeTo: container,
      count: options.count ?? DEFAULT_COUNT,
      palette: options.palette,
      background: options.background ?? false,
    }),
  );
}

function heapAt(shape: CloudPoint[], spot: Element, container: HTMLElement, options: DustOptions): CloudPoint[] {
  const box = boxIn(spot, container);

  return clusterPoints(shape, { x: box.x + box.width / 2, y: box.y + box.height / 2, radius: options.heap ?? DEFAULT_HEAP });
}

/** Turns elements into dust that pours into another element, and back. */
export function dust(container: HTMLElement, options: DustOptions = {}): Dust {
  const pours = new Set<() => void>();

  ensurePositioned(container);

  const pour = async (elements: Element | readonly Element[], spot: Element, out: boolean) => {
    const shape = shapeOf(elements, container, options);

    if (shape.length === 0) return;

    const heap = heapAt(shape, spot, container, options);
    const canvas = overlay(container);

    const dots = particles(canvas, {
      points: out ? heap : shape,
      palette: options.palette,
      radius: options.radius ?? DEFAULT_RADIUS,
      fit: "none",
      pointer: false,
      spring: options.spring ?? DEFAULT_SPRING,
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
