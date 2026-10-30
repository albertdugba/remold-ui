import type { CanvasHTMLAttributes } from "react";
import type { GlobeArc, GlobeFocus, GlobeOptions, GlobePulseOptions } from "@remold-ui/canvas";
import type { BaseProps } from "../utils/use-render-element.js";

export type RemoldGlobeState = Record<string, never>;

/** Something that happened somewhere. Each new `id` sends out one pulse. */
export interface GlobePulse extends GlobePulseOptions {
  id: string | number;
}

/** Something that went from one place to another. Each new `id` flies one arc. */
export interface GlobeArcEvent extends GlobeArc {
  id: string | number;
}

export interface RemoldGlobeProps
  extends BaseProps<RemoldGlobeState, HTMLCanvasElement>,
    GlobeOptions,
    Omit<CanvasHTMLAttributes<HTMLCanvasElement>, "className" | "children" | "draggable"> {
  /** Recent events. A pulse goes out for every id it hasn't seen before. */
  pulses?: readonly GlobePulse[];
  /** Recent journeys. An arc flies for every id it hasn't seen before, and pulses where it lands. */
  arcs?: readonly GlobeArcEvent[];
  /** A point to turn to and hold, with an optional tag. `null` lets it spin again. */
  focus?: GlobeFocus | null;
}
