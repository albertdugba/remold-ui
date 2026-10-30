import { useCallback, useEffect, useInsertionEffect, useLayoutEffect, useRef, useState } from "react";

/** `useLayoutEffect` in the browser, `useEffect` on the server (where layout effects warn). */
export const useIsoLayoutEffect = typeof window === "undefined" ? useEffect : useLayoutEffect;

/** Runs before layout effects, so an effect event sees this render's callback. No-op on the server. */
const useIsoInsertionEffect = typeof window === "undefined" ? useEffect : useInsertionEffect;

/**
 * A stable function that always calls the latest `callback`.
 *
 * Same contract as React 19.2 `useEffectEvent`: an effect can read fresh props without listing
 * them as dependencies and restarting. Implemented here because the package still supports React 18,
 * where `useEffectEvent` is not exported. Call it from effects only.
 */
export function useEffectEvent<Args extends unknown[], Result>(
  callback: (...args: Args) => Result,
): (...args: Args) => Result {
  const ref = useRef(callback);

  useIsoInsertionEffect(() => {
    ref.current = callback;
  });

  return useCallback((...args: Args) => ref.current(...args), []);
}

/** The latest value, readable from callbacks without making them change. */
export function useLatest<T>(value: T): { readonly current: T } {
  const ref = useRef(value);

  useIsoLayoutEffect(() => {
    ref.current = value;
  });

  return ref;
}

export function useControlled<T>(controlled: T | undefined, defaultValue: T): [T, (next: T) => void] {
  const isControlled = useRef(controlled !== undefined).current;
  const [own, setOwn] = useState(defaultValue);
  const value = isControlled ? (controlled as T) : own;

  const setValue = useCallback(
    (next: T) => {
      if (!isControlled) setOwn(next);
    },
    [isControlled],
  );

  return [value, setValue];
}
