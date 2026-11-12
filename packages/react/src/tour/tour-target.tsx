import { forwardRef, useCallback, type ForwardedRef } from "react";
import { useRenderElement } from "../utils/use-render-element.js";
import { useTourContext } from "./tour-context.js";
import type { TourTargetProps, TourTargetState } from "./types.js";

/**
 * Marks the element a step points at. Renders a `span`; `render` puts it on your own element.
 *
 * @example
 * ```tsx
 * <Remold.Tour.Target name="share" render={<button type="button" />}>Share</Remold.Tour.Target>
 * ```
 */
export const TourTarget = forwardRef(function TourTarget(
  componentProps: TourTarget.Props,
  forwardedRef: ForwardedRef<HTMLElement>,
) {
  const { name, render, className, ...elementProps } = componentProps;
  const { step, register } = useTourContext("Tour.Target");
  const active = step === name;

  const registerElement = useCallback((element: HTMLElement | null) => register(name, element), [register, name]);

  return useRenderElement(
    "span",
    { render, className },
    {
      state: { active },
      refs: [registerElement, forwardedRef],
      props: elementProps,
      dataAttributes: {
        "data-rm-tour-target": name,
        "data-rm-active": active ? "" : undefined,
      },
    },
  );
});

export namespace TourTarget {
  export type Props = TourTargetProps;
  export type State = TourTargetState;
}
