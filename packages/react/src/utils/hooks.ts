import { useCallback, useEffect, useInsertionEffect, useLayoutEffect, useRef, useState } from "react";

export const useIsoLayoutEffect = typeof window === "undefined" ? useEffect : useLayoutEffect;

const useIsoInsertionEffect = typeof window === "undefined" ? useEffect : useInsertionEffect;

export function useEffectEvent<Args extends unknown[], Result>(
  callback: (...args: Args) => Result,
): (...args: Args) => Result {
  const ref = useRef(callback);

  useIsoInsertionEffect(() => {
    ref.current = callback;
  });

  return useCallback((...args: Args) => ref.current(...args), []);
}

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
