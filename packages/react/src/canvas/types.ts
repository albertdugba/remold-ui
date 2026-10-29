import type { CanvasHTMLAttributes, RefObject } from "react";
import type { Painter, PainterOptions, PainterValues } from "@remold-ui/canvas";
import type { BaseProps } from "../utils/use-render-element.js";

export type RemoldCanvasState = Record<string, never>;

/** Controls that aren't props: use them from event handlers or effects. */
export interface RemoldCanvasActions<V extends PainterValues = PainterValues> {
  /** Every value where it is now. */
  readonly values: Readonly<V>;
  /** True when motion is reduced: skip flings and other extra motion in your handlers. */
  readonly still: boolean;
  /** Spring values to new targets outside of render (on a pointer move, say). */
  to: Painter<V>["to"];
  /** Jump values without springing. */
  set: Painter<V>["set"];
  /** Draw again now. */
  redraw(): void;
}

export interface RemoldCanvasProps<V extends PainterValues = PainterValues>
  extends BaseProps<RemoldCanvasState, HTMLCanvasElement>,
    Pick<PainterOptions<V>, "draw" | "spring" | "precision" | "continuous" | "clear" | "reducedMotion" | "maxPixelRatio" | "loop" | "label">,
    Omit<CanvasHTMLAttributes<HTMLCanvasElement>, "className" | "children"> {
  /**
   * Named numbers `draw` reads from `frame.values`. Change them and they spring from wherever they
   * are to the new targets.
   */
  values?: V;
  /** Receives `to`, `set` and `redraw`. */
  actionsRef?: RefObject<RemoldCanvasActions<V> | null>;
}
