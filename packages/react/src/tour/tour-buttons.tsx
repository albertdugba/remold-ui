import { forwardRef, type ForwardedRef, type MouseEvent } from "react";
import { useRenderElement } from "../utils/use-render-element.js";
import { useTourContext } from "./tour-context.js";
import type { TourButtonProps, TourButtonState } from "./types.js";

type Action = "next" | "previous" | "close";

function useTourButton(
  action: Action,
  part: string,
  componentProps: TourButtonProps,
  forwardedRef: ForwardedRef<HTMLButtonElement>,
) {
  const { render, className, onClick, disabled: disabledProp, ...elementProps } = componentProps;
  const tour = useTourContext(part);
  const disabled = Boolean(disabledProp) || !tour.open || (action === "previous" && tour.first);
  const state: TourButtonState = { disabled, last: tour.last };

  const handleClick = (event: MouseEvent<HTMLButtonElement>) => {
    onClick?.(event);
    if (event.defaultPrevented || disabled) return;
    tour[action]();
  };

  return useRenderElement(
    "button",
    { render, className },
    {
      state,
      refs: [forwardedRef],
      props: { type: "button", ...elementProps, disabled, onClick: handleClick },
      dataAttributes: {
        "data-rm-disabled": disabled ? "" : undefined,
        "data-rm-last": tour.last ? "" : undefined,
      },
    },
  );
}

/** Goes to the next step. */
export const TourNext = forwardRef(function TourNext(
  componentProps: TourNext.Props,
  forwardedRef: ForwardedRef<HTMLButtonElement>,
) {
  return useTourButton("next", "Tour.Next", componentProps, forwardedRef);
});

/** Goes back a step. Disabled on the first step. */
export const TourPrevious = forwardRef(function TourPrevious(
  componentProps: TourPrevious.Props,
  forwardedRef: ForwardedRef<HTMLButtonElement>,
) {
  return useTourButton("previous", "Tour.Previous", componentProps, forwardedRef);
});

/** Closes the tour. */
export const TourClose = forwardRef(function TourClose(
  componentProps: TourClose.Props,
  forwardedRef: ForwardedRef<HTMLButtonElement>,
) {
  return useTourButton("close", "Tour.Close", componentProps, forwardedRef);
});

export namespace TourNext {
  export type Props = TourButtonProps;
  export type State = TourButtonState;
}

export namespace TourPrevious {
  export type Props = TourButtonProps;
  export type State = TourButtonState;
}

export namespace TourClose {
  export type Props = TourButtonProps;
  export type State = TourButtonState;
}
