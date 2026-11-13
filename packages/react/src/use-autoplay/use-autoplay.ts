import { prefersReducedMotion, type ReducedMotion } from "@remold-ui/dom";
import { useCallback, useEffect, useState } from "react";
import type { Autoplay, AutoplayControlAttribute, AutoplayOptions } from "./types.js";

const CONTROL: AutoplayControlAttribute = "data-rm-autoplay-control";

const VISIBLE_SHARE = 0.25;

function useInView(element: HTMLElement | null): boolean {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!element) return;

    if (typeof IntersectionObserver === "undefined") {
      setVisible(true);
      return;
    }

    const observer = new IntersectionObserver(([entry]) => setVisible(entry?.isIntersecting ?? false), { threshold: VISIBLE_SHARE });

    observer.observe(element);

    return () => observer.disconnect();
  }, [element]);

  return visible;
}

function useReducedMotion(setting: ReducedMotion): boolean {
  const [system, setSystem] = useState(false);

  useEffect(() => {
    if (setting !== "user" || typeof matchMedia !== "function") return;

    const query = matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setSystem(prefersReducedMotion());

    update();
    query.addEventListener("change", update);

    return () => query.removeEventListener("change", update);
  }, [setting]);

  return setting === "always" || (setting === "user" && system);
}

function useStopOnInteraction(element: HTMLElement | null, enabled: boolean, stop: () => void) {
  useEffect(() => {
    if (!element || !enabled) return;

    const onInteract = (event: Event) => {
      if (event.target instanceof Element && event.target.closest(`[${CONTROL}]`)) return;

      stop();
    };

    element.addEventListener("pointerdown", onInteract, true);
    element.addEventListener("keydown", onInteract, true);
    element.addEventListener("click", onInteract, true);
    element.addEventListener("keyup", onInteract, true);

    return () => {
      element.removeEventListener("pointerdown", onInteract, true);
      element.removeEventListener("keydown", onInteract, true);
      element.removeEventListener("click", onInteract, true);
      element.removeEventListener("keyup", onInteract, true);
    };
  }, [element, enabled, stop]);
}

/** Steps through a sequence by itself while it's on screen, and stops when someone takes over. */
export function useAutoplay(count: number, options: AutoplayOptions = {}): Autoplay {
  const { every = 2400, initial = 0, stopOnInteraction = true, autoStart = true, reducedMotion = "user" } = options;

  const [step, setStep] = useState(initial);
  const [requested, setPlaying] = useState(autoStart);
  const [started, setStarted] = useState(false);
  const [element, setElement] = useState<HTMLElement | null>(null);
  const visible = useInView(element);
  const reduced = useReducedMotion(reducedMotion);

  const shown = Math.min(step, Math.max(0, count - 1));
  const delay = typeof every === "function" ? every(shown) : every;
  const playing = requested && (!reduced || started);
  const active = playing && visible;

  // biome-ignore lint/correctness/useExhaustiveDependencies: shown restarts the timer for each visible step.
  useEffect(() => {
    if (!active || count < 2) return;

    const timer = setTimeout(() => setStep((current) => (current + 1) % count), delay);

    return () => clearTimeout(timer);
  }, [active, count, delay, shown]);

  const stop = useCallback(() => setPlaying(false), []);

  useStopOnInteraction(element, stopOnInteraction && playing, stop);

  const next = useCallback(() => setStep((current) => (current + 1) % Math.max(1, count)), [count]);
  const play = useCallback(() => {
    setStarted(true);
    setPlaying(true);
  }, []);

  const toggle = useCallback(() => {
    if (playing) setPlaying(false);
    else play();
  }, [playing, play]);

  return {
    ref: setElement,
    step: shown,
    setStep,
    next,
    playing,
    active,
    setPlaying,
    play,
    toggleProps: { [CONTROL]: "", "aria-pressed": playing, onClick: toggle },
  };
}
