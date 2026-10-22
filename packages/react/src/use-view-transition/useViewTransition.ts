/**
 * `useViewTransition()`: run a React state update through the browser View Transitions API when
 * it is available, and fall back to Remold's interruptible DOM animation when it is not.
 *
 * ```tsx
 * const { ref, animate } = useViewTransition();
 * <main ref={ref}>
 *   <button onClick={() => animate(() => setPage("detail"))}>Open</button>
 * </main>
 * ```
 *
 * This is best for route-sized changes and large updates, where the browser can animate on the
 * compositor. For rapid, interruptible controls, use `useRemold()` instead.
 */
import { useCallback, useRef } from "react";
import { flushSync } from "react-dom";
import { viewTransition, type Transition, type TransitionOptions } from "@remold-ui/dom";
import { useLatest } from "../utils/hooks.js";

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
  export interface ReturnValue<E extends HTMLElement> {
    /** Attach to the element whose contents change. */
    ref: (node: E | null) => void;
    /**
     * Run `update` in a browser View Transition where supported, otherwise a normal Remold
     * transition. As with `useRemold`, call from an event handler rather than an effect.
     */
    animate(update: () => void, options?: TransitionOptions): Transition | null;
  }
}
