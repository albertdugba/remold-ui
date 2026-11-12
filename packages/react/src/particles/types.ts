import type { CanvasHTMLAttributes } from "react";
import type { ParticlesOptions, ParticlesToOptions } from "@remold-ui/canvas";
import type { ParticlePoint } from "@remold-ui/canvas";
import type { Shape } from "@remold-ui/core";
import type { BaseProps } from "../utils/use-render-element.js";

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
  shape: ParticleShape;
  count?: number;
  label?: string;
  pairing?: ParticlesToOptions["pairing"];
  transition?: ParticlesToOptions["transition"];
  radius?: number;
  dot?: "circle" | "square";
  camera?: ParticlesOptions["camera"];
}
