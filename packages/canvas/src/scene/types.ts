import type { AnimatedValue, MatchPointsOptions, Morph, Point3, SpringConfig } from "@remold-ui/core";
import type { FrameLoop, ReducedMotion } from "@remold-ui/dom";
import type { Camera } from "../camera";
import type { Box3 } from "../geometry";
import type { Look, LookName, Palette, PaletteName } from "../object-looks";

export interface SceneObject {
  look: LookName | Look;
  label?: string;
  description?: string;
  palette?: PaletteName | Palette;
  interactive?: boolean;
}

export interface LayoutBox {
  x: number;
  y: number;
  z?: number;
  width: number;
  depth: number;
  height?: number;
  opacity?: number;
  fill?: number;
  ghost?: number;
  color?: string;
  delay?: number;
  fadeDelay?: number;
  arc?: number;
  label?: string;
  shape?: string;
}

export interface SceneLayout {
  camera?: Partial<Camera> | "fit";
  objects: Record<string, LayoutBox>;
  caption?: string;
}

export type ScenePort = "center" | "top" | "left" | "right" | "front" | "back";
export type AnchorPort = ScenePort | "screen-left" | "screen-right";

export type LinkRoute = "straight" | "orthogonal" | "curve" | "auto";

export interface SceneLink {
  from: string;
  to: string;
  fromPort?: ScenePort;
  toPort?: ScenePort;
  route?: LinkRoute;
  arrow?: "start" | "end" | "both";
  label?: string;
  dashed?: boolean;
  flow?: boolean;
  layouts?: string[];
}

export interface SceneOptions {
  objects: Record<string, SceneObject>;
  layouts: Record<string, SceneLayout>;
  links?: SceneLink[];
  initial?: string;
  label?: string;
  palette?: PaletteName | Palette;
  interact?: { hover?: boolean; tap?: boolean; drag?: boolean; keyboard?: boolean };
  spring?: SpringConfig;
  reducedMotion?: ReducedMotion;
  loop?: FrameLoop;
  maxPixelRatio?: number;
  onFocusChange?: (id: string | null) => void;
  onDraw?: () => void;
}

export interface PointsOptions {
  size?: number;
  palette?: PaletteName | Palette;
  match?: MatchPointsOptions;
}

export interface Scene {
  readonly layout: string;
  readonly focused: string | null;
  to(layout: string): void;
  focus(id: string | null): void;
  points(points: readonly Point3[], options?: PointsOptions): void;
  box(id: string): Box3 | null;
  anchor(id: string, port?: AnchorPort): { x: number; y: number } | null;
  pick(x: number, y: number): string | null;
  render(): void;
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
