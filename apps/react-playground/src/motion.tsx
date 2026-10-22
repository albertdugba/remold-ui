/**
 * Page-wide motion settings: Slow motion, Show matches and Reduce motion. Every demo reads
 * these through `useMotion()`, so one switch affects the whole page.
 */
import { frames, type FrameLoop, type ReducedMotion } from "@remold-ui/dom";
import { createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";

/** How much slower Slow motion runs. */
const SLOW = 5;

interface Motion {
  /** Pass to every Remold part: it runs slower when Slow motion is on. */
  loop: FrameLoop;
  reducedMotion: ReducedMotion;
  slow: boolean;
  showMatches: boolean;
  reduce: boolean;
  setSlow(on: boolean): void;
  setShowMatches(on: boolean): void;
  setReduce(on: boolean): void;
  /** A delay for scripted demos, stretched by Slow motion. Resolves false if `signal` aborted. */
  wait(ms: number, signal?: AbortSignal): Promise<boolean>;
}

const MotionContext = createContext<Motion | null>(null);

export function MotionProvider({ children }: { children: ReactNode }) {
  const [slow, setSlow] = useState(false);
  const [showMatches, setShowMatches] = useState(false);
  const [reduce, setReduce] = useState(false);
  const factor = useRef(1);
  factor.current = slow ? SLOW : 1;

  // One loop for the whole page whose time can be stretched while animations are running.
  const loop = useMemo<FrameLoop>(() => ({ add: (callback) => frames((dt) => callback(dt / factor.current)) }), []);

  useEffect(() => {
    document.documentElement.classList.toggle("show-matches", showMatches);
  }, [showMatches]);

  const value = useMemo<Motion>(
    () => ({
      loop,
      reducedMotion: reduce ? "always" : "user",
      slow,
      showMatches,
      reduce,
      setSlow,
      setShowMatches,
      setReduce,
      wait: (ms, signal) =>
        new Promise((resolve) => {
          if (signal?.aborted) return resolve(false);
          const timer = setTimeout(() => resolve(!signal?.aborted), ms * factor.current);
          signal?.addEventListener("abort", () => {
            clearTimeout(timer);
            resolve(false);
          });
        }),
    }),
    [loop, reduce, slow, showMatches],
  );
  return <MotionContext.Provider value={value}>{children}</MotionContext.Provider>;
}

export function useMotion(): Motion {
  const motion = useContext(MotionContext);
  if (!motion) throw new Error("useMotion must be used inside <MotionProvider>");
  return motion;
}

/**
 * A fresh AbortSignal for a scripted sequence, aborting the previous one: starting a new run
 * cancels whatever the last run was still waiting on. Aborts on unmount too.
 */
export function useRun() {
  const current = useRef<AbortController | null>(null);
  useEffect(() => () => current.current?.abort(), []);
  return () => {
    current.current?.abort();
    current.current = new AbortController();
    return current.current.signal;
  };
}
