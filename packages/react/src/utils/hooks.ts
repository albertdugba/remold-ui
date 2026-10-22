import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";

/** `useLayoutEffect` in the browser, `useEffect` on the server (where layout effects warn). */
export const useIsoLayoutEffect = typeof window === "undefined" ? useEffect : useLayoutEffect;

/** The latest value, readable from callbacks without making them change. */
export function useLatest<T>(value: T): { readonly current: T } {
  const ref = useRef(value);
  useIsoLayoutEffect(() => {
    ref.current = value;
  });
  return ref;
}

/**
 * Controlled or uncontrolled state: when `controlled` is given, it wins and `setValue` only
 * reports intent; otherwise the component keeps its own value, starting from `defaultValue`.
 */
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
