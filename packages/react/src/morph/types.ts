import type { HTMLAttributes } from "react";
import type { Transition, TransitionOptions } from "@remold-ui/dom";
import type { BaseProps } from "../utils/use-render-element.js";

export interface RemoldMorphState {
  animating: boolean;
}

export interface RemoldMorphProps
  extends BaseProps<RemoldMorphState>,
    TransitionOptions,
    Omit<HTMLAttributes<HTMLDivElement>, "className"> {
  trigger: unknown;
  disabled?: boolean;
  onTransition?: (transition: Transition) => void;
}
