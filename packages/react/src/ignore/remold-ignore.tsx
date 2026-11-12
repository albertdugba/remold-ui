import { forwardRef, type ForwardedRef } from "react";
import { IGNORE_ATTRIBUTE } from "@remold-ui/dom";
import { useRenderElement } from "../utils/use-render-element.js";
import type { RemoldIgnoreProps, RemoldIgnoreState } from "./types.js";

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
  export type State = RemoldIgnoreState;
  export type Props = RemoldIgnoreProps;
}
