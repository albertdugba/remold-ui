import type { AnimatedValue, MatchPointsOptions, Morph, Point3, SpringConfig } from "@remold-ui/core";
import type { FrameLoop, ReducedMotion } from "@remold-ui/dom";
import type { Camera } from "../camera";
import type { Box3 } from "../geometry";
import type { Look, LookName, Palette, PaletteName } from "../object-looks";

export interface SceneObject {
  look: LookName | Look;
  label?: string;
  /** Read to screen-reader users when the object is focused. */
  description?: string;
  palette?: PaletteName | Palette;
  /** Whether it lifts, focuses and is reachable by keyboard. */
  interactive?: boolean;
}

/** Where an object sits in one layout. */
export interface LayoutBox {
  x: number;
  y: number;
  z?: number;
  width: number;
  depth: number;
  /** Thickness or height. */
  height?: number;
  /** 0 hides the object in this layout. */
  opacity?: number;
  /** How full the object is, from 0 to 1, for looks that hold something (such as `extrude({ glass: true })`). */
  fill?: number;
  /** How see-through the object is, from 0. */
  ghost?: number;
  /** The colour of what the object holds in this layout (see `fill`), as hex or `rgb()`. */
  color?: string;
  /** Seconds to wait before the object sets off for this layout, to stagger arrivals. */
  delay?: number;
  /** Seconds after the object sets off before its `opacity` changes, so it can appear or vanish once it has landed. */
  fadeDelay?: number;
  /** Travel to this layout's place on an arc that rises this many floor units at its highest. */
  arc?: number;
  /** Replaces the object's label in this layout. */
  label?: string;
  /** The object's outline in this layout, as SVG path data, for looks that can change shape (such as `extrude()`). */
  shape?: string;
}

export interface SceneLayout {
  /** A camera, or "fit" for a top-down diagram that fits the canvas. */
  camera?: Partial<Camera> | "fit";
  objects: Record<string, LayoutBox>;
  /** Shown to screen-reader users while this layout is on screen. */
  caption?: string;
}

/** A named place on an object for links and DOM overlays. */
export type ScenePort = "center" | "top" | "left" | "right" | "front" | "back";
/** A port, or the object's furthest point left or right on screen. */
export type AnchorPort = ScenePort | "screen-left" | "screen-right";

export type LinkRoute = "straight" | "orthogonal" | "curve" | "auto";

export interface SceneLink {
  from: string;
  to: string;
  fromPort?: ScenePort;
  toPort?: ScenePort;
  /** Default "curve". See `LinkRoute`. */
  route?: LinkRoute;
  arrow?: "start" | "end" | "both";
  label?: string;
  dashed?: boolean;
  /** Dots travel along the link (paused with reduced motion). */
  flow?: boolean;
  /** Layouts the link appears in. */
  layouts?: string[];
}

export interface SceneOptions {
  objects: Record<string, SceneObject>;
  layouts: Record<string, SceneLayout>;
  links?: SceneLink[];
  /** The first layout. Default: the first one listed. */
  initial?: string;
  /** The canvas's accessible name. */
  label?: string;
  palette?: PaletteName | Palette;
  /** Which interactions are on. */
  interact?: { hover?: boolean; tap?: boolean; drag?: boolean; keyboard?: boolean };
  /** Default `{ duration: 0.8, bounce: 0.18 }`. */
  spring?: SpringConfig;
  reducedMotion?: ReducedMotion;
  loop?: FrameLoop;
  maxPixelRatio?: number;
  /** Called when the user focuses an object (tap or keyboard) or clears focus. */
  onFocusChange?: (id: string | null) => void;
  /** Called after every frame is drawn, while anything moves. */
  onDraw?: () => void;
}

export interface PointsOptions {
  /** Edge length of each cube, in floor units. */
  size?: number;
  palette?: PaletteName | Palette;
  match?: MatchPointsOptions;
}

export interface Scene {
  readonly layout: string;
  readonly focused: string | null;
  /** Spring to another layout. */
  to(layout: string): void;
  /** Focus an object (lift it, dim the rest), or clear focus with null. */
  focus(id: string | null): void;
  /** Show a cloud of cubes. */
  points(points: readonly Point3[], options?: PointsOptions): void;
  /** The object's current (animated) box in floor units, or null if it's unknown. */
  box(id: string): Box3 | null;
  /** Where a named place on an object is on the canvas, in CSS pixels. */
  anchor(id: string, port?: AnchorPort): { x: number; y: number } | null;
  /** The frontmost interactive object at a canvas point (CSS pixels), or null. */
  pick(x: number, y: number): string | null;
  /** Redraw now. */
  render(): void;
  /** Stop animating, remove listeners and the description element. */
  destroy(): void;
}

export type Channel = AnimatedValue;

export const CHANNELS = ["x", "y", "z", "width", "depth", "height", "opacity", "fill", "ghost", "red", "green", "blue", "lift", "glow", "dim"] as const;

export type ChannelName = (typeof CHANNELS)[number];

export type ObjectChannels = Record<ChannelName, Channel>;

export interface ObjectState {
  id: string;
  colored: boolean;
  pending: { at: number; start: () => void } | null;
  fade: { at: number; to: number } | null;
  travel: { fromX: number; fromY: number; toX: number; toY: number; arc: number } | null;
  look: Look;
  outline: { morph: Morph | null; target: string | null; t: Channel };
  palette: Palette;
  label: string;
  description: string;
  interactive: boolean;
  c: ObjectChannels;
}

export interface PointState {
  x: Channel;
  y: Channel;
  z: Channel;
  size: Channel;
  leaving: boolean;
}

export interface LinkState {
  spec: SceneLink;
  opacity: Channel;
}

export type { Box3 };
