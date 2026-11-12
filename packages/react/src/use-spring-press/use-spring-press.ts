import { springs, value } from "@remold-ui/core";
import { frames, prefersReducedMotion } from "@remold-ui/dom";
import { useCallback, useEffect, useRef, useState } from "react";
import type { UseSpringPress, UseSpringPressOptions } from "./types.js";

/** Gives a directly pressed control a small, interruptible spring scale. */
export function useSpringPress({
  scale = 0.97,
  spring = springs.snappy,
  reducedMotion = "user",
  loop,
}: UseSpringPressOptions = {}): UseSpringPress {
  const [element, setElement] = useState<HTMLElement | null>(null);
  const stop = useRef<(() => void) | null>(null);
  const pressed = useRef<number | null>(null);
  const motion = useRef(value(1, { spring, precision: 0.0005 }));

  const animate = useCallback(
    (target: number) => {
      if (!element) return;

      stop.current?.();

      const still = reducedMotion === "always" || (reducedMotion === "user" && prefersReducedMotion());

      if (still) {
        motion.current.set(target);
        element.style.scale = String(target);
        return;
      }

      motion.current.to(target, { spring });
      const add = loop ? loop.add.bind(loop) : frames;
      stop.current = add((dt) => {
        motion.current.step(dt);
        element.style.scale = String(motion.current.current);
        return !motion.current.settled;
      });
    },
    [element, loop, reducedMotion, spring],
  );

  useEffect(() => {
    if (!element) return;

    const release = () => {
      pressed.current = null;
      animate(1);
    };

    const down = (event: PointerEvent) => {
      if (event.button !== 0 || pressed.current !== null) return;

      pressed.current = event.pointerId;

      try {
        element.setPointerCapture(event.pointerId);
      } catch {}

      animate(scale);
    };

    const up = (event: PointerEvent) => {
      if (event.pointerId === pressed.current) release();
    };

    element.addEventListener("pointerdown", down);
    element.addEventListener("pointerup", up);
    element.addEventListener("pointercancel", up);
    element.addEventListener("lostpointercapture", release);
    return () => {
      element.removeEventListener("pointerdown", down);
      element.removeEventListener("pointerup", up);
      element.removeEventListener("pointercancel", up);
      element.removeEventListener("lostpointercapture", release);
    };
  }, [animate, element, scale]);

  useEffect(() => () => stop.current?.(), []);

  return { ref: setElement };
}
