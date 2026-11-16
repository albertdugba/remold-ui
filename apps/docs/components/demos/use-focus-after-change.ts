"use client";

import { useEffect, useRef, type RefObject } from "react";

export function useFocusAfterChange<T extends HTMLElement>(
  root: RefObject<T | null>,
  key: unknown,
  pick: (root: T) => HTMLElement | null | undefined,
): void {
  const inside = useRef(false);
  const previous = useRef(key);
  const picker = useRef(pick);

  useEffect(() => {
    picker.current = pick;
  });

  useEffect(() => {
    const within = (target: EventTarget | null) => target instanceof Node && Boolean(root.current?.contains(target));

    const onFocusIn = (event: FocusEvent) => {
      if (within(event.target)) inside.current = true;
    };
    const onFocusOut = (event: FocusEvent) => {
      if (event.relatedTarget instanceof Node && !within(event.relatedTarget)) inside.current = false;
    };
    const onPointerDown = (event: PointerEvent) => {
      if (!within(event.target)) inside.current = false;
    };

    document.addEventListener("focusin", onFocusIn, true);
    document.addEventListener("focusout", onFocusOut, true);
    document.addEventListener("pointerdown", onPointerDown, true);

    return () => {
      document.removeEventListener("focusin", onFocusIn, true);
      document.removeEventListener("focusout", onFocusOut, true);
      document.removeEventListener("pointerdown", onPointerDown, true);
    };
  }, [root]);

  useEffect(() => {
    if (Object.is(previous.current, key)) return;
    previous.current = key;

    const element = root.current;
    const active = document.activeElement;
    if (!element || !inside.current || (active && active !== document.body)) return;

    picker.current(element)?.focus({ preventScroll: true });
  }, [root, key]);
}
