import { forwardRef, useRef, useState, type ForwardedRef } from "react";
import { morphText } from "@remold-ui/dom";
import { useIsoLayoutEffect } from "../utils/hooks.js";
import { useRenderElement } from "../utils/use-render-element.js";
import type { RemoldTextProps, RemoldTextState } from "./types.js";

/**
 * Text that changes letter by letter: shared letters slide into place, the rest fade.
 *
 * @example
 * ```tsx
 * <Remold.Text>{status}</Remold.Text>
 * ```
 */
export const RemoldText = forwardRef(function RemoldText(
  componentProps: RemoldText.Props,
  forwardedRef: ForwardedRef<HTMLSpanElement>,
) {
  const { children, spring, reducedMotion, loop, render, className, ...elementProps } = componentProps;
  const [initial] = useState(children);
  const [element, setElement] = useState<HTMLSpanElement | null>(null);
  const [animating, setAnimating] = useState(false);
  const shown = useRef(children);
  const latestCall = useRef(0);

  useIsoLayoutEffect(() => {
    if (!element || shown.current === children) return;
    shown.current = children;
    const call = ++latestCall.current;
    setAnimating(true);
    void morphText(element, children, { spring, reducedMotion, loop }).then(() => {
      if (call === latestCall.current) setAnimating(false);
    });
  }, [children, element]);

  // Ignore completion after unmount because a newer morph normally replaces the prior call.
  useIsoLayoutEffect(
    () => () => {
      latestCall.current++;
    },
    [],
  );

  const state: RemoldText.State = { animating };
  return useRenderElement(
    "span",
    { render, className },
    {
      state,
      refs: [setElement, forwardedRef],
      props: { ...elementProps, children: initial },
      dataAttributes: { "data-rm-animating": animating ? "" : undefined },
    },
  );
});

export namespace RemoldText {
  export type State = RemoldTextState;
  export type Props = RemoldTextProps;
}
