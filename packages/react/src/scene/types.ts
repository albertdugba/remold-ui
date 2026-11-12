import type { CanvasHTMLAttributes, RefObject } from "react";
import type { AnchorPort, Scene, SceneOptions } from "@remold-ui/canvas";
import type { BaseProps } from "../utils/use-render-element.js";

export interface RemoldSceneState {
  layout: string;
  focused: string | null;
}

export interface RemoldSceneActions {
  points: Scene["points"];
  pick(x: number, y: number): string | null;
  anchor(id: string, port?: AnchorPort): { x: number; y: number } | null;
  box: Scene["box"];
  redraw(): void;
}

export interface RemoldSceneProps
  extends BaseProps<RemoldSceneState, HTMLCanvasElement>,
    Pick<SceneOptions, "objects" | "layouts" | "links" | "palette" | "interact" | "spring" | "reducedMotion" | "loop" | "maxPixelRatio">,
    Omit<CanvasHTMLAttributes<HTMLCanvasElement>, "className" | "children"> {
  label?: string;
  layout?: string;
  defaultLayout?: string;
  focused?: string | null;
  defaultFocused?: string | null;
  onFocusedChange?: (focused: string | null) => void;
  onDraw?: () => void;
  actionsRef?: RefObject<RemoldSceneActions | null>;
}
