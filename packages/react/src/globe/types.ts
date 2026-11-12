import type { CanvasHTMLAttributes } from "react";
import type { GlobeArc, GlobeFocus, GlobeOptions, GlobePulseOptions } from "@remold-ui/canvas";
import type { BaseProps } from "../utils/use-render-element.js";

export type RemoldGlobeState = Record<string, never>;

export interface GlobePulse extends GlobePulseOptions {
  id: string | number;
}

export interface GlobeArcEvent extends GlobeArc {
  id: string | number;
}

export interface RemoldGlobeProps
  extends BaseProps<RemoldGlobeState, HTMLCanvasElement>,
    GlobeOptions,
    Omit<CanvasHTMLAttributes<HTMLCanvasElement>, "className" | "children" | "draggable"> {
  pulses?: readonly GlobePulse[];
  arcs?: readonly GlobeArcEvent[];
  focus?: GlobeFocus | null;
}
