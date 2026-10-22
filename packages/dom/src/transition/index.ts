/**
 * Keyless transitions: snapshot the page, let anything rewrite it, work out what became what,
 * then move every element from where it was to where it is with springs.
 *
 * - Interruptible: calling `transition` again mid-flight starts from what is on screen now and
 *   keeps each element's velocity.
 * - Nested boxes are corrected: a child's transform is computed relative to its nearest
 *   animated ancestor, so text inside a growing card doesn't stretch.
 * - Elements that leave are cloned into a temporary layer and fade out; elements that arrive
 *   fade in, riding along with any animated parent.
 * - Reduced motion keeps the fades (so changes are still visible) and drops the movement.
 */
import { matchNodes, springs, type MatchNodesOptions, type NodeMatches, type SpringConfig } from "@remold-ui/core";
import { announce, resolveReducedMotion } from "../accessibility";
import { readNodes, type PageSnapshot, type PixelBox } from "../snapshot";
import { buildExitRecords } from "./exits";
import { frames, type FrameLoop } from "../frames";
import { buildMotionRecords } from "./records";
import {
  allChannels,
  applyRecord,
  liftMovers,
  computeVisual,
  containerScale,
  deferred,
  restoreRecord as restore,
  snapshotClones,
  type MotionRecord,
} from "./utils";

export { containerScale } from "./utils";
export type { ChangeSummary, PreparedTransition, Transition, TransitionOptions, TransitionResult } from "./types";
import type { ChangeSummary, PreparedTransition, Transition, TransitionOptions, TransitionResult } from "./types";

/* Animation records */

interface Run {
  records: Map<HTMLElement, MotionRecord>;
  /** Stop ticking but leave everything where it is (an interrupting transition takes over). */
  freeze(): void;
  /** Restore every element's own styles. */
  clear(): void;
}

const running = new WeakMap<Element, Run>();
const sharedLoop: FrameLoop = { add: frames };

/* Helpers */

const moved = (a: PixelBox, b: PixelBox) =>
  Math.abs(a.x - b.x) > 1 || Math.abs(a.y - b.y) > 1 || Math.abs(a.width - b.width) > 1 || Math.abs(a.height - b.height) > 1;

/** Count what changed between two snapshots. Splits and merges count once each. */
export function summarize(before: PageSnapshot, after: PageSnapshot, matches: NodeMatches): ChangeSummary {
  const added = new Set(matches.added);
  const removed = new Set(matches.removed);
  return {
    moved: matches.pairs.filter((p) => moved(before.boxes[p.from]!, after.boxes[p.to]!)).length,
    changed: matches.pairs.filter((p) => before.nodes[p.from]!.text !== after.nodes[p.to]!.text).length,
    added: matches.added.filter((j) => !added.has(after.nodes[j]!.parent)).length,
    removed: matches.removed.filter((i) => !removed.has(before.nodes[i]!.parent)).length,
    split: matches.splits.length,
    merged: matches.merges.length,
  };
}

/** A short sentence for screen readers: "2 moved, 1 added". Empty when nothing changed. */
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

/* The transition */

/**
 * The two halves of `transition`, for frameworks that change the DOM themselves: call this just
 * before the DOM changes, then `play()` once it has.
 *
 * Preparing only reads the page: it changes nothing and stops nothing, so it is safe to call
 * from a render that may be thrown away. A transition already running here keeps going until
 * `play()` takes over from wherever it has got to.
 *
 * ```ts
 * const prepared = prepareTransition(root);
 * applyChanges();
 * prepared.play();
 * ```
 */
