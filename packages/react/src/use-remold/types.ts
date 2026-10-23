import type { Transition, TransitionOptions } from "@remold-ui/dom";

export interface UseRemoldReturnValue<E extends HTMLElement> {
  /** Attach to the element whose contents change. */
  ref: (node: E | null) => void;
  /**
   * Run `update` (usually a state setter) and animate what it changes. The update is
   * flushed synchronously so the new page can be read at once, which is why this belongs in
   * event handlers, not effects. Returns null if the element isn't mounted.
   */
  animate(update: () => void, options?: TransitionOptions): Transition | null;
}
