import { forwardRef, useMemo, useRef, useState, type CanvasHTMLAttributes, type ForwardedRef } from "react";
import { globe as createGlobe, type Globe } from "@remold-ui/canvas";
import { useIsoLayoutEffect } from "../utils/hooks.js";
import { useRenderElement } from "../utils/use-render-element.js";
import type { RemoldGlobeProps, RemoldGlobeState } from "./types.js";

/**
 * A dotted Earth that turns on its own and can be spun with a finger. Pass recent events as
 * `pulses` and each new one rings out where it happened; pass journeys as `arcs` and each new one
 * flies between two places; pass `focus` to turn to a place. Colour it with `colors`, or with CSS:
 * `color` paints the land and `accent-color` the pulses.
 *
 * @example
 * ```tsx
 * <Remold.Globe
 *   colors={{ sphere: "#0d1b3e", glow: "#3b82f6", arc: "#f472b6" }}
 *   pulses={signups.map((s) => ({ id: s.id, lat: s.lat, lon: s.lon }))}
 *   arcs={merges.map((m) => ({ id: m.id, from: m.author, to: m.repo }))}
 *   focus={city && { lat: city.lat, lon: city.lon, label: city.name }}
 * />
 * ```
 */
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
    // Built once per canvas; the look changes below without starting over.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [element, start, draggable, dots, label, reducedMotion, maxPixelRatio]);

  useIsoLayoutEffect(() => {
    instance?.set(look);
    // Keyed by content, so inline objects don't redo anything.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [instance, lookKey]);

  useIsoLayoutEffect(() => {
    if (!instance) return;
    for (const pulse of pulses ?? []) {
      if (seen.current.has(`p:${pulse.id}`)) continue;
      seen.current.add(`p:${pulse.id}`);
      instance.pulse(pulse);
    }
    for (const arc of arcs ?? []) {
      if (seen.current.has(`a:${arc.id}`)) continue;
      seen.current.add(`a:${arc.id}`);
      instance.arc(arc);
    }
  }, [instance, pulses, arcs]);

  const target = focus ? `${focus.lat},${focus.lon},${focus.label ?? ""}` : "";
  useIsoLayoutEffect(() => {
    instance?.focus(focus ?? null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [instance, target]);

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
