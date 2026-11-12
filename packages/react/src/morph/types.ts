import type { HTMLAttributes } from "react";
import type { Transition, TransitionOptions } from "@remold-ui/dom";
import type { BaseProps } from "../utils/use-render-element.js";

export interface RemoldMorphState {
  /** A transition is running. */
  animating: boolean;
}

export interface RemoldMorphProps
  extends BaseProps<RemoldMorphState>,
    TransitionOptions,
    Omit<HTMLAttributes<HTMLDivElement>, "className"> {
  /** Animate whenever this changes: a view, a sort order, a route. */
  trigger: unknown;
  /** Leave changes unanimated. */
  disabled?: boolean;
  /** Called as each transition starts, to await `ready` or `finished`, or to `skip()` it. */
  onTransition?: (transition: Transition) => void;
}
