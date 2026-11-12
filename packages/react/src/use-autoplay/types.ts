import type { RefCallback } from "react";

/** Marks the play/pause button, so pressing it doesn't count as taking over. */
export type AutoplayControlAttribute = "data-rm-autoplay-control";

export interface AutoplayOptions {
  /** Milliseconds per step, or a function of the step for steps that should linger. */
  every?: number | ((step: number) => number);
  /** The first step. Default 0. */
  initial?: number;
  /** Stop when someone clicks, taps or types inside the element. */
  stopOnInteraction?: boolean;
  /** Start playing. Default true. */
  autoStart?: boolean;
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
  /** Whether playback was requested. */
  playing: boolean;
  /** Whether work should run right now: playback was requested and the watched element is visible. */
  active: boolean;
  setPlaying: (playing: boolean) => void;
  /** Spread on a button to make it the play/pause control. */
  toggleProps: Record<AutoplayControlAttribute, ""> & { "aria-pressed": boolean; onClick: () => void };
}
