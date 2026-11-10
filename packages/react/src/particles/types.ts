import type { CanvasHTMLAttributes } from "react";
import type { ParticlesOptions, ParticlesToOptions } from "@remold-ui/canvas";
import type { ParticlePoint } from "@remold-ui/canvas";
import type { Shape } from "@remold-ui/core";
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
      /** Make it a 3D relief: lighter parts stand out by up to this much. Use with `camera`. */
      depth?: number;
      /** Round the picture into a dome this tall, like a flower head. Use with `camera`. */
      bulge?: number;
      /** In 3D, how many of the image's colours to find and draw it in. Default 10. */
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
  /**
   * What the dots show: words, `{ text, font }`, `{ path }`, `{ image, by, threshold, pattern, jitter, details }`,
   * `{ points }`, or a 3D shape from `shapes` in `@remold-ui/core`. Change it to morph.
   */
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
  /**
   * Turn the dots in 3D and draw them with perspective; give `{ points }` a `z` for depth. Whether
   * there's a camera is read once; its `spin`, `tilt`, `distance` and `sway` can change, `{ spin: 0 }` to pause.
   */
  camera?: ParticlesOptions["camera"];
}
