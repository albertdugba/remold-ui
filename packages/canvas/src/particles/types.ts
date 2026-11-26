import type { PointCloudOptions, PointCloudScatter } from "@remold-ui/core";
import type { CanvasSize } from "../canvas-size";
import type { FrameLoop, ReducedMotion } from "@remold-ui/dom";

export type ParticleFill = string | CanvasGradient | CanvasPattern;

/** A dot to draw: a `CloudPoint` whose `tone` can also be a colour's name in a named palette. */
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
  /** How dots pair with their destination shape. */
  pairing?: "match" | "index" | "flow";
  /** How the dots get there. */
  transition?: ParticleTransition;
}

/** How dots move from one shape to the next: straight there, or spreading out and gathering again. */
export type ParticleTransition = "direct" | "scatter" | ({ type: "scatter" } & PointCloudScatter);

/** A camera that turns the cloud in 3D and draws it with perspective, so each point's `z` reads as depth. */
export interface ParticleCamera {
  /** How fast the cloud turns about its upright axis, in turns per second. */
  spin?: number;
  /** Where it starts turned to, in degrees. */
  angle?: number;
  /** Swing back and forth this many degrees either side of `angle` instead of turning all the way round. */
  sway?: number;
  /** How far it leans its top toward you, in degrees, so you look down on it. */
  tilt?: number;
  /** How far away you are, in multiples of the shape's radius. */
  distance?: number;
}

export interface ParticlesOptions extends PointCloudOptions {
  /** The first shape. More shapes follow with `to`. */
  points?: readonly ParticlePoint[];
  /** How shapes map onto the canvas. */
  fit?: ParticleFit;
  /** Space kept clear round a fitted shape, in CSS pixels. */
  padding?: number;
  /** Dot radius at full size, in CSS pixels. */
  radius?: number;
  /** Default `"circle"`. Squares are cheaper to draw for very large clouds. */
  shape?: "circle" | "square";
  /** The dots' colour, or a function that creates one for the canvas size. */
  color?: ParticleFill | ((context: CanvasRenderingContext2D, size: CanvasSize) => ParticleFill);
  /** Colours by tone. Replaces `color`. */
  palette?: ParticlePalette;
  /** Turn the cloud in 3D (`true` for the default camera). */
  camera?: ParticleCamera | boolean;
  /** How overlapping dots mix. */
  blend?: "normal" | "add";
  /** Dots near the pointer lean away. */
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
  /** Change the camera of a cloud made with one: `{ spin: 0 }` to stop it turning, say. */
  setCamera(camera: ParticleCamera): void;
  /** Swap the palette: for colours found in an image after the cloud was made, say. */
  setPalette(palette: ParticlePalette): void;
  /** Resolves once the dots have stopped moving: after the latest `to` has played out, or at once if nothing is moving. */
  settled(): Promise<void>;
  /** Stop animating and remove listeners. */
  destroy(): void;
}
