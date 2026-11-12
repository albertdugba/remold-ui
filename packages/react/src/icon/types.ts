import type { ElementType, ReactElement, SVGAttributes } from "react";
import type { MorphOptions, SpringConfig } from "@remold-ui/core";
import type { FrameLoop, ReducedMotion } from "@remold-ui/dom";
import type { BaseProps } from "../utils/use-render-element.js";

export interface RemoldIconState {
  animating: boolean;
}

export interface RemoldIconProps
  extends BaseProps<RemoldIconState, SVGSVGElement>,
    Omit<SVGAttributes<SVGSVGElement>, "className" | "d" | "children"> {
  icon?: ReactElement | ElementType;
  path?: string;
  spring?: SpringConfig;
  reducedMotion?: ReducedMotion;
  loop?: FrameLoop;
  match?: MorphOptions;
}
