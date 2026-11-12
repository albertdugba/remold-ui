import { dragToDismiss, type DragToDismiss } from "@remold-ui/dom";
import { useCallback, useEffect, useRef, useState } from "react";
import { useLatest } from "../utils/hooks.js";
import type { UseDragToDismiss, UseDragToDismissOptions } from "./types.js";

export function useDragToDismiss(options: UseDragToDismissOptions): UseDragToDismiss {
  const { disabled = false, axis, direction, distance, velocity, resistance, spring, slop, reducedMotion, loop } = options;

  const latest = useLatest(options);
  const [element, setElement] = useState<HTMLElement | null>(null);
  const drag = useRef<DragToDismiss | null>(null);

  // biome-ignore lint/correctness/useExhaustiveDependencies: callbacks use a stable ref and springs compare by value.
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
  }, [element, disabled, axis, direction, distance, velocity, resistance, spring?.duration, spring?.bounce, slop, reducedMotion, loop]);

  const reset = useCallback(() => drag.current?.reset(), []);

  return { ref: setElement, reset };
}
