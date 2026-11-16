import type { ReducedMotion } from "@remold-ui/dom";
import type { RefCallback } from "react";

/** Marks the play/pause button, so pressing it doesn't count as taking over. */
export type AutoplayControlAttribute = "data-rm-autoplay-control";

export interface AutoplayOptions {
  /** Milliseconds per step, or a function of the step for steps that should linger. */
  every?: number | ((step: number) => number);
  /** The first step. Default 0. */
  initial?: number;
  /** Stop when someone clicks, taps, types or tabs into the element. */
  stopOnInteraction?: boolean;
  /** Start playing. Default true. */
  autoStart?: boolean;
  /** With reduced motion it waits for the play/pause control instead of starting by itself. Default "user". */
  reducedMotion?: ReducedMotion;
}

export interface Autoplay {
  /** Put this on the element that holds the demo: it's watched for visibility and interaction. */
  ref: RefCallback<HTMLElement>;
  /** The current step, from 0 to count - 1. */
  step: number;
  /** Go to a step yourself. */
  setStep: (step: number | ((step: number) => number)) => void;
  /** Go to the next step, wrapping round. */
  next: () => void;
  /** Whether it is set to play. With reduced motion this stays false until the person starts it. */
  playing: boolean;
  /** Whether work should run right now: playback was requested and the watched element is visible. */
  active: boolean;
  setPlaying: (playing: boolean) => void;
  /** Start because the person asked: it plays even when motion is reduced. */
  play: () => void;
  /** Spread on a button to make it the play/pause control. */
  toggleProps: Record<AutoplayControlAttribute, ""> & { "aria-pressed": boolean; onClick: () => void };
}
