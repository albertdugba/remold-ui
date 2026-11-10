import { forwardRef, type ForwardedRef } from "react";
import { useRemoldMorph } from "../use-remold-morph/use-remold-morph.js";
import { useRenderElement } from "../utils/use-render-element.js";
import type { RemoldMorphProps, RemoldMorphState } from "./types.js";

/**
 * Animates everything inside it whenever `trigger` changes. Pass an array to watch several
 * things; it's compared item by item, like an effect's dependencies.
 *
 * @example
 * ```tsx
 * <Remold.Morph trigger={[view, sort]}>
 *   {view === "grid" ? <PeopleGrid people={people} /> : <PeopleList people={people} />}
 * </Remold.Morph>
 * ```
 */
export const RemoldMorph = forwardRef(function RemoldMorph(
  componentProps: RemoldMorph.Props,
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

  const { ref, animating } = useRemoldMorph<HTMLDivElement>(trigger, {
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

  const state: RemoldMorph.State = { animating };

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

export namespace RemoldMorph {
  export type State = RemoldMorphState;
  export type Props = RemoldMorphProps;
}
