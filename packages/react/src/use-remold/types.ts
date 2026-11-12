import type { Transition, TransitionOptions } from "@remold-ui/dom";

export interface UseRemoldReturnValue<E extends HTMLElement> {
  /** Attach to the element whose contents change. */
  ref: (node: E | null) => void;
  /** Run `update` (usually a state setter) and animate what it changes. */
  animate(update: () => void, options?: TransitionOptions): Transition | null;
}
