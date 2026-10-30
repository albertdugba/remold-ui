import { useCallback, useEffect, useState } from "react";
import type { Autoplay, AutoplayControlAttribute, AutoplayOptions } from "./types.js";

const CONTROL: AutoplayControlAttribute = "data-rm-autoplay-control";

/**
 * Steps through a sequence by itself while it's on screen, and stops when someone takes over.
 * Anything that moves by itself for more than five seconds needs a way to pause it (WCAG 2.2.2):
 * `toggleProps` makes any button that control.
 *
 * @example
 * ```tsx
 * const autoplay = useAutoplay(VIEWS.length, { every: 2000 });
 *
 * <section ref={autoplay.ref}>
 *   <Remold.Layout trigger={autoplay.step}>{renderView(VIEWS[autoplay.step])}</Remold.Layout>
 *   <button {...autoplay.toggleProps}>{autoplay.playing ? "Pause" : "Play"}</button>
 * </section>
 * ```
 */
export function useAutoplay(count: number, options: AutoplayOptions = {}): Autoplay {
  const { every = 2400, initial = 0, stopOnInteraction = true, autoStart = true } = options;

  const [step, setStep] = useState(initial);
  const [playing, setPlaying] = useState(autoStart);
  const [visible, setVisible] = useState(false);
  const [element, setElement] = useState<HTMLElement | null>(null);

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

  const shown = Math.min(step, Math.max(0, count - 1));
  const delay = typeof every === "function" ? every(shown) : every;

  // biome-ignore lint/correctness/useExhaustiveDependencies: shown restarts the timer for each visible step.
  useEffect(() => {
    if (!playing || !visible || count < 2) return;

    const timer = setTimeout(() => setStep((s) => (s + 1) % count), delay);

    return () => clearTimeout(timer);
  }, [playing, visible, count, delay, shown]);

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
