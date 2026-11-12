import type { CanvasHTMLAttributes } from "react";
import type { ParticlesOptions, ParticlesToOptions } from "@remold-ui/canvas";
import type { ParticlePoint } from "@remold-ui/canvas";
import type { Shape } from "@remold-ui/core";
import type { BaseProps } from "../utils/use-render-element.js";

/** What the dots make up. */
export type ParticleShape =
  | string
  | { text: string; font?: string }
  | { path: string; fillRule?: "nonzero" | "evenodd"; mode?: "fill" | "outline" }
  | {
      image: string;
      by?: "alpha" | "dark" | "light" | "saturation";
      threshold?: number;
      pattern?: "hex" | "grid";
      jitter?: number;
      details?: readonly { x: number; y: number; tone?: number }[];
      depth?: number;
      bulge?: number;
      colors?: number;
    }
  | { points: readonly ParticlePoint[] }
  | Shape;

export type RemoldParticlesState = Record<string, never>;

export interface RemoldParticlesProps
  extends BaseProps<RemoldParticlesState, HTMLCanvasElement>,
    Omit<CanvasHTMLAttributes<HTMLCanvasElement>, "className" | "color">,
    Pick<
      ParticlesOptions,
      "color" | "palette" | "fit" | "padding" | "pointer" | "spring" | "enter" | "reducedMotion" | "loop" | "maxPixelRatio" | "blend"
    > {
  /** What the dots show: words. */
  shape: ParticleShape;
  /** How many dots. Default 1200. */
  count?: number;
  /** What the dots show, for screen readers. */
  label?: string;
  /** How dots find their place in the next shape. */
  pairing?: ParticlesToOptions["pairing"];
  /** How dots get to the next shape. */
  transition?: ParticlesToOptions["transition"];
  /** Dot radius in CSS pixels. */
  radius?: number;
  /** Dot shape. Default `"circle"`; squares are cheaper for very large clouds. */
  dot?: "circle" | "square";
  /** Turn the dots in 3D and draw them with perspective; give `{ points }` a `z` for depth. */
  camera?: ParticlesOptions["camera"];
}
