/**
 * `useAutoplay(count, { every })`: step through `count` states by itself, the way a landing-page
 * demo does. It only plays while its element is on screen, and stops for good once someone
 * clicks, taps or types inside it, so it never fights the person using it.
 *
 * ```tsx
 * const autoplay = useAutoplay(VIEWS.length, { every: 2000 });
 * <section ref={autoplay.ref}>
 *   <Remold.Layout trigger={autoplay.step}>{render(VIEWS[autoplay.step])}</Remold.Layout>
 *   <button {...autoplay.toggleProps}>{autoplay.playing ? "Pause" : "Play"}</button>
 * </section>
 * ```
 *
 * A pause button is required for content that moves on its own for more than five seconds
 * (WCAG 2.2.2): `toggleProps` makes any button one.
 */
import { useCallback, useEffect, useState, type RefCallback } from "react";

/** Marks the play/pause button, so pressing it doesn't count as taking over. */
const CONTROL = "data-rm-autoplay-control";

export interface AutoplayOptions {
  /** Milliseconds per step, or a function of the step for steps that should linger. Default 2400. */
  every?: number | ((step: number) => number);
  /** The first step. Default 0. */
  initial?: number;
  /** Stop when someone clicks, taps or types inside the element. Default true. */
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
  playing: boolean;
  setPlaying: (playing: boolean) => void;
  /** Spread on a button to make it the play/pause control. */
  toggleProps: { [CONTROL]: ""; "aria-pressed": boolean; onClick: () => void };
}

export function useAutoplay(count: number, options: AutoplayOptions = {}): Autoplay {
  const { every = 2400, initial = 0, stopOnInteraction = true, autoStart = true } = options;
  const [step, setStep] = useState(initial);
  const [playing, setPlaying] = useState(autoStart);
  const [visible, setVisible] = useState(false);
  const [element, setElement] = useState<HTMLElement | null>(null);

  // Play only while on screen. Without IntersectionObserver, count it as visible.
  useEffect(() => {
    if (!element) return;
    if (typeof IntersectionObserver === "undefined") {
      setVisible(true);
      return;
    }
    const observer = new IntersectionObserver(([entry]) => setVisible(entry?.isIntersecting ?? false), { threshold: 0.25 });
    observer.observe(element);
    return () => observer.disconnect();
  }, [element]);

  // One timer per step, so each step can have its own length.
  const shown = Math.min(step, Math.max(0, count - 1));
  const delay = typeof every === "function" ? every(shown) : every;
  useEffect(() => {
    if (!playing || !visible || count < 2) return;
    const timer = setTimeout(() => setStep((s) => (s + 1) % count), delay);
    return () => clearTimeout(timer);
  }, [playing, visible, count, delay, shown]);

  // Someone took over: stop, unless they pressed the play/pause button itself.
  useEffect(() => {
    if (!element || !stopOnInteraction || !playing) return;
    const stop = (event: Event) => {
      if (event.target instanceof Element && event.target.closest(`[${CONTROL}]`)) return;
      setPlaying(false);
    };
    element.addEventListener("pointerdown", stop, true);
    element.addEventListener("keydown", stop, true);
    return () => {
      element.removeEventListener("pointerdown", stop, true);
      element.removeEventListener("keydown", stop, true);
    };
  }, [element, stopOnInteraction, playing]);

  const next = useCallback(() => setStep((s) => (s + 1) % Math.max(1, count)), [count]);
  const toggle = useCallback(() => setPlaying((p) => !p), []);
  return {
    ref: setElement,
    step: shown,
    setStep,
    next,
    playing,
    setPlaying,
    toggleProps: { [CONTROL]: "", "aria-pressed": playing, onClick: toggle },
  };
}
