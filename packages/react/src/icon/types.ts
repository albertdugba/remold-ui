import type { ElementType, ReactElement, SVGAttributes } from "react";
import type { MorphOptions, SpringConfig } from "@remold-ui/core";
import type { FrameLoop, ReducedMotion } from "@remold-ui/dom";
import type { BaseProps } from "../utils/use-render-element.js";

export interface RemoldIconState {
  /** The icon is morphing. */
  animating: boolean;
}

export interface RemoldIconProps
  extends BaseProps<RemoldIconState, SVGSVGElement>,
    Omit<SVGAttributes<SVGSVGElement>, "className" | "d" | "children"> {
  /** The icon to show: an element (`<Heart />`, `<svg>…</svg>`) or a component (`Heart`). */
  icon?: ReactElement | ElementType;
  /** The icon as SVG path data instead of `icon`. */
  path?: string;
  /** Default `springs.snappy`. */
  spring?: SpringConfig;
  reducedMotion?: ReducedMotion;
  loop?: FrameLoop;
  /** How strokes are paired. */
  match?: MorphOptions;
}
