import { forwardRef, useRef, useState, type CSSProperties, type ForwardedRef } from "react";
import { connectors } from "@remold-ui/dom";
import { useIsoLayoutEffect } from "../utils/hooks.js";
import { useRenderElement } from "../utils/use-render-element.js";
import type { RemoldConnectorsProps, RemoldConnectorsState } from "./types.js";

export const CONNECTOR_UPDATE_EVENT = "remold:connectors-update";

const overlayStyles: CSSProperties = {
  position: "absolute",
  inset: 0,
  width: "100%",
  height: "100%",
  overflow: "visible",
  pointerEvents: "none",
};

/**
 * Draws lines between the `Remold.Anchor`s inside it, and keeps them attached while the elements
 * move. Each line is a `path.rm-connector`: style them with CSS.
 *
 * @example
 * ```tsx
 * <Remold.Connectors radius={12}>
 *   <Remold.Morph trigger={thread}>{comments.map(renderComment)}</Remold.Morph>
 * </Remold.Connectors>
 * ```
 */
export const RemoldConnectors = forwardRef(function RemoldConnectors(
  componentProps: RemoldConnectors.Props,
  forwardedRef: ForwardedRef<HTMLDivElement>,
) {
  const {
    children,
    shape,
    radius,
    gap,
    end,
    from,
    arrow,
    pulse,
    spring,
    reducedMotion,
    loop,
    render,
    className,
    style,
    ...elementProps
  } = componentProps;

  const [element, setElement] = useState<HTMLDivElement | null>(null);
  const svg = useRef<SVGSVGElement>(null);

  useIsoLayoutEffect(() => {
    if (!element || !svg.current) return;

    const lines = connectors(element, svg.current, { shape, radius, gap, end, from, arrow, pulse, spring, reducedMotion, loop });
    const update = () => lines.update();

    element.addEventListener(CONNECTOR_UPDATE_EVENT, update);

    return () => {
      element.removeEventListener(CONNECTOR_UPDATE_EVENT, update);
      lines.destroy();
    };
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
        style: { position: "relative", ...style },
        children: (
          <>
            {children}
            <svg ref={svg} className="rm-connectors" style={overlayStyles} />
          </>
        ),
      },
    },
  );
});

export namespace RemoldConnectors {
  export type State = RemoldConnectorsState;
  export type Props = RemoldConnectorsProps;
}
