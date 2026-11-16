"use client";

import { animate, useMotionValue, useReducedMotion, type MotionValue } from "motion/react";
import { useEffect, useLayoutEffect, useRef } from "react";

const SPRING = { type: "spring" as const, duration: 0.5, bounce: 0.14 };

export function useSpringHeight(target: number | null): MotionValue<number | string> {
  const height = useMotionValue<number | string>("auto");
  const started = useRef(false);
  const running = useRef<{ stop: () => void } | null>(null);
  const still = useReducedMotion();

  useLayoutEffect(() => {
    if (target === null) return;

    if (!started.current || still) {
      started.current = true;
      running.current?.stop();
      height.set(target);

      return;
    }

    running.current = animate(height as MotionValue<number>, target, SPRING);
  }, [target, still, height]);

  useEffect(() => () => running.current?.stop(), []);

  return height;
}
