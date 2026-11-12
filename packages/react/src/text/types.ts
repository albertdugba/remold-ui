import type { HTMLAttributes } from "react";
import type { MorphTextOptions } from "@remold-ui/dom";
import type { BaseProps } from "../utils/use-render-element.js";

export interface RemoldTextState {
  animating: boolean;
}

export interface RemoldTextProps
  extends BaseProps<RemoldTextState>,
    MorphTextOptions,
    Omit<HTMLAttributes<HTMLSpanElement>, "children" | "className"> {
  children: string;
}
