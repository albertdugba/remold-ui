/**
 * `<Remold.Connectors>`: lines between elements that stay attached while they move.
 *
 * Inside it, mark points with `Remold.Anchor`: `linkTo` draws a line from another anchor to
 * this one, a folder to its files, a comment to its replies, a step to the next. Put a
 * `Remold.Layout` inside (or around) it and the lines follow every element the whole way.
 *
 * ```tsx
 * <Remold.Connectors from="right" end="left" arrow>
 *   <Remold.Layout trigger={steps}>
 *     <Remold.Anchor name="trigger" />
 *     <Remold.Anchor name="send" linkTo="trigger" label="Then" pulse={runId} />
 *   </Remold.Layout>
 * </Remold.Connectors>
 * ```
 */
import { forwardRef, useRef, useState, type CSSProperties, type ForwardedRef, type HTMLAttributes, type ReactNode } from "react";
import { connectors, type ConnectorOptions } from "@remold-ui/dom";
import { useIsoLayoutEffect } from "../utils/hooks.js";
import { useRenderElement, type BaseProps } from "../utils/useRenderElement.js";

const OVERLAY: CSSProperties = {
  position: "absolute",
  inset: 0,
  width: "100%",
  height: "100%",
  overflow: "visible",
  pointerEvents: "none",
};

export const RemoldConnectors = forwardRef(function RemoldConnectors(
  componentProps: RemoldConnectors.Props,
  forwardedRef: ForwardedRef<HTMLDivElement>,
) {
  const { children, shape, radius, gap, end, from, arrow, pulse, spring, reducedMotion, loop, render, className, style, ...elementProps } =
    componentProps;
  const [element, setElement] = useState<HTMLDivElement | null>(null);
  const svg = useRef<SVGSVGElement>(null);

  useIsoLayoutEffect(() => {
    if (!element || !svg.current) return;
    const lines = connectors(element, svg.current, { shape, radius, gap, end, from, arrow, pulse, spring, reducedMotion, loop });
    return () => lines.destroy();
    // Objects are compared by value: an inline `{ duration, bounce }` is a new object every render.
  }, [
    element,
    shape,
    radius,
    gap,
    end,
    from,
    arrow,
    pulse?.duration,
    pulse?.length,
    pulse?.every,
    spring?.duration,
    spring?.bounce,
    reducedMotion,
    loop,
  ]);

  const state: RemoldConnectors.State = {};
  return useRenderElement(
    "div",
    { render, className },
    {
      state,
      refs: [setElement, forwardedRef],
      props: {
        ...elementProps,
        // The lines are laid over the content, so the content must be the positioning box.
        style: { position: "relative", ...style },
        children: (
          <>
            {children}
            <svg ref={svg} className="rm-connectors" style={OVERLAY} />
          </>
        ),
      },
    },
  );
});

export namespace RemoldConnectors {
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
  export interface State {}

  export interface Props extends BaseProps<State>, ConnectorOptions, Omit<HTMLAttributes<HTMLDivElement>, "className"> {
    children?: ReactNode;
  }
}
