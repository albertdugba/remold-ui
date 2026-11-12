import {
  matchNodes,
  springs,
  type NodeMatches,
  type SpringConfig,
} from "@remold-ui/core";
import { announce, resolveReducedMotion } from "../accessibility";
import { readNodes, type PageSnapshot, type PixelBox } from "../snapshot";
import { buildExitRecords } from "./exits";
import { frames, type FrameLoop } from "../frames";
import { buildMotionRecords } from "./records";
import {
  allChannels,
  applyRecord,
  travelOf,
  liftMovers,
  computeVisual,
  containerScale,
  deferred,
  restoreRecord as restore,
  snapshotClones,
  type MotionRecord,
} from "./utils";

export { containerScale } from "./utils";
export type {
  ChangeSummary,
  Choreography,
  PreparedTransition,
  Transition,
  TransitionOptions,
  TransitionResult,
} from "./types";
import type {
  ChangeSummary,
  PreparedTransition,
  Transition,
  TransitionOptions,
  TransitionResult,
} from "./types";
import type { Choreography } from "./types";

interface Run {
  records: Map<HTMLElement, MotionRecord>;
  freeze(): void;
  clear(): void;
}

const running = new WeakMap<Element, Run>();
const sharedLoop: FrameLoop = { add: frames };

const moved = (a: PixelBox, b: PixelBox) =>
  Math.abs(a.x - b.x) > 1 ||
  Math.abs(a.y - b.y) > 1 ||
  Math.abs(a.width - b.width) > 1 ||
  Math.abs(a.height - b.height) > 1;

/** Count what changed between two snapshots. */
export function summarize(
  before: PageSnapshot,
  after: PageSnapshot,
  matches: NodeMatches,
): ChangeSummary {
  const added = new Set(matches.added);
  const removed = new Set(matches.removed);

  return {
    moved: matches.pairs.filter((p) =>
      moved(before.boxes[p.from]!, after.boxes[p.to]!),
    ).length,
    changed: matches.pairs.filter(
      (p) => before.nodes[p.from]!.text !== after.nodes[p.to]!.text,
    ).length,
    added: matches.added.filter((j) => !added.has(after.nodes[j]!.parent))
      .length,
    removed: matches.removed.filter(
      (i) => !removed.has(before.nodes[i]!.parent),
    ).length,
    split: matches.splits.length,
    merged: matches.merges.length,
  };
}

/** A short sentence for screen readers: "2 moved, 1 added". */
export function describeChanges(summary: ChangeSummary): string {
  const parts = [
    [summary.moved, "moved"],
    [summary.changed, "changed"],
    [summary.added, "added"],
    [summary.removed, "removed"],
    [summary.split, "split"],
    [summary.merged, "merged"],
  ] as const;
  return parts
    .filter(([n]) => n > 0)
    .map(([n, word]) => `${n} ${word}`)
    .join(", ");
}

const CHOREOGRAPHY: Required<Choreography> = { move: 0.06, enter: 0.1, stagger: 0.03, maxStagger: 0.24 };

function choreograph({
  records,
  exiting,
  timing,
}: {
  records: readonly MotionRecord[];
  exiting: boolean;
  timing: Choreography;
}): void {
  const { move, enter, stagger, maxStagger } = { ...CHOREOGRAPHY, ...timing };
  const arrivals = records.filter((record) => record.mode === "enter");
  const movers = records.filter((record) => record.mode !== "enter");
  const moveAt = exiting ? move : 0;
  const enterAt = movers.some((record) => travelOf(record) > 1) ? moveAt + enter : moveAt;
  const gap = arrivals.length > 1 ? Math.min(stagger, maxStagger / (arrivals.length - 1)) : 0;

  for (const record of movers) record.delay = moveAt;
  arrivals
    .sort((first, second) => (first.el.compareDocumentPosition(second.el) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1))
    .forEach((record, order) => {
      record.delay = enterAt + order * gap;
    });
}

interface Captured {
  before: PageSnapshot;
  opacities: number[];
  clones: ReturnType<typeof snapshotClones>;
  focused: Element | null;
}

type Exit = ReturnType<typeof buildExitRecords>["exits"][number];

const FADE: SpringConfig = { duration: 0.35, bounce: 0 };

