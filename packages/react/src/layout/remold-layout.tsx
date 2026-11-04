import { forwardRef, type ForwardedRef } from "react";
import { useRemoldLayout } from "../use-remold-layout/use-remold-layout.js";
import { useRenderElement } from "../utils/use-render-element.js";
import type { RemoldLayoutProps, RemoldLayoutState } from "./types.js";

/**
 * Animates everything inside it whenever `trigger` changes. Pass an array to watch several
 * things; it's compared item by item, like an effect's dependencies.
 *
 * @example
 * ```tsx
 * <Remold.Layout trigger={[view, sort]}>
 *   {view === "grid" ? <PeopleGrid people={people} /> : <PeopleList people={people} />}
 * </Remold.Layout>
 * ```
 */
export const RemoldLayout = forwardRef(function RemoldLayout(
  componentProps: RemoldLayout.Props,
  forwardedRef: ForwardedRef<HTMLDivElement>,
) {
  const {
    trigger,
    disabled,
    onTransition,
    spring,
    match,
    reducedMotion,
    announce,
    loop,
    lift,
    choreography,
    render,
    className,
    ...elementProps
  } = componentProps;

  const { ref, animating } = useRemoldLayout<HTMLDivElement>(trigger, {
    disabled,
    onTransition,
    spring,
    match,
    reducedMotion,
    announce,
    loop,
    lift,
    choreography,
  });

  const state: RemoldLayout.State = { animating };

  return useRenderElement(
    "div",
    { render, className },
    {
      state,
      refs: [ref, forwardedRef],
      props: elementProps,
      dataAttributes: { "data-rm-animating": state.animating ? "" : undefined },
    },
  );
});

export namespace RemoldLayout {
  export type State = RemoldLayoutState;
  export type Props = RemoldLayoutProps;
}
