import type { CloudPoint, PointCloudOptions, PointCloudScatter } from "@remold-ui/core";
import type { CanvasSize } from "../canvas-size";
import type { FrameLoop, ReducedMotion } from "@remold-ui/dom";

export type ParticleFill = string | CanvasGradient | CanvasPattern;

/** How shapes map onto the canvas: their own bounds fitted, CSS pixels as they are, or a shared frame fitted. */
export type ParticleFit = "contain" | "none" | { x?: number; y?: number; width: number; height: number };

export interface ParticlesToOptions {
  /** Read to screen-reader users. */
  label?: string;
  /** Spring every dot to this radius, in CSS pixels. */
  radius?: number;
  /** How dots pair with their destination shape. */
  pairing?: "match" | "index";
  /**
   * How the dots get there. `"direct"` (the default) springs each dot straight to its new place.
   * `"scatter"` dissolves the shape into a loose, glittering cloud first, then gathers it into the
   * new one; pass `{ type: "scatter", spread, hold, stagger, seed }` to tune it.
   */
  transition?: ParticleTransition;
}

/** How dots move from one shape to the next: straight there, or spreading out and gathering again. */
export type ParticleTransition = "direct" | "scatter" | ({ type: "scatter" } & PointCloudScatter);

export interface ParticlesOptions extends PointCloudOptions {
  /** The first shape. More shapes follow with `to`. A point's `tone` picks its `palette` colour. */
  points?: readonly CloudPoint[];
  /**
   * How shapes map onto the canvas. `"contain"` (the default) scales each shape's bounds to fit.
   * `"none"` takes points as the canvas's CSS pixels. A frame (`{ width, height, x?, y? }`) fits
   * that box instead of each shape's bounds, so shapes drawn in the same frame (a chart, a card)
   * keep their size and place as they change. Read once.
   */
  fit?: ParticleFit;
  /** Space kept clear round a fitted shape, in CSS pixels. Default 24. */
  padding?: number;
  /** Dot radius at full size, in CSS pixels. Default 2.5. */
  radius?: number;
  /** Default `"circle"`. Squares are cheaper to draw for very large clouds. */
  shape?: "circle" | "square";
  /** The dots' colour, or a function that creates one for the canvas size. */
  color?: ParticleFill | ((context: CanvasRenderingContext2D, size: CanvasSize) => ParticleFill);
  /** Colours by tone. Replaces `color`. Any CSS colour, including `var(--name)`, which follows theme changes. */
  palette?: readonly string[];
  /** Dots near the pointer lean away. `false` turns it off. */
  pointer?: false | { radius?: number; strength?: number };
  /** What the dots show, for screen readers. */
  label?: string;
  reducedMotion?: ReducedMotion;
  loop?: FrameLoop;
  maxPixelRatio?: number;
}

export interface Particles {
  /** How many dots make up the current shape. */
  readonly count: number;
  /** Rebuild into a new shape. */
  to(points: readonly CloudPoint[], options?: ParticlesToOptions): void;
  /** Redraw now. */
  render(): void;
  /** Resolves once the dots have stopped moving: after the latest `to` has played out, or at once if nothing is moving. */
  settled(): Promise<void>;
  /** Stop animating and remove listeners. */
  destroy(): void;
}