function capture(root: HTMLElement): Captured {
  const before = readNodes(root);

  return {
    before,
    opacities: before.elements.map((element) => Number.parseFloat(getComputedStyle(element).opacity) || 1),
    clones: snapshotClones(root),
    focused: typeof document !== "undefined" ? document.activeElement : null,
  };
}

function linkAnchors(ordered: readonly MotionRecord[], records: ReadonlyMap<HTMLElement, MotionRecord>, root: HTMLElement) {
  for (const record of ordered) {
    for (let parent = record.el.parentElement; parent && parent !== root; parent = parent.parentElement) {
      const anchor = records.get(parent as HTMLElement);

      if (anchor) {
        record.anchor = anchor;
        break;
      }
    }
  }
}

function restoreFocus(focused: Element | null, before: PageSnapshot, after: PageSnapshot, matches: NodeMatches) {
  if (!(focused instanceof HTMLElement) || focused.isConnected) return;

  const index = before.elements.indexOf(focused);
  const pair = matches.pairs.find((candidate) => candidate.from === index);

  if (pair) after.elements[pair.to]!.focus({ preventScroll: true });
}

function announceChanges(option: TransitionOptions["announce"], summary: ChangeSummary) {
  if (!option) return;

  announce(typeof option === "function" ? option(summary) : describeChanges(summary));
}

function renderRecords(ordered: readonly MotionRecord[]) {
  for (const record of ordered) computeVisual(record);

  for (const record of ordered) applyRecord(record);
}

function renderExits(exits: readonly Exit[]) {
  for (const exit of exits) {
    exit.clone.style.opacity = Math.max(0, exit.opacity.current).toFixed(3);
    exit.clone.style.scale = exit.scale.current.toFixed(4);
  }
}

function stepRecords(ordered: readonly MotionRecord[], elapsed: number, dt: number): boolean {
  let moving = false;

  for (const record of ordered) {
    if (elapsed < record.delay) {
      moving = true;
      continue;
    }

    for (const animated of allChannels(record.channels)) if (animated.step(dt)) moving = true;
  }

  return moving;
}

function stepExits(exits: readonly Exit[], dt: number): boolean {
  let moving = false;

  for (const exit of exits) {
    if (exit.opacity.step(dt)) moving = true;

    if (exit.scale.step(dt)) moving = true;
  }

  return moving;
}

function orderedRecords(records: ReadonlyMap<HTMLElement, MotionRecord>, root: HTMLElement): MotionRecord[] {
  const ordered = [...records.values()].sort((p, q) => p.depth - q.depth);

  linkAnchors(ordered, records, root);

  return ordered;
}

const quiet = <T>() => {
  const promise = deferred<T>();

  promise.promise.catch(() => {});

  return promise;
};

function abortError(): Error {
  const reason = new Error("Transition cancelled");

  reason.name = "AbortError";

  return reason;
}

interface RunContext {
  root: HTMLElement;
  options: TransitionOptions;
  captured: Captured;
  reduced: boolean;
  spring: SpringConfig;
  loop: FrameLoop;
  ready: ReturnType<typeof deferred<TransitionResult>>;
  finished: ReturnType<typeof deferred<void>>;
  skipped: () => boolean;
}

interface RunState {
  done: boolean;
  frozen: boolean;
  exitsDone: boolean;
}

function playRecords(loop: FrameLoop, ordered: readonly MotionRecord[], state: RunState, cleanUp: () => void) {
  let elapsed = 0;

  loop.add((dt) => {
    if (state.frozen || state.done) return false;

    elapsed += dt;

    const moving = stepRecords(ordered, elapsed, dt);

    renderRecords(ordered);

    if (!moving) cleanUp();

    return moving;
  });
}

function playExits(loop: FrameLoop, exits: readonly Exit[], state: RunState, finish: () => void) {
  loop.add((dt) => {
    if (state.exitsDone) return false;

    const moving = stepExits(exits, dt);

    renderExits(exits);

    if (!moving) finish();

    return moving;
  });
}

