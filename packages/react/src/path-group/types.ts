import type { SVGAttributes } from "react";
import type { MorphOptions, SpringConfig } from "@remold-ui/core";
import type { FrameLoop, ReducedMotion } from "@remold-ui/dom";
import type { BaseProps } from "../utils/use-render-element.js";

export interface PathSpec extends Omit<SVGAttributes<SVGPathElement>, "d"> {
  id: string;
  path: string;
}

export interface RemoldPathGroupState {
  paths: number;
}

export interface RemoldPathGroupProps
  extends BaseProps<RemoldPathGroupState, SVGSVGElement>,
    Omit<SVGAttributes<SVGSVGElement>, "className" | "children"> {
  paths: readonly PathSpec[];
  spring?: SpringConfig;
  reducedMotion?: ReducedMotion;
  loop?: FrameLoop;
  match?: MorphOptions;
}
