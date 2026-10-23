import { forwardRef, useState, type ForwardedRef } from "react";
import { prepareTransition, type PreparedTransition } from "@remold-ui/dom";
import { useIsoLayoutEffect, useLatest } from "../utils/hooks.js";
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
    disabled = false,
    onTransition,
    spring,
    match,
    reducedMotion,
    announce,
    loop,
    lift,
    render,
    className,
    ...elementProps
  } = componentProps;

  const [element, setElement] = useState<HTMLDivElement | null>(null);
  const [committedTrigger, setCommittedTrigger] = useState(trigger);
  const [pending, setPending] = useState<PreparedTransition | null>(null);
  const [running, setRunning] = useState(0);
  const onStart = useLatest(onTransition);

  if (!sameTrigger(committedTrigger, trigger)) {
    setCommittedTrigger(trigger);
    setPending(!disabled && element ? prepareTransition(element, { spring, match, reducedMotion, announce, loop, lift }) : null);
  }

  useIsoLayoutEffect(() => {
    if (!pending) return;
    const transition = pending.play();
    setRunning((n) => n + 1);
    onStart.current?.(transition);
    const done = () => setRunning((n) => n - 1);
    transition.finished.then(done, done);
  }, [pending]);

  const state: RemoldLayout.State = { animating: running > 0 };
  return useRenderElement(
    "div",
    { render, className },
    {
      state,
      refs: [setElement, forwardedRef],
      props: elementProps,
      dataAttributes: { "data-rm-animating": state.animating ? "" : undefined },
    },
  );
});

/** Like React's effect dependencies: an array changes when any item does; anything else by `Object.is`. */
function sameTrigger(a: unknown, b: unknown): boolean {
  if (Object.is(a, b)) return true;
  if (!Array.isArray(a) || !Array.isArray(b) || a.length !== b.length) return false;
  return a.every((item, i) => Object.is(item, b[i]));
}

export namespace RemoldLayout {
  export type State = RemoldLayoutState;
  export type Props = RemoldLayoutProps;
}
