import {
  forwardRef,
  useImperativeHandle,
  useMemo,
  useState,
  type CanvasHTMLAttributes,
  type ForwardedRef,
  type MutableRefObject,
  type ReactElement,
  type Ref,
  type RefAttributes,
} from "react";
import { painter, type Painter, type PainterOptions, type PainterValues } from "@remold-ui/canvas";
import { useIsoLayoutEffect, useLatest } from "../utils/hooks.js";
import { useRenderElement } from "../utils/use-render-element.js";
import type { RemoldCanvasActions, RemoldCanvasProps, RemoldCanvasState } from "./types.js";

type Latest = MutableRefObject<Pick<RemoldCanvasProps, "draw" | "values" | "spring" | "continuous" | "clear" | "reducedMotion">>;

interface Fixed {
  precision?: number;
  maxPixelRatio?: number;
  loop?: PainterOptions<PainterValues>["loop"];
  label?: string;
}

function painterOptions(latest: Latest, { precision, maxPixelRatio, loop, label }: Fixed): PainterOptions<PainterValues> {
  return {
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
}

function usePainterInstance(element: HTMLCanvasElement | null, latest: Latest, fixed: Fixed) {
  const [instance, setInstance] = useState<Painter<PainterValues> | null>(null);

  useIsoLayoutEffect(() => {
    if (!element) return;

    const created = painter(element, painterOptions(latest, fixed));

    setInstance(created);

    return () => {
      created.destroy();
      setInstance(null);
    };
  }, [element, fixed.precision, fixed.maxPixelRatio, fixed.loop]);

  return instance;
}

function usePainterSync(instance: Painter<PainterValues> | null, latest: Latest, values: PainterValues | undefined, label: string | undefined) {
  const targets = values ? JSON.stringify(values) : "";

  useIsoLayoutEffect(() => {
    if (instance && latest.current.values) instance.to(latest.current.values, { spring: latest.current.spring });
  }, [instance, targets]);

  useIsoLayoutEffect(() => {
    instance?.label(label);
  }, [instance, label]);

  useIsoLayoutEffect(() => {
    instance?.redraw();
  });
}

function usePainterActions(actionsRef: Ref<RemoldCanvasActions> | undefined, instance: Painter<PainterValues> | null, latest: Latest) {
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
}

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
  const latest = useLatest({ draw, values, spring, continuous, clear, reducedMotion });
  const instance = usePainterInstance(element, latest, { precision, maxPixelRatio, loop, label });

  usePainterSync(instance, latest, values, label);
  usePainterActions(actionsRef, instance, latest);

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
