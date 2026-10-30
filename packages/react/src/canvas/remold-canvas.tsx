import { forwardRef, useImperativeHandle, useMemo, useState, type CanvasHTMLAttributes, type ForwardedRef, type ReactElement, type RefAttributes } from "react";
import { painter, type Painter, type PainterOptions, type PainterValues } from "@remold-ui/canvas";
import { useIsoLayoutEffect, useLatest } from "../utils/hooks.js";
import { useRenderElement } from "../utils/use-render-element.js";
import type { RemoldCanvasProps, RemoldCanvasState } from "./types.js";

/**
 * A canvas you paint with `draw`, and nothing else to wire up: it stays sharp at every size, is
 * cleared and scaled before each frame, only animates while on screen, springs `values` to their
 * new targets when they change, and holds still for reduced motion. Set `continuous` for things
 * that move on their own.
 *
 * @example
 * ```tsx
 * <Remold.Canvas
 *   values={{ radius: active ? 80 : 40 }}
 *   draw={(context, { width, height, values }) => {
 *     context.beginPath();
 *     context.arc(width / 2, height / 2, values.radius, 0, Math.PI * 2);
 *     context.fill();
 *   }}
 * />
 * ```
 */
export const RemoldCanvas = forwardRef(function RemoldCanvas(
  componentProps: RemoldCanvasProps,
  forwardedRef: ForwardedRef<HTMLCanvasElement>,
) {
  const {
    draw,
    values,
    spring,
    precision,
    continuous,
    clear,
    reducedMotion,
    maxPixelRatio,
    loop,
    label,
    actionsRef,
    render,
    className,
    ...elementProps
  } = componentProps;

  const [element, setElement] = useState<HTMLCanvasElement | null>(null);
  const [instance, setInstance] = useState<Painter<PainterValues> | null>(null);
  const latest = useLatest({ draw, values, spring, continuous, clear, reducedMotion });

  // One painter per canvas. It reads the latest props through getters, so an inline `draw` or a
  // new `continuous` doesn't rebuild it.
  useIsoLayoutEffect(() => {
    if (!element) return;

    const options: PainterOptions<PainterValues> = {
      draw: (context, frame) => latest.current.draw(context, frame),
      values: latest.current.values,
      precision,
      maxPixelRatio,
      loop,
      label,
      get spring() {
        return latest.current.spring;
      },
      get continuous() {
        return latest.current.continuous;
      },
      get clear() {
        return latest.current.clear;
      },
      get reducedMotion() {
        return latest.current.reducedMotion;
      },
    };

    const created = painter(element, options);

    setInstance(created);

    return () => {
      created.destroy();
      setInstance(null);
    };
    // Read once: the painter is rebuilt only for a new canvas, precision, pixel cap or loop.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [element, precision, maxPixelRatio, loop]);

  // New targets: spring to them. Keyed by content, so an inline object doesn't restart anything.
  const targets = values ? JSON.stringify(values) : "";
  useIsoLayoutEffect(() => {
    if (instance && latest.current.values) instance.to(latest.current.values, { spring: latest.current.spring });
  }, [instance, targets]);

  useIsoLayoutEffect(() => {
    instance?.label(label);
  }, [instance, label]);

  // Anything else `draw` reads may have changed with this render.
  useIsoLayoutEffect(() => {
    instance?.redraw();
  });

  useImperativeHandle(
    actionsRef,
    () => ({
      get values() {
        return instance?.values ?? latest.current.values ?? {};
      },
      get still() {
        return instance?.still ?? false;
      },
      to: (next, options) => instance?.to(next, options),
      set: (next) => instance?.set(next),
      redraw: () => instance?.redraw(),
    }),
    [instance, latest],
  );

  const state = useMemo<RemoldCanvas.State>(() => ({}), []);

  return useRenderElement(
    "canvas",
    { render, className },
    {
      state,
      refs: [setElement, forwardedRef],
      props: elementProps as CanvasHTMLAttributes<HTMLCanvasElement> & Record<string, unknown>,
    },
  );
}) as <V extends PainterValues = PainterValues>(props: RemoldCanvasProps<V> & RefAttributes<HTMLCanvasElement>) => ReactElement;

export namespace RemoldCanvas {
  export type State = RemoldCanvasState;
  export type Props<V extends PainterValues = PainterValues> = RemoldCanvasProps<V>;
  export type Actions<V extends PainterValues = PainterValues> = import("./types.js").RemoldCanvasActions<V>;
}
