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
  /** Raise elements above their neighbours while they travel. */
  lift?: boolean;
  /** Play the change in beats instead of all at once. */
  choreography?: boolean | Choreography;
}

/** When each part of a change starts, in seconds. */
export interface Choreography {
  /** How long moves wait once something starts leaving, so it clears the way first. */
  move?: number;
  /** How long arrivals wait after moves start, so the space they need has opened. */
  enter?: number;
  /** The gap between one arrival and the next, in document order. */
  stagger?: number;
  /** The longest the whole stagger may take, however many arrive. */
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
