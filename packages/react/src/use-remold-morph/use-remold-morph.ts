import { useState } from "react";
import { prepareTransition, type PreparedTransition } from "@remold-ui/dom";
import { useIsoLayoutEffect, useLatest } from "../utils/hooks.js";
import type { UseRemoldMorphOptions, UseRemoldMorphReturnValue } from "./types.js";

export function useRemoldMorph<E extends HTMLElement = HTMLDivElement>(
  trigger: unknown,
  options: UseRemoldMorphOptions = {},
): useRemoldMorph.ReturnValue<E> {
  const { disabled = false, onTransition, spring, match, reducedMotion, announce, loop, lift, choreography } = options;

  const [element, setElement] = useState<E | null>(null);
  const [committedTrigger, setCommittedTrigger] = useState(trigger);
  const [pending, setPending] = useState<PreparedTransition | null>(null);
  const [running, setRunning] = useState(0);
  const onStart = useLatest(onTransition);

  if (!sameTrigger(committedTrigger, trigger)) {
    setCommittedTrigger(trigger);
    setPending(!disabled && element ? prepareTransition(element, { spring, match, reducedMotion, announce, loop, lift, choreography }) : null);
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

function sameTrigger(a: unknown, b: unknown): boolean {
  if (Object.is(a, b)) return true;

  if (!Array.isArray(a) || !Array.isArray(b) || a.length !== b.length) return false;

  return a.every((item, i) => Object.is(item, b[i]));
}

export namespace useRemoldMorph {
  export type Options = UseRemoldMorphOptions;
  export type ReturnValue<E extends HTMLElement> = UseRemoldMorphReturnValue<E>;
}
