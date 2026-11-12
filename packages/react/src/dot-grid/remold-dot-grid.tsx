import { forwardRef, useImperativeHandle, useMemo, useState, type CanvasHTMLAttributes, type ForwardedRef } from "react";
import { dotGrid as createDotGrid, type DotGrid } from "@remold-ui/canvas";
import { useIsoLayoutEffect } from "../utils/hooks.js";
import { useRenderElement } from "../utils/use-render-element.js";
import type { RemoldDotGridProps, RemoldDotGridState } from "./types.js";

export const RemoldDotGrid = forwardRef(function RemoldDotGrid(
  componentProps: RemoldDotGridProps,
  forwardedRef: ForwardedRef<HTMLCanvasElement>,
) {
  const {
    gap,
    size,
    reach,
    swell,
    push,
    shape,
    ambient,
    colors,
    ripples,
    label,
    reducedMotion,
    maxPixelRatio,
    actionsRef,
    render,
    className,
    ...elementProps
  } = componentProps;

  const [element, setElement] = useState<HTMLCanvasElement | null>(null);
  const [instance, setInstance] = useState<DotGrid | null>(null);
  const look = { gap, size, reach, swell, push, shape: shape ?? null, ambient, colors };
  const lookKey = JSON.stringify(look);

  useIsoLayoutEffect(() => {
    if (!element) return;

    const created = createDotGrid(element, { ...look, ripples, label, reducedMotion, maxPixelRatio });

    setInstance(created);

    return () => {
      created.destroy();
      setInstance(null);
    };
  }, [element, ripples, label, reducedMotion, maxPixelRatio]);

  useIsoLayoutEffect(() => {
    instance?.set(look);
  }, [instance, lookKey]);

  useImperativeHandle(
    actionsRef,
    () => ({
      hover: (at) => instance?.hover(at),
      ripple: (at) => instance?.ripple(at),
    }),
    [instance],
  );

  const state = useMemo<RemoldDotGridState>(() => ({}), []);

  return useRenderElement(
    "canvas",
    { render, className },
    {
      state,
      refs: [setElement, forwardedRef],
      props: elementProps as CanvasHTMLAttributes<HTMLCanvasElement> & Record<string, unknown>,
    },
  );
});
