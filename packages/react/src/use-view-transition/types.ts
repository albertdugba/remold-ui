import type { Transition, TransitionOptions } from "@remold-ui/dom";

export interface UseViewTransitionReturnValue<E extends HTMLElement> {
  /** Attach to the element whose contents change. */
  ref: (node: E | null) => void;
  /**
   * Run `update` in a browser View Transition where supported, otherwise a normal Remold
   * transition. As with `useRemold`, call from an event handler rather than an effect.
   */
  animate(update: () => void, options?: TransitionOptions): Transition | null;
}
