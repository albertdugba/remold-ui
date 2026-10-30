import { useState } from "react";
import { prepareTransition, type PreparedTransition } from "@remold-ui/dom";
import { useIsoLayoutEffect, useLatest } from "../utils/hooks.js";
import type { UseRemoldLayoutOptions, UseRemoldLayoutReturnValue } from "./types.js";

/**
 * `Remold.Layout` as a ref: animates the element you attach it to whenever `trigger` changes.
 * Use it on components you don't render yourself, like a Base UI or MUI part.
 *
 * @example
 * ```tsx
 * const { ref } = useRemoldLayout([view, sort]);
 *
 * <Stack ref={ref}>{people.map(renderPerson)}</Stack>
 * ```
 */
export function useRemoldLayout<E extends HTMLElement = HTMLDivElement>(
  trigger: unknown,
  options: UseRemoldLayoutOptions = {},
): useRemoldLayout.ReturnValue<E> {
  const { disabled = false, onTransition, spring, match, reducedMotion, announce, loop, lift } = options;

  const [element, setElement] = useState<E | null>(null);
  const [committedTrigger, setCommittedTrigger] = useState(trigger);
  const [pending, setPending] = useState<PreparedTransition | null>(null);
  const [running, setRunning] = useState(0);
  const onStart = useLatest(onTransition);

  // Read the old page now, during the render that changes it, before React commits the new one.
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

  return { ref: setElement, animating: running > 0 };
}

/** Like React's effect dependencies: an array changes when any item does; anything else by `Object.is`. */
function sameTrigger(a: unknown, b: unknown): boolean {
  if (Object.is(a, b)) return true;

  if (!Array.isArray(a) || !Array.isArray(b) || a.length !== b.length) return false;

  return a.every((item, i) => Object.is(item, b[i]));
}

export namespace useRemoldLayout {
  export type Options = UseRemoldLayoutOptions;
  export type ReturnValue<E extends HTMLElement> = UseRemoldLayoutReturnValue<E>;
}
