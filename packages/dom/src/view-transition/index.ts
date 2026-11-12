import { matchNodes, springs, springToCss, type SpringConfig } from "@remold-ui/core";
import { announce, resolveReducedMotion } from "../accessibility";
import { readNodes } from "../snapshot";
import { describeChanges, summarize, transition, type Transition, type TransitionOptions, type TransitionResult } from "../transition";

const MAX_NAMED = 400;
let sequence = 0;

/** Whether the browser supports the View Transitions API. */
export function supportsViewTransitions(): boolean {
  return typeof document !== "undefined" && typeof document.startViewTransition === "function";
}

function timingRule(prefix: string, spring: SpringConfig): string {
  const { duration, easing } = springToCss(spring);

  return (
    `::view-transition-group(*.${prefix}),::view-transition-old(*.${prefix}),::view-transition-new(*.${prefix})` +
    `{animation-duration:${duration}ms;animation-timing-function:${easing}}`
  );
}

/** Animate whatever `update` does to `root` using the View Transitions API. */
export function viewTransition(root: HTMLElement, update: () => void | Promise<void>, options: TransitionOptions = {}): Transition {
  const reduced = resolveReducedMotion(options.reducedMotion);
  const before = readNodes(root);
  if (!supportsViewTransitions() || reduced || before.elements.length > MAX_NAMED) {
    return transition(root, update, options);
  }

  const prefix = `tl${(++sequence).toString(36)}`;
  const named: HTMLElement[] = [];
  const nameElement = (element: HTMLElement, index: number) => {
    element.style.setProperty("view-transition-name", `${prefix}-${index}`);
    element.style.setProperty("view-transition-class", prefix);
    named.push(element);
  };
  const clearNames = () => {
    for (const element of named) {
      element.style.removeProperty("view-transition-name");
      element.style.removeProperty("view-transition-class");
    }
    named.length = 0;
  };

  const style = document.createElement("style");
  style.textContent = timingRule(prefix, options.spring ?? springs.smooth);
  document.head.append(style);
  before.elements.forEach((element, index) => {
    nameElement(element, index);
  });

  let result: TransitionResult | undefined;
  const vt = document.startViewTransition(async () => {
    await update();
    clearNames();
    const after = readNodes(root);
    const matches = matchNodes(before.nodes, after.nodes, options.match);
    for (const pair of matches.pairs) nameElement(after.elements[pair.to]!, pair.from);
    const summary = summarize(before, after, matches);
    result = { before, after, matches, summary };
    if (options.announce) {
      announce(typeof options.announce === "function" ? options.announce(summary) : describeChanges(summary));
    }
  });

  const cleanUp = () => {
    clearNames();
    style.remove();
  };
  const finished = vt.finished.finally(cleanUp);
  const ready = vt.ready.then(() => result!);
  ready.catch(() => {});
  finished.catch(() => {});
  return {
    updated: vt.updateCallbackDone,
    ready,
    finished,
    skip: () => vt.skipTransition(),
  };
}
