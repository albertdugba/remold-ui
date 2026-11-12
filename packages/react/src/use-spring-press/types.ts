import type { FrameLoop, ReducedMotion } from "@remold-ui/dom";
import type { SpringConfig } from "@remold-ui/core";
import type { RefCallback } from "react";

export interface UseSpringPressOptions {
  scale?: number;
  spring?: SpringConfig;
  reducedMotion?: ReducedMotion;
  loop?: FrameLoop;
}

export interface UseSpringPress {
  ref: RefCallback<HTMLElement>;
}
