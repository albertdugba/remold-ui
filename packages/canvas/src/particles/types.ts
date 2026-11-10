import type { PointCloudOptions, PointCloudScatter } from "@remold-ui/core";
import type { CanvasSize } from "../canvas-size";
import type { FrameLoop, ReducedMotion } from "@remold-ui/dom";

export type ParticleFill = string | CanvasGradient | CanvasPattern;

/** How shapes map onto the canvas: their own bounds fitted, CSS pixels as they are, or a shared frame fitted. */
/**
 * A dot to draw: a `CloudPoint` whose `tone` can also be a colour's name in a named palette, and
 * which can say where it sits along its shape (`order`, 0 to 1) for `pairing: "flow"`. The points
 * from `shapes` in `@remold-ui/core` are these.
 */
export interface ParticlePoint {
  x: number;
  y: number;
  z?: number;
  tone?: number | string;
  order?: number;
}

/** Colours for dots: a list a tone picks from (0 is the first, 1 the last), or colours by name. */
export type ParticlePalette = readonly string[] | Readonly<Record<string, string>>;

export type ParticleFit = "contain" | "none" | { x?: number; y?: number; width: number; height: number };

export interface ParticlesToOptions {
  /** Read to screen-reader users. */
  label?: string;
  /** Spring every dot to this radius, in CSS pixels. */
  radius?: number;
  /**
   * How dots pair with their destination shape. `"match"` (the default) sends each dot to a nearby
   * spot. `"index"` pairs dot 1 with dot 1, and so on. `"flow"` pairs them by where they sit along
   * each shape (each point's `order`, or its place along the longest side), so the change sweeps
   * through the shape as one movement.
   */
  pairing?: "match" | "index" | "flow";
  /**
   * How the dots get there. `"direct"` (the default) springs each dot straight to its new place.
   * `"scatter"` dissolves the shape into a loose, glittering cloud first, then gathers it into the
   * new one; pass `{ type: "scatter", spread, hold, stagger, seed }` to tune it.
   */
  transition?: ParticleTransition;
}

/** How dots move from one shape to the next: straight there, or spreading out and gathering again. */
export type ParticleTransition = "direct" | "scatter" | ({ type: "scatter" } & PointCloudScatter);

/**
 * A camera that turns the cloud in 3D and draws it with perspective, so each point's `z` reads as
 * depth: far dots draw smaller, near ones larger. With reduced motion it holds still.
 */
export interface ParticleCamera {
  /** How fast the cloud turns about its upright axis, in turns per second. Default 0.04; 0 holds still. */
  spin?: number;
  /** Where it starts turned to, in degrees. Default 0. */
  angle?: number;
  /**
   * Swing back and forth this many degrees either side of `angle` instead of turning all the way
   * round, one swing every `1 / spin` seconds. For flat things like photos, which turn edge-on.
   */
  sway?: number;
  /** How far it leans its top toward you, in degrees, so you look down on it. Default 20. */
  tilt?: number;
  /** How far away you are, in multiples of the shape's radius. Smaller is more dramatic. Default 4, at least 1.5. */
  distance?: number;
}

export interface ParticlesOptions extends PointCloudOptions {
  /** The first shape. More shapes follow with `to`. A point's `tone` picks its `palette` colour. */
  points?: readonly ParticlePoint[];
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
  /**
   * Colours by tone. Replaces `color`. A list, which a point's numeric `tone` picks from, or colours
   * by name (`{ gold: "#fcd34d" }`), which a point names in its `tone`. Any CSS colour, including
   * `var(--name)`, which follows theme changes.
   */
  palette?: ParticlePalette;
  /**
   * Turn the cloud in 3D (`true` for the default camera). Points' `z` is their depth, in the same units as `x` and `y`. With
   * `fit: "contain"` the whole shape, at any angle, stays inside the canvas. Not with a frame `fit`.
   */
  camera?: ParticleCamera | boolean;
  /** How overlapping dots mix. `"add"` brightens where they overlap, for glowing dots on a dark ground. Default `"normal"`. */
  blend?: "normal" | "add";
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
  to(points: readonly ParticlePoint[], options?: ParticlesToOptions): void;
  /** Redraw now. */
  render(): void;
  /**
   * Change the camera of a cloud made with one: `{ spin: 0 }` to stop it turning, say. Leaves out
   * keep their current values, and it carries on from the angle it has reached unless you pass `angle`.
   */
  setCamera(camera: ParticleCamera): void;
  /**
   * Swap the palette: for colours found in an image after the cloud was made, say. Named tones in
   * later shapes are read from it; dots already drawn take the colour at the same place in it.
   */
  setPalette(palette: ParticlePalette): void;
  /** Resolves once the dots have stopped moving: after the latest `to` has played out, or at once if nothing is moving. */
  settled(): Promise<void>;
  /** Stop animating and remove listeners. */
  destroy(): void;
}
