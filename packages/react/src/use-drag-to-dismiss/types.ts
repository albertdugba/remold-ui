import type { RefCallback } from "react";
import type { DragToDismissOptions } from "@remold-ui/dom";

export interface UseDragToDismissOptions extends Omit<DragToDismissOptions, "onDismiss" | "onDrag"> {
  onDismiss: () => void;
  onDrag?: (offset: number) => void;
  disabled?: boolean;
}

export interface UseDragToDismiss {
  ref: RefCallback<HTMLElement>;
  reset: () => void;
}
