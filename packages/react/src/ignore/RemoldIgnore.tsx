/**
 * `<Remold.Ignore>`: everything inside is left out of matching and animation, as if it
 * weren't there. By default it renders a `display: contents` span, so layout is unaffected.
 */
import { forwardRef, type ForwardedRef, type HTMLAttributes } from "react";
import { IGNORE_ATTRIBUTE } from "@remold-ui/dom";
import { useRenderElement, type BaseProps } from "../utils/useRenderElement.js";

export const RemoldIgnore = forwardRef(function RemoldIgnore(
  componentProps: RemoldIgnore.Props,
  forwardedRef: ForwardedRef<HTMLSpanElement>,
) {
  const { render, className, style, ...elementProps } = componentProps;
  return useRenderElement(
    "span",
    { render, className },
    {
      state: {},
      refs: [forwardedRef],
      props: { ...elementProps, style: render ? style : { display: "contents", ...style } },
      dataAttributes: { [IGNORE_ATTRIBUTE]: "" },
    },
  );
});

export namespace RemoldIgnore {
  export type State = Record<string, never>;
  export interface Props extends BaseProps<State>, Omit<HTMLAttributes<HTMLSpanElement>, "className"> {}
}
