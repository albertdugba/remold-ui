/**
 * `useDragToDismiss({ onDismiss })`: let a sheet, card or panel be pulled away. It follows the
 * finger along one axis, goes when it's pulled far enough or flicked, and otherwise springs back
 * at the speed it was let go. Pulling the wrong way stretches.
 *
 * ```tsx
 * const drag = useDragToDismiss({ onDismiss: close });
 * <Remold.Layout trigger={open}>
 *   {open ? <div ref={drag.ref} className="sheet">…</div> : <Card />}
 * </Remold.Layout>
 * ```
 *
 * The offset stays on the element after a dismiss, so when `Layout` swaps views it flies the
 * element home from where the finger let go. Taps and clicks inside still work: a press only
 * becomes a drag after a few pixels, and a drag never ends in a click.
 */
import { dragToDismiss, type DragToDismiss, type DragToDismissOptions } from "@remold-ui/dom";
import { useCallback, useEffect, useRef, useState, type RefCallback } from "react";
import { useLatest } from "../utils/hooks.js";

export interface UseDragToDismissOptions extends Omit<DragToDismissOptions, "onDismiss" | "onDrag"> {
  onDismiss: () => void;
  /** Called with the offset on every move, for dimming a backdrop as it goes. */
  onDrag?: (offset: number) => void;
  /** Turn dragging off, while something inside is busy, say. */
  disabled?: boolean;
}

export interface UseDragToDismiss {
  /** Put this on the element that can be dragged away. */
  ref: RefCallback<HTMLElement>;
  /** Put it back where it started, at once. */
  reset: () => void;
}

export function useDragToDismiss(options: UseDragToDismissOptions): UseDragToDismiss {
  const { disabled = false, axis, direction, distance, velocity, resistance, spring, slop, reducedMotion, loop } = options;
  const latest = useLatest(options);
  const [element, setElement] = useState<HTMLElement | null>(null);
  const drag = useRef<DragToDismiss | null>(null);

  useEffect(() => {
    if (!element || disabled) return;
    const instance = dragToDismiss(element, {
      axis,
      direction,
      distance,
      velocity,
      resistance,
      spring,
      slop,
      reducedMotion,
      loop,
      onDismiss: () => latest.current.onDismiss(),
      onDrag: (offset) => latest.current.onDrag?.(offset),
    });
    drag.current = instance;
    return () => {
      instance.destroy();
      drag.current = null;
    };
    // Springs are compared by value, so an inline `{ duration, bounce }` doesn't restart it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [element, disabled, axis, direction, distance, velocity, resistance, spring?.duration, spring?.bounce, slop, reducedMotion, loop]);

  const reset = useCallback(() => drag.current?.reset(), []);
  return { ref: setElement, reset };
}