function matchAndPlan(context: RunContext, previous: Run | undefined) {
  const { root, options, captured, reduced, spring } = context;
  const { before } = captured;
  const after = readNodes(root);
  const matches = matchNodes(before.nodes, after.nodes, options.match);
  const zoom = containerScale(root);
  const records = buildMotionRecords({ root, before, after, matches, previousRecords: previous?.records, zoom, reduced, spring, fade: FADE });
  const { exits, layer } = buildExitRecords({ root, before, matches, clones: captured.clones, opacities: captured.opacities, zoom, reduced });
  const summary = summarize(before, after, matches);

  if (options.choreography && !reduced) {
    choreograph({
      records: [...records.values()],
      exiting: exits.length > 0,
      timing: options.choreography === true ? {} : options.choreography,
    });
  }

  return { after, matches, records, exits, layer, summary };
}

function beginRun(context: RunContext): () => void {
  const { root, options, captured, reduced, loop, ready, finished } = context;
  const previous = running.get(root);

  previous?.freeze();
  previous?.clear();

  const { after, matches, records, exits, layer, summary } = matchAndPlan(context, previous);
  const ordered = orderedRecords(records, root);
  const unlift = options.lift !== false && !reduced ? liftMovers(ordered, root) : () => {};
  const state: RunState = { done: false, frozen: false, exitsDone: exits.length === 0 };

  const settle = () => {
    if (state.done && state.exitsDone) finished.resolve();
  };

  const finishExits = () => {
    state.exitsDone = true;
    layer?.remove();
  };

  const restoreAll = () => {
    for (const record of ordered) restore(record);

    unlift();
  };

  const cleanUp = () => {
    if (state.done) return;

    state.done = true;
    restoreAll();

    if (running.get(root) === run) running.delete(root);

    settle();
  };

  const run: Run = {
    records,

    freeze() {
      state.frozen = true;
      state.done = true;
      settle();
    },

    clear: restoreAll,
  };

  running.set(root, run);

  const skip = () => {
    for (const record of ordered) for (const animated of allChannels(record.channels)) animated.set(animated.target);

    cleanUp();
    finishExits();
    settle();
  };

  restoreFocus(captured.focused, captured.before, after, matches);
  announceChanges(options.announce, summary);
  ready.resolve({ before: captured.before, after, matches, summary });

  if (context.skipped()) {
    skip();
    return skip;
  }

  renderRecords(ordered);
  renderExits(exits);
  playRecords(loop, ordered, state, cleanUp);

  if (!state.exitsDone) {
    playExits(loop, exits, state, () => {
      finishExits();
      settle();
    });
  }

  return skip;
}

/** The two halves of `transition`, for frameworks that change the DOM themselves. */
export function prepareTransition(root: HTMLElement, options: TransitionOptions = {}): PreparedTransition {
  const spring = options.spring ?? springs.snappy;
  const loop = options.loop ?? sharedLoop;
  const reduced = resolveReducedMotion(options.reducedMotion);
  const updated = deferred<void>();
  const ready = quiet<TransitionResult>();
  const finished = quiet<void>();
  const captured = capture(root);

  let skipped = false;
  let skip = () => {
    skipped = true;
  };

  const start = (): void => {
    skip = beginRun({ root, options, captured, reduced, spring, loop, ready, finished, skipped: () => skipped });
  };

  const handle: Transition = {
    updated: updated.promise,
    ready: ready.promise,
    finished: finished.promise,
    skip: () => skip(),
  };

  let settled = false;

  const rejectAll = (error: unknown) => {
    updated.reject(error);
    ready.reject(error);
    finished.reject(error);
  };

  return {
    transition: handle,

    play() {
      if (settled) return handle;

      settled = true;
      updated.resolve();

      try {
        start();
      } catch (error) {
        ready.reject(error);
        finished.reject(error);
      }

      return handle;
    },

    fail(error) {
      if (settled) return handle;

      settled = true;
      rejectAll(error);

      return handle;
    },

    cancel() {
      if (settled) return;

      settled = true;
      updated.promise.catch(() => {});
      rejectAll(abortError());
    },
  };
}

/** Animate whatever `update` does to the elements inside `root`. */
export function transition(
  root: HTMLElement,
  update: () => void | Promise<void>,
  options: TransitionOptions = {},
): Transition {
  const held = running.get(root);
  held?.freeze();
  const prepared = prepareTransition(root, options);
  const failed = (error: unknown) => {
    held?.clear();
    return prepared.fail(error);
  };
  let result: void | Promise<void>;
  try {
    result = update();
  } catch (error) {
    return failed(error);
  }
  if (result instanceof Promise) {
    result.then(() => prepared.play(), failed);
    return prepared.transition;
  }
  return prepared.play();
}
