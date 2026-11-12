import { forwardRef, useMemo, useRef, useState, type CanvasHTMLAttributes, type ForwardedRef, type MutableRefObject } from "react";
import { globe as createGlobe, type Globe } from "@remold-ui/canvas";
import { useIsoLayoutEffect } from "../utils/hooks.js";
import { useRenderElement } from "../utils/use-render-element.js";
import type { RemoldGlobeProps, RemoldGlobeState } from "./types.js";

type Seen = MutableRefObject<Set<string | number>>;

function playOnce<T extends { id: string | number }>(seen: Seen, prefix: string, items: readonly T[] | undefined, play: (item: T) => void) {
  for (const item of items ?? []) {
    const key = `${prefix}:${item.id}`;

    if (seen.current.has(key)) continue;

    seen.current.add(key);
    play(item);
  }
}

function useGlobeEvents(instance: Globe | null, seen: Seen, pulses: RemoldGlobeProps["pulses"], arcs: RemoldGlobeProps["arcs"]) {
  useIsoLayoutEffect(() => {
    if (!instance) return;

    playOnce(seen, "p", pulses, (pulse) => instance.pulse(pulse));
    playOnce(seen, "a", arcs, (arc) => instance.arc(arc));
  }, [instance, pulses, arcs]);
}

function useGlobeFocus(instance: Globe | null, focus: RemoldGlobeProps["focus"]) {
  const target = focus ? `${focus.lat},${focus.lon},${focus.label ?? ""}` : "";

  useIsoLayoutEffect(() => {
    instance?.focus(focus ?? null);
  }, [instance, target]);
}

/** A dotted Earth that turns on its own and can be spun with a finger. */
export const RemoldGlobe = forwardRef(function RemoldGlobe(
  componentProps: RemoldGlobeProps,
  forwardedRef: ForwardedRef<HTMLCanvasElement>,
) {
  const {
    pulses,
    arcs,
    focus,
    colors,
    markers,
    spin,
    tilt,
    dotSize,
    scale,
    start,
    draggable,
    dots,
    label,
    reducedMotion,
    maxPixelRatio,
    render,
    className,
    ...elementProps
  } = componentProps;

  const [element, setElement] = useState<HTMLCanvasElement | null>(null);
  const [instance, setInstance] = useState<Globe | null>(null);
  const seen = useRef(new Set<string | number>());
  const look = { colors, markers, spin, tilt, dotSize, scale };
  const lookKey = JSON.stringify(look);

  useIsoLayoutEffect(() => {
    if (!element) return;

    const created = createGlobe(element, { ...look, start, draggable, dots, label, reducedMotion, maxPixelRatio });
    seen.current = new Set();
    setInstance(created);

    return () => {
      created.destroy();
      setInstance(null);
    };
  }, [element, start, draggable, dots, label, reducedMotion, maxPixelRatio]);

  useIsoLayoutEffect(() => {
    instance?.set(look);
  }, [instance, lookKey]);

  useGlobeEvents(instance, seen, pulses, arcs);
  useGlobeFocus(instance, focus);

  const state = useMemo<RemoldGlobeState>(() => ({}), []);

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
