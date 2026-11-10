"use client";

import { useCallback, useRef, useState } from "react";

/** Why a value changed: the person did something, or the element moved on by itself after a delay. */
export interface ChangeDetails {
  reason: "interaction" | "timer";
}

/**
 * State that can be owned by the component (`defaultValue`) or by its parent (`value` with
 * `onValueChange`), the way Base UI's components work. Updates made one after another in the same
 * handler each see the one before, controlled or not.
 */
export function useControllableState<T>({
  value,
  defaultValue,
  onValueChange,
}: {
  value?: T;
  defaultValue: T;
  onValueChange?: (value: T, details: ChangeDetails) => void;
}) {
  const controlled = value !== undefined;
  const [ownValue, setOwnValue] = useState(defaultValue);
  const current = controlled ? value : ownValue;
  const latest = useRef(current);
  latest.current = current;
  const onChange = useRef(onValueChange);
  onChange.current = onValueChange;

  const setValue = useCallback(
    (update: T | ((current: T) => T), reason: ChangeDetails["reason"] = "interaction") => {
      const next = typeof update === "function" ? (update as (current: T) => T)(latest.current) : update;
      if (Object.is(next, latest.current)) return;
      latest.current = next;
      if (!controlled) setOwnValue(next);
      onChange.current?.(next, { reason });
    },
    [controlled],
  );

  return [current, setValue] as const;
}