export function prepareTransition(root: HTMLElement, options: TransitionOptions = {}): PreparedTransition {
  const spring = options.spring ?? springs.smooth;
  const fade: SpringConfig = { duration: 0.35, bounce: 0 };
  const loop = options.loop ?? sharedLoop;
  const reduced = resolveReducedMotion(options.reducedMotion);

  const updated = deferred<void>();
  const ready = deferred<TransitionResult>();
  const finished = deferred<void>();
  ready.promise.catch(() => {});
  finished.promise.catch(() => {});

  const before = readNodes(root);
  const opacities = before.elements.map((el) => Number.parseFloat(getComputedStyle(el).opacity) || 1);
  const clones = snapshotClones(root);
  const focused = typeof document !== "undefined" ? document.activeElement : null;

  let skipped = false;
  let skip = () => {
    skipped = true;
  };

  const start = (): void => {
    const previous = running.get(root);
    previous?.freeze();
    previous?.clear();
    const after = readNodes(root);
    const matches = matchNodes(before.nodes, after.nodes, options.match);
    const zoom = containerScale(root);

    const records = buildMotionRecords({
      root,
      before,
      after,
      matches,
      previousRecords: previous?.records,
      zoom,
      reduced,
      spring,
      fade,
    });

    const { exits, layer } = buildExitRecords({
      root,
      before,
      matches,
      clones,
      opacities,
      zoom,
      reduced,
    });
    const summary = summarize(before, after, matches);

    const ordered = [...records.values()].sort((p, q) => p.depth - q.depth);
    for (const r of ordered) {
      for (let p = r.el.parentElement; p && p !== root; p = p.parentElement) {
        const anchor = records.get(p as HTMLElement);
        if (anchor) {
          r.anchor = anchor;
          break;
        }
      }
    }

    const unlift = options.lift !== false && !reduced ? liftMovers(ordered, root) : () => {};

    const render = () => {
      for (const r of ordered) computeVisual(r);
      for (const r of ordered) applyRecord(r);
    };

    const renderExits = () => {
      for (const e of exits) {
        e.clone.style.opacity = Math.max(0, e.opacity.current).toFixed(3);
        e.clone.style.scale = e.scale.current.toFixed(4);
      }
    };

    let exitsDone = exits.length === 0;
    const finishExits = () => {
      exitsDone = true;
      layer?.remove();
    };
    const settle = () => {
      if (done && exitsDone) finished.resolve();
    };

    let frozen = false;
    let done = false;
    const cleanUp = () => {
      if (done) return;
      done = true;
      for (const r of ordered) restore(r);
      unlift();
      if (running.get(root) === run) running.delete(root);
      settle();
    };

    const run: Run = {
      records,
      freeze() {
        frozen = true;
        done = true;
        settle();
      },
      clear() {
        for (const r of ordered) restore(r);
        unlift();
      },
    };
    running.set(root, run);

    skip = () => {
      for (const r of ordered) for (const c of allChannels(r.channels)) c.set(c.target);
      cleanUp();
      finishExits();
      settle();
    };

    if (focused instanceof HTMLElement && !focused.isConnected) {
      const index = before.elements.indexOf(focused);
      const pair = matches.pairs.find((p) => p.from === index);
      if (pair) after.elements[pair.to]!.focus({ preventScroll: true });
    }

    if (options.announce) {
      const message = typeof options.announce === "function" ? options.announce(summary) : describeChanges(summary);
      announce(message);
    }

    ready.resolve({ before, after, matches, summary });
    if (skipped) {
      skip();
      return;
    }

    render();
    renderExits();
    loop.add((dt) => {
      if (frozen || done) return false;
      let moving = false;
      for (const r of ordered) for (const c of allChannels(r.channels)) if (c.step(dt)) moving = true;
      render();
      if (!moving) cleanUp();
      return moving;
    });
    if (!exitsDone) {
      loop.add((dt) => {
        if (exitsDone) return false;
        let moving = false;
        for (const e of exits) {
          if (e.opacity.step(dt)) moving = true;
          if (e.scale.step(dt)) moving = true;
        }
        renderExits();
        if (!moving) {
          finishExits();
          settle();
        }
        return moving;
      });
    }
  };

  const handle: Transition = {
    updated: updated.promise,
    ready: ready.promise,
    finished: finished.promise,
    skip: () => skip(),
  };
  let settled = false;
  return {
    transition: handle,
    play() {
      if (!settled) {
        settled = true;
        updated.resolve();
        try {
          start();
        } catch (error) {
          ready.reject(error);
          finished.reject(error);
        }
      }
      return handle;
    },
    fail(error) {
      if (!settled) {
        settled = true;
        updated.reject(error);
        ready.reject(error);
        finished.reject(error);
      }
      return handle;
    },
    cancel() {
      if (settled) return;
      settled = true;
      updated.promise.catch(() => {});
      const reason = new Error("Transition cancelled");
      reason.name = "AbortError";
      updated.reject(reason);
      ready.reject(reason);
      finished.reject(reason);
    },
  };
}

/**
 * Animate whatever `update` does to the elements inside `root`.
 *
 * ```ts
 * transition(list, () => {
 *   list.innerHTML = renderSortedList(); // brand-new markup, no keys
 * });
 * ```
 */
export function transition(root: HTMLElement, update: () => void | Promise<void>, options: TransitionOptions = {}): Transition {
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
