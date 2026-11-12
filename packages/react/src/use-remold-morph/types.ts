import type { Transition, TransitionOptions } from "@remold-ui/dom";

export interface UseRemoldMorphOptions extends TransitionOptions {
  disabled?: boolean;
  onTransition?: (transition: Transition) => void;
}

export interface UseRemoldMorphReturnValue<E extends HTMLElement> {
  ref: (node: E | null) => void;
  animating: boolean;
}
