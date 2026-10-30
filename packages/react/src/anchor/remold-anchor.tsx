import { forwardRef, type ForwardedRef } from "react";
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
} from "@remold-ui/dom";
import { useRenderElement } from "../utils/use-render-element.js";
import type { RemoldAnchorProps, RemoldAnchorState } from "./types.js";

/**
 * One end of a connector line: give it a `name`, and `linkTo` the anchor its line comes from.
 *
 * @example
 * ```tsx
 * <Remold.Anchor name={comment.id} linkTo={comment.parentId} render={<Avatar user={comment.author} />} />
 * ```
 */
export const RemoldAnchor = forwardRef(function RemoldAnchor(
  componentProps: RemoldAnchor.Props,
  forwardedRef: ForwardedRef<HTMLSpanElement>,
) {
  const { name, linkTo, fromSide, toSide, label, arrow, pulse, pulseDelay, line, render, className, ...elementProps } =
    componentProps;

  const text = (value: unknown) => (value === undefined || value === null ? undefined : String(value));

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
  export type State = RemoldAnchorState;
  export type Props = RemoldAnchorProps;
}
