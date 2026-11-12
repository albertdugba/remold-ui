import type { CanvasHTMLAttributes, RefObject } from "react";
import type { Painter, PainterOptions, PainterValues } from "@remold-ui/canvas";
import type { BaseProps } from "../utils/use-render-element.js";

export type RemoldCanvasState = Record<string, never>;

export interface RemoldCanvasActions<V extends PainterValues = PainterValues> {
  readonly values: Readonly<V>;
  readonly still: boolean;
  to: Painter<V>["to"];
  set: Painter<V>["set"];
  redraw(): void;
}

export interface RemoldCanvasProps<V extends PainterValues = PainterValues>
  extends BaseProps<RemoldCanvasState, HTMLCanvasElement>,
    Pick<PainterOptions<V>, "draw" | "spring" | "precision" | "continuous" | "clear" | "reducedMotion" | "maxPixelRatio" | "loop" | "label">,
    Omit<CanvasHTMLAttributes<HTMLCanvasElement>, "className" | "children"> {
  values?: V;
  actionsRef?: RefObject<RemoldCanvasActions<V> | null>;
}
