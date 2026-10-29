"use client";
/**
 * Paths that reshape into whatever `d` they're given next. The geometry comes from Remold's
 * `createMorph`; Motion supplies the spring. A change mid-flight starts from the shape on screen,
 * so it never jumps.
 *
 * Icons that morph into each other should have the same number of strokes: a stroke with nothing
 * to become shrinks to a point, which a round cap draws as a dot.
 */
import { createMorph } from "@remold-ui/core";
import { animate, motion, useMotionValue, type MotionValue, type ValueAnimationTransition } from "motion/react";
import { useEffect, useRef, type SVGProps } from "react";

const SPRING: ValueAnimationTransition<number> = { type: "spring", duration: 0.45, bounce: 0.2 };

/** Path data that morphs to each new `d`, as a motion value to hand to a `motion.path`. */
export function useMorphPath(d: string, transition: ValueAnimationTransition<number> = SPRING): MotionValue<string> {
  const path = useMotionValue(d);
  const shown = useRef(d);

  useEffect(() => {
    if (d === shown.current && d === path.get()) return;
    const shape = createMorph(path.get(), d);
    shown.current = d;
    const controls = animate(0, 1, {
      ...transition,
      onUpdate: (t) => path.set(shape.d(t)),
      onComplete: () => path.set(d),
    });
    return () => controls.stop();
  }, [d, path, transition]);

  return path;
}

interface MorphIconProps extends Omit<SVGProps<SVGSVGElement>, "d" | "ref"> {
  d: string;
  /** How it reshapes. Defaults to a gentle spring. */
  transition?: ValueAnimationTransition<number>;
}

export function MorphIcon({ d, transition = SPRING, viewBox = "0 0 24 24", ...svg }: MorphIconProps) {
  const path = useMorphPath(d, transition);
  return (
    <svg
      viewBox={viewBox}
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...svg}
    >
      <motion.path d={path} />
    </svg>
  );
}
