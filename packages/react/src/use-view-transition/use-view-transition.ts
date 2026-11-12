import { useCallback, useRef } from "react";
import { flushSync } from "react-dom";
import { viewTransition, type TransitionOptions } from "@remold-ui/dom";
import { useLatest } from "../utils/hooks.js";
import type { UseViewTransitionReturnValue } from "./types.js";

export function useViewTransition<E extends HTMLElement = HTMLDivElement>(
  options: TransitionOptions = {},
): useViewTransition.ReturnValue<E> {
  const element = useRef<E | null>(null);
  const latest = useLatest(options);

  const ref = useCallback((node: E | null) => {
    element.current = node;
  }, []);

  const animate = useCallback(
    (update: () => void, overrides?: TransitionOptions) => {
      const root = element.current;

      if (!root) {
        update();
        return null;
      }

      return viewTransition(root, () => flushSync(update), { ...latest.current, ...overrides });
    },
    [latest],
  );

  return { ref, animate };
}

export namespace useViewTransition {
  export type ReturnValue<E extends HTMLElement> = UseViewTransitionReturnValue<E>;
}
