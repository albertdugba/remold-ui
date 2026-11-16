"use client";
import { createMorph } from "@remold-ui/core";
import {
  animate,
  useMotionValue,
  useReducedMotion,
  type MotionValue,
  type ValueAnimationTransition,
} from "motion/react";
import { useEffect, useRef } from "react";

const SPRING: ValueAnimationTransition<number> = { type: "spring", duration: 0.45, bounce: 0.2 };

export function useMorphPath(
  target: string,
  transition: ValueAnimationTransition<number> = SPRING,
): MotionValue<string> {
  const path = useMotionValue(target);
  const shown = useRef(target);
  const reduced = useReducedMotion();

  useEffect(() => {
    if (target === shown.current && target === path.get()) return;
    if (reduced) {
      shown.current = target;
      path.set(target);
      return;
    }
    const shape = createMorph(path.get(), target);
    shown.current = target;
    const controls = animate(0, 1, {
      ...transition,
      onUpdate: (progress) => path.set(shape.d(progress)),
      onComplete: () => path.set(target),
    });
    return () => controls.stop();
  }, [target, path, transition, reduced]);

  return path;
}
