import type { HTMLAttributes } from "react";
import type { ConnectorSide } from "@remold-ui/dom";
import type { BaseProps } from "../utils/use-render-element.js";

export interface RemoldAnchorState {
  linked: boolean;
}

export interface RemoldAnchorProps extends BaseProps<RemoldAnchorState>, Omit<HTMLAttributes<HTMLSpanElement>, "className"> {
  name: string;
  linkTo?: string | null;
  fromSide?: ConnectorSide;
  toSide?: ConnectorSide;
  label?: string;
  arrow?: boolean;
  pulse?: "loop" | string | number;
  pulseDelay?: number;
  line?: string;
}
