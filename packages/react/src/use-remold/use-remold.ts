import { useCallback, useRef } from "react";
import { flushSync } from "react-dom";
import { transition, type TransitionOptions } from "@remold-ui/dom";
import { useLatest } from "../utils/hooks.js";
import type { UseRemoldReturnValue } from "./types.js";

/**
 * Animates a state change you make from an event handler.
 *
 * @example
 * ```tsx
 * const { ref, animate } = useRemold();
 *
 * <ul ref={ref}>{items.map(renderItem)}</ul>
 * <button onClick={() => animate(() => setSort("price"))}>Sort by price</button>
 * ```
 */
export function useRemold<E extends HTMLElement = HTMLDivElement>(options: TransitionOptions = {}): useRemold.ReturnValue<E> {
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

      return transition(root, () => flushSync(update), { ...latest.current, ...overrides });
    },
    [latest],
  );

  return { ref, animate };
}

export namespace useRemold {
  export type ReturnValue<E extends HTMLElement> = UseRemoldReturnValue<E>;
}
