import type { CanvasHTMLAttributes, RefObject } from "react";
import type { DotGrid, DotGridOptions } from "@remold-ui/canvas";
import type { BaseProps } from "../utils/use-render-element.js";

export type RemoldDotGridState = Record<string, never>;

/** Controls that aren't props: drive the glow from a tour or a demo. */
export type RemoldDotGridActions = Pick<DotGrid, "hover" | "ripple">;

export interface RemoldDotGridProps
  extends BaseProps<RemoldDotGridState, HTMLCanvasElement>,
    Omit<DotGridOptions, "track">,
    Omit<CanvasHTMLAttributes<HTMLCanvasElement>, "className" | "children"> {
  /** Receives `hover` and `ripple`. */
  actionsRef?: RefObject<RemoldDotGridActions | null>;
}
