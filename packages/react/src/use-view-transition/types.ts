import type { Transition, TransitionOptions } from "@remold-ui/dom";

export interface UseViewTransitionReturnValue<E extends HTMLElement> {
  ref: (node: E | null) => void;
  animate(update: () => void, options?: TransitionOptions): Transition | null;
}
