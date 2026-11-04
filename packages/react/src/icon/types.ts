import type { ElementType, ReactElement, SVGAttributes } from "react";
import type { MorphOptions, SpringConfig } from "@remold-ui/core";
import type { FrameLoop, ReducedMotion } from "@remold-ui/dom";
import type { BaseProps } from "../utils/use-render-element.js";

export interface RemoldIconState {
  /** The icon is morphing. Also set as `data-rm-animating`. */
  animating: boolean;
}

export interface RemoldIconProps
  extends BaseProps<RemoldIconState, SVGSVGElement>,
    Omit<SVGAttributes<SVGSVGElement>, "className" | "d" | "children"> {
  /**
   * The icon to show: an element (`<Heart />`, `<svg>…</svg>`) or a component (`Heart`). From
   * Lucide, Heroicons or your own files: anything that renders an `<svg>` of paths, circles,
   * ellipses, rectangles, lines, polylines and polygons. Its viewBox, fill and stroke are used
   * unless you set them here. Give this or `path`.
   */
  icon?: ReactElement | ElementType;
  /** The icon as SVG path data instead of `icon`. Several strokes go in one path (`"M4 6h16M4 12h16"`). */
  path?: string;
  /** Default `springs.snappy`. */
  spring?: SpringConfig;
  reducedMotion?: ReducedMotion;
  loop?: FrameLoop;
  /** How strokes are paired. Defaults to `{ padding: "merge" }`, which suits outline icons. */
  match?: MorphOptions;
}
