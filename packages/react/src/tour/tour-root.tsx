import { useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState } from "react";
import { useControlled, useIsoLayoutEffect, useLatest } from "../utils/hooks.js";
import { TourContext, type TourInternalContextValue } from "./tour-context.js";
import type { TourActions, TourChangeDetails, TourRootProps } from "./types.js";

const EDITABLE = "input, textarea, select, [contenteditable]:not([contenteditable='false'])";

function isOnScreen(element: Element) {
  const box = element.getBoundingClientRect();
  return box.top >= 0 && box.left >= 0 && box.bottom <= window.innerHeight && box.right <= window.innerWidth;
}

/** Walks someone through an interface one step at a time. */
export function TourRoot({
  steps,
  step: stepProp,
  defaultStep = null,
  onStepChange,
  keyboard = true,
  scrollIntoView = true,
  actionsRef,
  children,
}: TourRoot.Props) {
  const [step, setStep] = useControlled<string | null>(stepProp, defaultStep);
  const [targets, setTargets] = useState<ReadonlyMap<string, Element>>(() => new Map());
  const onChange = useLatest(onStepChange);

  const index = step === null ? -1 : steps.indexOf(step);
  const count = steps.length;
  const open = step !== null;

  const change = useCallback(
    (next: string | null, details: TourChangeDetails) => {
      if (next !== null && !steps.includes(next)) {
        throw new RangeError(`Remold.Tour: there's no step "${next}" in steps`);
      }
      if (next === step) return;
      setStep(next);
      onChange.current?.(next, details);
    },
    [steps, step, setStep, onChange],
  );

  const start = useCallback(
    (from?: string) => change(from ?? steps[0] ?? null, { reason: "start" }),
    [change, steps],
  );
  const goTo = useCallback((to: string) => change(to, { reason: "go-to" }), [change]);
  const close = useCallback(() => change(null, { reason: "close" }), [change]);
  const next = useCallback(() => {
    if (!open) return;
    if (index >= count - 1) change(null, { reason: "finish" });
    else change(steps[index + 1]!, { reason: "next" });
  }, [open, index, count, steps, change]);
  const previous = useCallback(() => {
    if (index > 0) change(steps[index - 1]!, { reason: "previous" });
  }, [index, steps, change]);

  const register = useCallback((name: string, element: Element | null) => {
    setTargets((current) => {
      if (element ? current.get(name) === element : !current.has(name)) return current;
      const updated = new Map(current);
      if (element) updated.set(name, element);
      else updated.delete(name);
      return updated;
    });
  }, []);

  useImperativeHandle(
    actionsRef,
    (): TourActions => ({
      get step() {
        return step;
      },
      start,
      next,
      previous,
      goTo,
      close,
    }),
    [step, start, next, previous, goTo, close],
  );

  const keys = useLatest({ index, count, steps, change });

  useEffect(() => {
    if (!open || !keyboard) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
      if (event.target instanceof Element && event.target.closest(EDITABLE)) return;

      const { index, count, steps, change } = keys.current;
      if (event.key === "Escape") change(null, { reason: "escape-key", event });
      else if (event.key === "ArrowRight" && index < count - 1) change(steps[index + 1]!, { reason: "arrow-key", event });
      else if (event.key === "ArrowLeft" && index > 0) change(steps[index - 1]!, { reason: "arrow-key", event });
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, keyboard, keys]);

  const target = step === null ? null : (targets.get(step) ?? null);
  const shownStep = useRef(step);

  useIsoLayoutEffect(() => {
    if (shownStep.current === step) return;
    shownStep.current = step;
    if (!scrollIntoView || !target || isOnScreen(target)) return;

    const reduced = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    target.scrollIntoView({ block: "center", inline: "nearest", behavior: reduced ? "auto" : "smooth" });
  }, [step, target, scrollIntoView]);

  const context = useMemo<TourInternalContextValue>(
    () => ({
      step,
      steps,
      index,
      count,
      open,
      first: index === 0,
      last: index === count - 1,
      target,
      start,
      next,
      previous,
      goTo,
      close,
      register,
    }),
    [step, steps, index, count, open, target, start, next, previous, goTo, close, register],
  );

  return <TourContext.Provider value={context}>{children}</TourContext.Provider>;
}

export namespace TourRoot {
  export type Props = TourRootProps;
  export type Actions = TourActions;
  export type ChangeDetails = TourChangeDetails;
}
