import type { CanvasHTMLAttributes } from "react";
import type { ParticlesOptions, ParticlesToOptions } from "@remold-ui/canvas";
import type { CloudPoint } from "@remold-ui/core";
import type { BaseProps } from "../utils/use-render-element.js";

/** What the dots make up. Change it to morph. */
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
    }
  | { points: readonly CloudPoint[] };

export type RemoldParticlesState = Record<string, never>;

export interface RemoldParticlesProps
  extends BaseProps<RemoldParticlesState, HTMLCanvasElement>,
    Omit<CanvasHTMLAttributes<HTMLCanvasElement>, "className" | "color">,
    Pick<ParticlesOptions, "color" | "palette" | "padding" | "pointer" | "spring" | "enter" | "reducedMotion" | "loop" | "maxPixelRatio"> {
  /** What the dots show: words, `{ text, font }`, `{ path }`, `{ image, by, threshold, pattern, jitter, details }` or `{ points }`. Change it to morph. */
  shape: ParticleShape;
  /** How many dots. Default 1200. Ignored for `{ points }`, which brings its own. */
  count?: number;
  /** What the dots show, for screen readers. Defaults to the words of a text shape. */
  label?: string;
  /** How dots find their place in the next shape. See `particles().to`. Default `"match"`. */
  pairing?: ParticlesToOptions["pairing"];
  /**
   * How dots get to the next shape. `"direct"` (the default) springs each one straight there.
   * `"scatter"` dissolves the shape into a loose, glittering cloud, then gathers it into the next;
   * pass `{ type: "scatter", spread, hold, stagger, seed }` to tune it. Reduced motion skips it.
   */
  transition?: ParticlesToOptions["transition"];
  /** Dot radius in CSS pixels. Changing it springs the dots to the new size. Default 2.5. */
  radius?: number;
  /** Dot shape. Default `"circle"`; squares are cheaper for very large clouds. Read once. */
  dot?: "circle" | "square";
}
