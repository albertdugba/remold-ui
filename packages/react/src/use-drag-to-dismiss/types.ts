import type { RefCallback } from "react";
import type { DragToDismissOptions } from "@remold-ui/dom";

export interface UseDragToDismissOptions extends Omit<DragToDismissOptions, "onDismiss" | "onDrag"> {
  onDismiss: () => void;
  /** Called with the offset on every move, for dimming a backdrop as it goes. */
  onDrag?: (offset: number) => void;
  /** Turn dragging off, while something inside is busy, say. */
  disabled?: boolean;
}

export interface UseDragToDismiss {
  /** Put this on the element that can be dragged away. */
  ref: RefCallback<HTMLElement>;
  /** Put it back where it started, at once. */
  reset: () => void;
}
