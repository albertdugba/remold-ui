import type { HTMLAttributes } from "react";
import type { BaseProps } from "../utils/use-render-element.js";

export type RemoldIgnoreState = Record<string, never>;

export interface RemoldIgnoreProps extends BaseProps<RemoldIgnoreState>, Omit<HTMLAttributes<HTMLSpanElement>, "className"> {}
