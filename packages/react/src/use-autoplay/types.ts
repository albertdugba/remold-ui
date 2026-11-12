import type { RefCallback } from "react";

export type AutoplayControlAttribute = "data-rm-autoplay-control";

export interface AutoplayOptions {
  every?: number | ((step: number) => number);
  initial?: number;
  stopOnInteraction?: boolean;
  autoStart?: boolean;
}

export interface Autoplay {
  ref: RefCallback<HTMLElement>;
  step: number;
  setStep: (step: number | ((step: number) => number)) => void;
  next: () => void;
  playing: boolean;
  active: boolean;
  setPlaying: (playing: boolean) => void;
  toggleProps: Record<AutoplayControlAttribute, ""> & { "aria-pressed": boolean; onClick: () => void };
}
