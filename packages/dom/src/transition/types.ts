import type { MatchNodesOptions, NodeMatches, SpringConfig } from "@remold-ui/core";
import type { ReducedMotion } from "../accessibility";
import type { FrameLoop } from "../frames";
import type { PageSnapshot } from "../snapshot";

export interface TransitionOptions {
  spring?: SpringConfig;
  match?: MatchNodesOptions;
  reducedMotion?: ReducedMotion;
  announce?: boolean | ((summary: ChangeSummary) => string);
  loop?: FrameLoop;
  lift?: boolean;
  choreography?: boolean | Choreography;
}

export interface Choreography {
  move?: number;
  enter?: number;
  stagger?: number;
  maxStagger?: number;
}

export interface ChangeSummary {
  moved: number;
  changed: number;
  added: number;
  removed: number;
  split: number;
  merged: number;
}

export interface TransitionResult {
  before: PageSnapshot;
  after: PageSnapshot;
  matches: NodeMatches;
  summary: ChangeSummary;
}

export interface Transition {
  updated: Promise<void>;
  ready: Promise<TransitionResult>;
  finished: Promise<void>;
  skip(): void;
}

export interface PreparedTransition {
  transition: Transition;
  play(): Transition;
  fail(error: unknown): Transition;
  cancel(): void;
}
