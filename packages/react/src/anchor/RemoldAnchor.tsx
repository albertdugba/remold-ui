/**
 * `<Remold.Anchor name={reply.id} linkTo={reply.parentId} />`: a point that connector lines
 * start and end at. Inside `Remold.Connectors`, a line is drawn from the anchor called
 * `linkTo` to this one, and follows both as they move. Leave `linkTo` out for an anchor that
 * only starts lines. Renders a `span` by default; use `render` for anything else (an avatar).
 */
import { forwardRef, type ForwardedRef, type HTMLAttributes } from "react";
import {
  ANCHOR_ATTRIBUTE,
  ARROW_ATTRIBUTE,
  FROM_SIDE_ATTRIBUTE,
  LABEL_ATTRIBUTE,
  LINE_ATTRIBUTE,
  LINK_ATTRIBUTE,
  PULSE_ATTRIBUTE,
  PULSE_DELAY_ATTRIBUTE,
  TO_SIDE_ATTRIBUTE,
  type ConnectorSide,
} from "@remold-ui/dom";
import { useRenderElement, type BaseProps } from "../utils/useRenderElement.js";

export const RemoldAnchor = forwardRef(function RemoldAnchor(
  componentProps: RemoldAnchor.Props,
  forwardedRef: ForwardedRef<HTMLSpanElement>,
) {
  const { name, linkTo, fromSide, toSide, label, arrow, pulse, pulseDelay, line, render, className, ...elementProps } = componentProps;
  const text = (v: unknown) => (v === undefined || v === null ? undefined : String(v));
  return useRenderElement(
    "span",
    { render, className },
    {
      state: { linked: linkTo != null },
      refs: [forwardedRef],
      props: elementProps,
      dataAttributes: {
        [ANCHOR_ATTRIBUTE]: name,
        [LINK_ATTRIBUTE]: linkTo ?? undefined,
        [FROM_SIDE_ATTRIBUTE]: fromSide,
        [TO_SIDE_ATTRIBUTE]: toSide,
        [LABEL_ATTRIBUTE]: label,
        [ARROW_ATTRIBUTE]: arrow === undefined ? undefined : arrow ? "" : "false",
        [PULSE_ATTRIBUTE]: text(pulse),
        [PULSE_DELAY_ATTRIBUTE]: text(pulseDelay),
        [LINE_ATTRIBUTE]: line,
      },
    },
  );
});

export namespace RemoldAnchor {
  export interface State {
    /** A line comes into this anchor from another one. */
    linked: boolean;
  }
  export interface Props extends BaseProps<State>, Omit<HTMLAttributes<HTMLSpanElement>, "className"> {
    /** This anchor's name, unique within the `Connectors`. */
    name: string;
    /** The anchor a line comes from, such as the comment this one replies to. Leave it out for none. */
    linkTo?: string | null;
    /** Where the incoming line leaves the other anchor. Defaults to the Connectors' `from`. */
    fromSide?: ConnectorSide;
    /** Where the incoming line arrives here. Defaults to the Connectors' `end`. */
    toSide?: ConnectorSide;
    /** Text halfway along the incoming line, such as "If yes". */
    label?: string;
    /** An arrowhead where the line arrives here; `false` turns off one the Connectors add to every line. */
    arrow?: boolean;
    /**
     * `"loop"` for pulses that keep flowing along the incoming line, or any other value (a run id,
     * a counter) to send one pulse each time it changes.
     */
    pulse?: "loop" | string | number;
    /** Seconds before a one-off pulse sets off: stagger them to run along a path in turn. */
    pulseDelay?: number;
    /** A state for styling the incoming line: it's copied to the line as `data-line` ("lit", "dim"). */
    line?: string;
  }
}
