"use client";

import { useEffect, useRef, useState, type RefObject } from "react";

/** One step of a script: run it, then wait this many ms before the next. */
export type ScriptStep = readonly [ms: number, run: () => void];

/**
 * Plays a demo by calling its own handlers in a loop while `playing` is true, as the home page's
 * cards do, so it animates exactly as it would for a person. A real press or key inside `root`
 * hands it over to them until it's played again.
 */
export function useScript(root: RefObject<HTMLElement | null>, playing: boolean | undefined, steps: readonly ScriptStep[]) {
  const [touched, setTouched] = useState(false);
  const latest = useRef(steps);
  latest.current = steps;
  const live = Boolean(playing) && !touched;

  useEffect(() => {
    if (playing) setTouched(false);
  }, [playing]);

  useEffect(() => {
    const element = root.current;
    if (!element || !playing) return;
    const take = (event: Event) => event.isTrusted && setTouched(true);
    element.addEventListener("pointerdown", take);
    element.addEventListener("keydown", take);
    return () => {
      element.removeEventListener("pointerdown", take);
      element.removeEventListener("keydown", take);
    };
  }, [root, playing]);

  useEffect(() => {
    if (!live) return;
    let index = 0;
    let timer: ReturnType<typeof setTimeout>;
    const next = () => {
      const [ms, run] = latest.current[index % latest.current.length]!;
      run();
      index++;
      timer = setTimeout(next, ms);
    };
    timer = setTimeout(next, 600);
    return () => clearTimeout(timer);
  }, [live]);

  return live;
}
