"use client";

import { createMorph, type MatchOptions } from "@remold-ui/morph";
import {
  motion,
  useMotionValue,
  useSpring,
  useTransform,
  type SVGMotionProps,
} from "motion/react";
import { useEffect, useMemo } from "react";

export interface MorphPathProps
  extends Omit<SVGMotionProps<SVGPathElement>, "d"> {
  /** Starting SVG path data. */
  from: string;
  /** Destination SVG path data. */
  to: string;
  /** Whether the path is shown at `to`. Defaults to true. */
  active?: boolean;
  /** How subpaths are paired before Motion animates progress. */
  match?: MatchOptions;
}

/** A Motion-driven SVG path whose geometry comes from `@remold-ui/morph`. */
export function MorphPath({
  from,
  to,
  active = true,
  match,
  ...pathProps
}: MorphPathProps) {
  const shape = useMemo(() => createMorph(from, to, match), [from, to, match]);
  const target = useMotionValue(active ? 1 : 0);
  const progress = useSpring(target, { duration: 0.5, bounce: 0.15 });
  const d = useTransform(progress, (current) => shape.d(current));

  useEffect(() => {
    target.set(active ? 1 : 0);
  }, [active, target]);

  return <motion.path {...pathProps} d={d} />;
}
