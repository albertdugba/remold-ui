"use client";
/**
 * Path data that springs to each new shape it's given, as a motion value for a `motion.path`. The
 * geometry comes from Remold's `createMorph`; Motion supplies the spring. A change mid-flight starts
 * from the shape on screen, so it never jumps. For icons, use `Remold.Icon` instead.
 */
import { createMorph } from "@remold-ui/core";
import { animate, useMotionValue, type MotionValue, type ValueAnimationTransition } from "motion/react";
import { useEffect, useRef } from "react";

const SPRING: ValueAnimationTransition<number> = { type: "spring", duration: 0.45, bounce: 0.2 };

export function useMorphPath(target: string, transition: ValueAnimationTransition<number> = SPRING): MotionValue<string> {
  const path = useMotionValue(target);
  const shown = useRef(target);

  useEffect(() => {
    if (target === shown.current && target === path.get()) return;
    const shape = createMorph(path.get(), target);
    shown.current = target;
    const controls = animate(0, 1, {
      ...transition,
      onUpdate: (progress) => path.set(shape.d(progress)),
      onComplete: () => path.set(target),
    });
    return () => controls.stop();
  }, [target, path, transition]);

  return path;
}
