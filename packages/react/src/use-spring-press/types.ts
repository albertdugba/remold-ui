import type { FrameLoop, ReducedMotion } from "@remold-ui/dom";
import type { SpringConfig } from "@remold-ui/core";
import type { RefCallback } from "react";

export interface UseSpringPressOptions {
  /** The scale while the primary pointer is down. */
  scale?: number;
  /** The spring used when pressing and releasing. */
  spring?: SpringConfig;
  /** Follow the system setting by default. */
  reducedMotion?: ReducedMotion;
  /** A frame loop to use instead of the browser's shared loop. */
  loop?: FrameLoop;
}

export interface UseSpringPress {
  /** Attach to the element that should respond to direct pointer presses. */
  ref: RefCallback<HTMLElement>;
}
