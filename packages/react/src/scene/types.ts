import type { CanvasHTMLAttributes, RefObject } from "react";
import type { AnchorPort, Scene, SceneOptions } from "@remold-ui/canvas";
import type { BaseProps } from "../utils/use-render-element.js";

export interface RemoldSceneState {
  /** The layout on screen. */
  layout: string;
  /** The focused object, if any. */
  focused: string | null;
}

/** Controls that aren't state: use them from event handlers or effects. */
export interface RemoldSceneActions {
  /** Show a cloud of cubes; calling again morphs keylessly. */
  points: Scene["points"];
  /** The frontmost interactive object at a canvas point (CSS pixels). */
  pick(x: number, y: number): string | null;
  /** Where a named object port is on the canvas: for placing tooltips and annotations. */
  anchor(id: string, port?: AnchorPort): { x: number; y: number } | null;
  /** An object's current animated box. */
  box: Scene["box"];
  /** Draw again now (after changing fonts, for example). */
  redraw(): void;
}

export interface RemoldSceneProps
  extends BaseProps<RemoldSceneState, HTMLCanvasElement>,
    Pick<SceneOptions, "objects" | "layouts" | "links" | "palette" | "interact" | "spring" | "reducedMotion" | "loop" | "maxPixelRatio">,
    Omit<CanvasHTMLAttributes<HTMLCanvasElement>, "className" | "children"> {
  /** The canvas's accessible name. */
  label?: string;
  /** The layout to show (controlled). */
  layout?: string;
  /** The first layout when `layout` isn't controlled. */
  defaultLayout?: string;
  /** The focused object (controlled), or null. */
  focused?: string | null;
  /** The first focused object when `focused` isn't controlled. */
  defaultFocused?: string | null;
  /** Called when the user focuses an object (tap or keyboard), or clears focus. */
  onFocusedChange?: (focused: string | null) => void;
  /** Called after every frame the scene draws. */
  onDraw?: () => void;
  /** Receives the scene's extra controls. */
  actionsRef?: RefObject<RemoldSceneActions | null>;
}
