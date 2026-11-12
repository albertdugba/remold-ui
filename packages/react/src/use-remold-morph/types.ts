import type { Transition, TransitionOptions } from "@remold-ui/dom";

export interface UseRemoldMorphOptions extends TransitionOptions {
  /** Leave changes unanimated. */
  disabled?: boolean;
  /** Called as each transition starts, to await `ready` or `finished`, or to `skip()` it. */
  onTransition?: (transition: Transition) => void;
}

export interface UseRemoldMorphReturnValue<E extends HTMLElement> {
  /** Attach to the element whose contents change: yours, or any component that forwards its ref. */
  ref: (node: E | null) => void;
  /** A transition is running. */
  animating: boolean;
}
