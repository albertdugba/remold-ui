import type { HTMLAttributes } from "react";
import type { Transition, TransitionOptions } from "@remold-ui/dom";
import type { BaseProps } from "../utils/use-render-element.js";

export interface RemoldLayoutState {
  /** A transition is running. Also set as `data-rm-animating`. */
  animating: boolean;
}

export interface RemoldLayoutProps
  extends BaseProps<RemoldLayoutState>,
    TransitionOptions,
    Omit<HTMLAttributes<HTMLDivElement>, "className"> {
  /**
   * Animate whenever this changes: a view, a sort order, a route. Pass an array to watch several
   * things (`[view, sort, filter]`); it changes when any item does, like an effect's dependencies.
   */
  trigger: unknown;
  /** Leave changes unanimated. */
  disabled?: boolean;
  /** Called as each transition starts, to await `ready` or `finished`, or to `skip()` it. */
  onTransition?: (transition: Transition) => void;
}
