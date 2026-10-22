/**
 * `<Remold.Layout trigger={view}>`: animate everything inside whenever `trigger` changes.
 * Several things can trigger it at once: `trigger={[view, sort, filter]}`.
 *
 * Remold needs a snapshot of the page from just before React changes it, and no hook runs
 * at that moment. So the snapshot is taken during the render in which `trigger` changes, using
 * React's documented pattern for adjusting state when a prop changes. Taking it only reads the
 * page, so a render React throws away leaves nothing behind. It plays once the change is
 * committed, in a layout effect, before the browser paints.
 */
import { forwardRef, useState, type ForwardedRef, type HTMLAttributes } from "react";
import { prepareTransition, type PreparedTransition, type Transition, type TransitionOptions } from "@remold-ui/dom";
import { useIsoLayoutEffect, useLatest } from "../utils/hooks.js";
import { useRenderElement, type BaseProps } from "../utils/useRenderElement.js";

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

  // The trigger changed: snapshot the page as it is now, before React commits the change.
  if (!sameTrigger(committedTrigger, trigger)) {
    setCommittedTrigger(trigger);
    setPending(!disabled && element ? prepareTransition(element, { spring, match, reducedMotion, announce, loop, lift }) : null);
  }

  // The change is committed: work out what became what and play it.
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
  export interface State {
    /** A transition is running. Also set as `data-rm-animating`. */
    animating: boolean;
  }

  export interface Props extends BaseProps<State>, TransitionOptions, Omit<HTMLAttributes<HTMLDivElement>, "className"> {
    /**
     * Animate whenever this changes: a view, a sort order, a route. Pass an array to watch several
     * things (`[view, sort, filter]`); it changes when any item does, like an effect's dependencies.
     */
    trigger: unknown;
    /** Leave changes unanimated. */
    disabled?: boolean;
    /** Called as each transition starts, to await `ready` or `finished`, or to `skip()` it. */
    onTransition?: (transition: Transition) => void;
  }
}
