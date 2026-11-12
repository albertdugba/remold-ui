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

/**
 * Covers the current step's target, plus `padding`, wherever it is. It has no look of its own:
 * give it a ring, or a huge spread shadow to dim everything around the target, and a CSS
 * transition so it glides from step to step. Its box is also set as `--rm-tour-x`, `--rm-tour-y`,
 * `--rm-tour-width` and `--rm-tour-height`, measured from its offset parent (or the viewport, when
 * it's `position: fixed`). While the tour is closed it covers that whole box, so it closes in on the
 * first target as the tour starts and opens back out when it ends. A step without a target closes
 * it to a point in the middle.
 *
 * @example
 * ```css
 * .spotlight {
 *   border-radius: 12px;
 *   box-shadow: 0 0 0 100vmax rgb(0 0 0 / 0.5);
 *   transition: transform 0.5s, width 0.5s, height 0.5s;
 * }
 * ```
 */
export const TourSpotlight = forwardRef(function TourSpotlight(
  componentProps: TourSpotlight.Props,
  forwardedRef: ForwardedRef<HTMLDivElement>,
) {
  const { padding = 8, render, className, style, ...elementProps } = componentProps;
  const { step, open, target } = useTourContext("Tour.Spotlight");
  const [element, setElement] = useState<HTMLDivElement | null>(null);
  const [box, setBox] = useState<Box | null>(null);

  const measure = useCallback(() => {
    if (!element) return;

    const parent = element.offsetParent;
    const frame = parent
      ? (() => {
          const rect = parent.getBoundingClientRect();
          return {
            left: rect.left + parent.clientLeft - parent.scrollLeft,
            top: rect.top + parent.clientTop - parent.scrollTop,
            width: parent.clientWidth,
            height: parent.clientHeight,
          };
        })()
      : { left: 0, top: 0, width: window.innerWidth, height: window.innerHeight };

    let next: Box;
    if (!open) {
      next = { x: 0, y: 0, width: frame.width, height: frame.height };
    } else if (target) {
      const rect = target.getBoundingClientRect();
      next = {
        x: rect.left - frame.left - padding,
        y: rect.top - frame.top - padding,
        width: rect.width + padding * 2,
        height: rect.height + padding * 2,
      };
    } else {
      next = { x: frame.width / 2, y: frame.height / 2, width: 0, height: 0 };
    }

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

  const state: TourSpotlight.State = { open, step, centered: open && !target };

  const geometry: CSSProperties = box
    ? ({
        "--rm-tour-x": `${box.x}px`,
        "--rm-tour-y": `${box.y}px`,
        "--rm-tour-width": `${box.width}px`,
        "--rm-tour-height": `${box.height}px`,
        width: box.width,
        height: box.height,
        transform: `translate(${box.x}px, ${box.y}px)`,
      } as CSSProperties)
    : { visibility: "hidden" };

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
