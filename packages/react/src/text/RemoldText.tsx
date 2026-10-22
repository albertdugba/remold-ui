/**
 * `<Remold.Text>{status}</Remold.Text>`: text whose shared letters slide when it
 * changes, while the rest fade. The first text renders normally (so server rendering works);
 * after that Remold owns the letters, and React never touches them again.
 */
import { forwardRef, useRef, useState, type ForwardedRef, type HTMLAttributes } from "react";
import { morphText, type MorphTextOptions } from "@remold-ui/dom";
import { useIsoLayoutEffect } from "../utils/hooks.js";
import { useRenderElement, type BaseProps } from "../utils/useRenderElement.js";

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

  // `morphText` deliberately lets a newer call take over from the old one. On unmount there is
  // no newer call, so invalidate its completion handler instead of allowing it to set state on
  // a component React has removed.
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
  export interface State {
    /** Letters are moving. Also set as `data-rm-animating`. */
    animating: boolean;
  }

  export interface Props extends BaseProps<State>, MorphTextOptions, Omit<HTMLAttributes<HTMLSpanElement>, "children" | "className"> {
    /** The text. */
    children: string;
  }
}
