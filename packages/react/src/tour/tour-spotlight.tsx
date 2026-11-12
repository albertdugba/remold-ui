import { forwardRef, useCallback, useState, type CSSProperties, type ForwardedRef } from "react";
import { useIsoLayoutEffect } from "../utils/hooks.js";
import { useRenderElement } from "../utils/use-render-element.js";
import { useTourContext } from "./tour-context.js";
import type { TourSpotlightProps, TourSpotlightState } from "./types.js";

interface Box {
  x: number;
  y: number;
  width: number;
  height: number;
}

const sameBox = (a: Box | null, b: Box) =>
  a !== null && a.x === b.x && a.y === b.y && a.width === b.width && a.height === b.height;

interface Frame {
  left: number;
  top: number;
  width: number;
  height: number;
}

function frameOf(element: HTMLElement): Frame {
  const parent = element.offsetParent;

  if (!parent) return { left: 0, top: 0, width: window.innerWidth, height: window.innerHeight };

  const rect = parent.getBoundingClientRect();

  return {
    left: rect.left + parent.clientLeft - parent.scrollLeft,
    top: rect.top + parent.clientTop - parent.scrollTop,
    width: parent.clientWidth,
    height: parent.clientHeight,
  };
}

function spotlightBox(frame: Frame, open: boolean, target: Element | null, padding: number): Box {
  if (!open) return { x: 0, y: 0, width: frame.width, height: frame.height };

  if (!target) return { x: frame.width / 2, y: frame.height / 2, width: 0, height: 0 };

  const rect = target.getBoundingClientRect();

  return {
    x: rect.left - frame.left - padding,
    y: rect.top - frame.top - padding,
    width: rect.width + padding * 2,
    height: rect.height + padding * 2,
  };
}

function geometryStyle(box: Box | null): CSSProperties {
  if (!box) return { visibility: "hidden" };

  return {
    "--rm-tour-x": `${box.x}px`,
    "--rm-tour-y": `${box.y}px`,
    "--rm-tour-width": `${box.width}px`,
    "--rm-tour-height": `${box.height}px`,
    width: box.width,
    height: box.height,
    transform: `translate(${box.x}px, ${box.y}px)`,
  } as CSSProperties;
}

function useSpotlightBox(element: HTMLDivElement | null, open: boolean, target: Element | null, padding: number): Box | null {
  const [box, setBox] = useState<Box | null>(null);

  const measure = useCallback(() => {
    if (!element) return;

    const next = spotlightBox(frameOf(element), open, target, padding);

    setBox((current) => (sameBox(current, next) ? current : next));
  }, [element, open, target, padding]);

  useIsoLayoutEffect(() => {
    measure();

    if (!element || !open) return;

    const observer = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(measure);

    if (target) observer?.observe(target);

    if (element.offsetParent) observer?.observe(element.offsetParent);

    window.addEventListener("resize", measure);
    window.addEventListener("scroll", measure, { capture: true, passive: true });

    return () => {
      observer?.disconnect();
      window.removeEventListener("resize", measure);
      window.removeEventListener("scroll", measure, { capture: true });
    };
  }, [element, open, target, measure]);

  return box;
}

/** Covers the current step's target, plus `padding`, wherever it is. */
export const TourSpotlight = forwardRef(function TourSpotlight(
  componentProps: TourSpotlight.Props,
  forwardedRef: ForwardedRef<HTMLDivElement>,
) {
  const { padding = 8, render, className, style, ...elementProps } = componentProps;
  const { step, open, target } = useTourContext("Tour.Spotlight");
  const [element, setElement] = useState<HTMLDivElement | null>(null);
  const box = useSpotlightBox(element, open, target, padding);

  const state: TourSpotlight.State = { open, step, centered: open && !target };

  const geometry = geometryStyle(box);

  return useRenderElement(
    "div",
    { render, className },
    {
      state,
      refs: [setElement, forwardedRef],
      props: {
        "aria-hidden": true,
        ...elementProps,
        style: { position: "absolute", top: 0, left: 0, pointerEvents: "none", ...geometry, ...style },
      },
      dataAttributes: {
        "data-rm-open": open ? "" : undefined,
        "data-rm-closed": open ? undefined : "",
        "data-rm-step": step ?? undefined,
        "data-rm-centered": state.centered ? "" : undefined,
      },
    },
  );
});

export namespace TourSpotlight {
  export type Props = TourSpotlightProps;
  export type State = TourSpotlightState;
}
