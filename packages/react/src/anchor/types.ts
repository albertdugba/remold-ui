import type { HTMLAttributes } from "react";
import type { ConnectorSide } from "@remold-ui/dom";
import type { BaseProps } from "../utils/use-render-element.js";

export interface RemoldAnchorState {
  /** A line comes into this anchor from another one. */
  linked: boolean;
}

export interface RemoldAnchorProps extends BaseProps<RemoldAnchorState>, Omit<HTMLAttributes<HTMLSpanElement>, "className"> {
  /** This anchor's name, unique within the `Connectors`. */
  name: string;
  /** The anchor a line comes from, such as the comment this one replies to. */
  linkTo?: string | null;
  /** Where the incoming line leaves the other anchor. */
  fromSide?: ConnectorSide;
  /** Where the incoming line arrives here. */
  toSide?: ConnectorSide;
  /** Text halfway along the incoming line, such as "If yes". */
  label?: string;
  /** An arrowhead where the line arrives here; `false` turns off one the Connectors add to every line. */
  arrow?: boolean;
  /** `"loop"` for pulses that keep flowing along the incoming line, or any other value. */
  pulse?: "loop" | string | number;
  /** Seconds before a one-off pulse sets off: stagger them to run along a path in turn. */
  pulseDelay?: number;
  /** A state for styling the incoming line: it's copied to the line as `data-line` ("lit", "dim"). */
  line?: string;
}
