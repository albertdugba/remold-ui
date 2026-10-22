/**
 * `useRemold()`: animate a state change you make yourself, from an event handler.
 *
 * ```tsx
 * const { ref, animate } = useRemold();
 * <ul ref={ref}>…</ul>
 * <button onClick={() => animate(() => setSort("price"))}>Sort</button>
 * ```
 */
import { useCallback, useRef } from "react";
import { flushSync } from "react-dom";
import { transition, type Transition, type TransitionOptions } from "@remold-ui/dom";
import { useLatest } from "../utils/hooks.js";

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
  export interface ReturnValue<E extends HTMLElement> {
    /** Attach to the element whose contents change. */
    ref: (node: E | null) => void;
    /**
     * Run `update` (usually a state setter) and animate what it changes. The update is
     * flushed synchronously so the new page can be read at once, which is why this belongs in
     * event handlers, not effects. Returns null if the element isn't mounted.
     */
    animate(update: () => void, options?: TransitionOptions): Transition | null;
  }
}
