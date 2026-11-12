import type { PointCloudOptions, PointCloudScatter } from "@remold-ui/core";
import type { CanvasSize } from "../canvas-size";
import type { FrameLoop, ReducedMotion } from "@remold-ui/dom";

export type ParticleFill = string | CanvasGradient | CanvasPattern;

export interface ParticlePoint {
  x: number;
  y: number;
  z?: number;
  tone?: number | string;
  order?: number;
}

export type ParticlePalette = readonly string[] | Readonly<Record<string, string>>;

export type ParticleFit = "contain" | "none" | { x?: number; y?: number; width: number; height: number };

export interface ParticlesToOptions {
  label?: string;
  radius?: number;
  pairing?: "match" | "index" | "flow";
  transition?: ParticleTransition;
}

export type ParticleTransition = "direct" | "scatter" | ({ type: "scatter" } & PointCloudScatter);

export interface ParticleCamera {
  spin?: number;
  angle?: number;
  sway?: number;
  tilt?: number;
  distance?: number;
}

export interface ParticlesOptions extends PointCloudOptions {
  points?: readonly ParticlePoint[];
  fit?: ParticleFit;
  padding?: number;
  radius?: number;
  shape?: "circle" | "square";
  color?: ParticleFill | ((context: CanvasRenderingContext2D, size: CanvasSize) => ParticleFill);
  palette?: ParticlePalette;
  camera?: ParticleCamera | boolean;
  blend?: "normal" | "add";
  pointer?: false | { radius?: number; strength?: number };
  label?: string;
  reducedMotion?: ReducedMotion;
  loop?: FrameLoop;
  maxPixelRatio?: number;
}

export interface Particles {
  readonly count: number;
  to(points: readonly ParticlePoint[], options?: ParticlesToOptions): void;
  render(): void;
  setCamera(camera: ParticleCamera): void;
  setPalette(palette: ParticlePalette): void;
  settled(): Promise<void>;
  destroy(): void;
}
