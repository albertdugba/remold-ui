"use client";

import { Remold } from "@remold-ui/react/canvas";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useRef, type MutableRefObject, type ReactNode, type RefObject } from "react";

export const MONO = "font-[ui-monospace,'SF_Mono',Menlo,monospace]";
export const FIGURE_SECTION =
  "not-prose relative grid min-h-[560px] w-full overflow-hidden bg-white font-sans shadow-[inset_0_0_0_1px_rgb(24_24_27/0.08)]";
export const FIGURE_CONTROL = `${MONO} h-8 cursor-pointer rounded-lg px-3 text-[12px] text-[#52525b] shadow-[inset_0_0_0_1px_rgb(24_24_27/0.12)] transition-[color,box-shadow] duration-150 ease-out hover:text-[#18181b] active:scale-[0.97] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#18181b]`;

const PINNED_TOP = 72;
const SCROLL_PER_STEP = 0.7;

export interface FigureStep {
  title: string;
  eyebrow: string;
  text: string;
  /** The object the callout follows. */
  anchor: string;
}

/** Call from the scene's `onDraw`, so a callout moves only when the scene does. */
export type Follow = MutableRefObject<(() => void) | null>;

/** A floating note that follows an object round the canvas as it and the camera move. */
export function FigureCallout({ step, actions, follow }: { step: FigureStep; actions: RefObject<Remold.Scene.Actions | null>; follow: Follow }) {
  const holder = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const place = () => {
      const point = actions.current?.anchor(step.anchor, "top");

      if (point && holder.current) holder.current.style.transform = `translate(${point.x}px, ${point.y}px)`;
    };

    follow.current = place;
    place();

    return () => {
      if (follow.current === place) follow.current = null;
    };
  }, [step, actions, follow]);

  return (
    <div ref={holder} className="pointer-events-none absolute top-0 left-0 z-10 will-change-transform">
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.div
          key={step.title}
          initial={{ opacity: 0, y: 6, filter: "blur(4px)" }}
          animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
          exit={{ opacity: 0, y: -4, filter: "blur(4px)", transition: { duration: 0.15 } }}
          className="absolute bottom-10 left-0 w-max max-w-[250px] -translate-x-1/2 rounded-xl bg-white px-3 py-2 shadow-[0_0_0_1px_rgb(24_24_27/0.08),0_12px_28px_-12px_rgb(24_24_27/0.35)]"
        >
          <span className={`${MONO} block text-[10.5px] text-[#8a8a92]`}>{step.eyebrow}</span>
          <span className="block text-[13px] font-semibold text-[#18181b]">{step.text}</span>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

/** The numbered steps along the bottom; picking one jumps to it. */
export function FigureRail<Id extends string>({
  steps,
  current,
  onPick,
}: {
  steps: readonly { id: Id; title: string }[];
  current: Id;
  onPick: (id: Id) => void;
}) {
  return (
    <ol className="flex flex-wrap items-center gap-1" aria-label="Steps">
      {steps.map(({ id, title }, index) => {
        const active = id === current;

        return (
          <li key={id}>
            <button
              type="button"
              aria-current={active ? "step" : undefined}
              onClick={() => onPick(id)}
              className={`${MONO} h-7 cursor-pointer rounded-md px-2 text-[11.5px] transition-[background-color,color,box-shadow] duration-150 ease-out active:scale-[0.97] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#18181b] ${active ? "bg-[#18181b] text-white" : "text-[#8a8a92] hover:text-[#18181b] hover:shadow-[inset_0_0_0_1px_rgb(24_24_27/0.12)]"}`}
            >
              {index + 1}. {title}
            </button>
          </li>
        );
      })}
    </ol>
  );
}

function trackProgress(element: HTMLElement) {
  const travel = element.offsetHeight - window.innerHeight + PINNED_TOP;
  const scrolled = PINNED_TOP - element.getBoundingClientRect().top;

  return travel > 0 ? Math.max(0, Math.min(1, scrolled / travel)) : 0;
}

/**
 * A tall track whose content stays pinned while you scroll past it. `children` gets the step the scroll
 * is on (0 to `count - 1`) and a function that scrolls to a step.
 */
export function ScrollFigure({
  count,
  accent,
  onStep,
  children,
}: {
  count: number;
  accent: string;
  onStep: (index: number) => void;
  children: (scrollTo: (index: number) => void) => ReactNode;
}) {
  const track = useRef<HTMLDivElement>(null);
  const bar = useRef<HTMLSpanElement>(null);
  const latest = useRef(onStep);

  latest.current = onStep;

  useEffect(() => {
    const element = track.current;

    if (!element) return;

    const update = () => {
      const progress = trackProgress(element);

      latest.current(Math.min(count - 1, Math.floor(progress * count)));

      if (bar.current) bar.current.style.transform = `scaleX(${progress})`;
    };

    update();
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);

    return () => {
      window.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, [count]);

  const scrollTo = (index: number) => {
    const element = track.current;

    if (!element) return;

    const travel = element.offsetHeight - window.innerHeight + PINNED_TOP;
    const top = element.getBoundingClientRect().top + window.scrollY - PINNED_TOP;

    window.scrollTo({ top: top + travel * ((index + 0.5) / count), behavior: "smooth" });
  };

  return (
    <div ref={track} className="relative col-span-full" style={{ height: `${count * SCROLL_PER_STEP * 100}vh` }}>
      <div className="sticky" style={{ top: PINNED_TOP }}>
        {children(scrollTo)}
        <span ref={bar} aria-hidden="true" className="absolute right-0 bottom-0 left-0 h-0.5 origin-left scale-x-0" style={{ background: accent }} />
      </div>
    </div>
  );
}
