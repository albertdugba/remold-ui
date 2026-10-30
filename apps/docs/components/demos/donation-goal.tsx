"use client";

import { sampleTextPoints } from "@remold-ui/canvas";
import { samplePath, type CloudPoint } from "@remold-ui/core";
import { Remold } from "@remold-ui/react";
import { AnimatePresence, MotionConfig, motion } from "motion/react";
import { useEffect, useMemo, useRef, useState, type RefObject } from "react";
import { Odometer } from "./odometer";
import { useScene } from "./use-scene";
import "./donation-goal.css";

const GOAL = 1000;
const START = 640;
const AMOUNTS = [10, 25, 50] as const;
const DROP = "M50 2C38 22 16 42 16 64C16 84 31 98 50 98C69 98 84 84 84 64C84 42 62 22 50 2Z";
const DOTS = 1100;
const THANKS_FONT = "500 132px -apple-system, BlinkMacSystemFont, Inter, sans-serif";
const STREAM_STEPS = 10;
const STREAM_EVERY = 60;
const POP = { type: "spring" as const, duration: 0.4, bounce: 0.2 };
const BAR = { type: "spring" as const, duration: 0.8, bounce: 0.1 };

const TONE = { ghost: 0, water: 0.5, hidden: 1 } as const;

function seeded(i: number) {
  const x = Math.sin(i * 12.9898 + 78.233) * 43758.5453;
  return x - Math.floor(x);
}

const PICTURE: CloudPoint[] = samplePath(DROP, { count: DOTS })
  .map((p, i) => ({ ...p, order: p.y - Math.sin(p.x * 0.18) * 2.2 + seeded(i) * 1.5 }))
  .sort((a, b) => b.order - a.order)
  .map(({ x, y }) => ({ x, y }));

const CORNERS: CloudPoint[] = [
  { x: 10, y: 0, tone: TONE.hidden },
  { x: 90, y: 0, tone: TONE.hidden },
  { x: 10, y: 108, tone: TONE.hidden },
  { x: 90, y: 108, tone: TONE.hidden },
];

function frame(filled: number, from: number): CloudPoint[] {
  const ghost = PICTURE.map((p) => ({ ...p, tone: TONE.ghost }));
  const fill = PICTURE.map((p, i) =>
    i < filled
      ? { ...p, tone: TONE.water }
      : { x: from * 100 + (seeded(i) - 0.5) * 18, y: 105 + seeded(i + 3) * 2, tone: TONE.hidden },
  );
  return [...ghost, ...fill, ...CORNERS];
}

interface State {
  raised: number;
  backers: number;
  from: number;
}

const BEATS: readonly (State & { ms: number })[] = [
  { raised: START, backers: 41, from: 0.5, ms: 1600 },
  { raised: 690, backers: 42, from: 0.82, ms: 1500 },
  { raised: 790, backers: 43, from: 0.18, ms: 1500 },
  { raised: 940, backers: 44, from: 0.5, ms: 1600 },
  { raised: 1000, backers: 45, from: 0.82, ms: 4200 },
];

function fromBeat(step: number): State {
  const { ms: _, ...state } = BEATS[step]!;
  return state;
}

const money = (n: number) => `£${n.toLocaleString("en-GB")}`;
const filledFor = (raised: number) => Math.round(Math.min(1, raised / GOAL) * PICTURE.length);

function usePalette(root: RefObject<HTMLElement | null>) {
  const [palette, setPalette] = useState<string[] | null>(null);

  useEffect(() => {
    const read = () => {
      if (!root.current) return;
      const style = getComputedStyle(root.current);
      const get = (name: string) => style.getPropertyValue(name).trim();
      const accent = get("--dg-accent");
      setPalette([get("--dg-ghost"), accent, accent, accent, "rgba(0,0,0,0)"]);
    };
    read();
    const observer = new MutationObserver(read);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    return () => observer.disconnect();
  }, [root]);

  return palette;
}

function useStream(target: number) {
  const [shown, setShown] = useState(target);

  useEffect(() => {
    if (shown === target) return;
    const step = Math.max(1, Math.ceil(Math.abs(target - shown) / STREAM_STEPS));
    const id = setTimeout(() => setShown((n) => (n < target ? Math.min(target, n + step) : Math.max(target, n - step))), STREAM_EVERY);
    return () => clearTimeout(id);
  }, [shown, target]);

  return shown;
}

function Picture({ raised, from, reached, palette }: { raised: number; from: number; reached: boolean; palette: string[] }) {
  const shown = useStream(filledFor(raised));
  const points = useMemo(() => frame(shown, from), [shown, from]);
  const thanks = useMemo(() => sampleTextPoints("Thank you", { count: DOTS, font: THANKS_FONT }).map((p) => ({ ...p, tone: TONE.water })), []);

  return (
    <Remold.Particles
      key={palette.join()}
      className="dg-canvas"
      shape={{ points: reached ? thanks : points }}
      count={DOTS}
      palette={palette}
      radius={1.5}
      padding={4}
      pointer={false}
      pairing={reached ? "match" : "index"}
      transition={reached ? { type: "scatter", spread: 0.4, hold: 0.2 } : "direct"}
      spring={{ duration: 0.9, bounce: 0.15 }}
      label={reached ? "Thank you" : `${Math.round((raised / GOAL) * 100)}% of the well is funded`}
    />
  );
}

export function DonationGoalDemo({ playing }: { playing?: boolean } = {}) {
  const scene = useScene(BEATS, fromBeat, playing);
  const { state, take } = scene;
  const root = useRef<HTMLElement>(null);
  const palette = usePalette(root);
  const [choice, setChoice] = useState(1);
  const reached = state.raised >= GOAL;
  const percent = Math.min(100, (state.raised / GOAL) * 100);

  const donate = () =>
    take((s) => ({
      raised: Math.min(GOAL, s.raised + AMOUNTS[choice]!),
      backers: s.backers + 1,
      from: [0.2, 0.5, 0.8][choice] ?? 0.5,
    }));

  const reset = () => take({ raised: START, backers: 41, from: 0.5 });

  return (
    <MotionConfig reducedMotion="user">
      <section
        ref={(el) => {
          root.current = el;
          scene.ref(el);
        }}
        className="dg not-prose"
        aria-label="Donation goal"
        data-reached={reached || undefined}
      >
        <header className="dg-head">
          <span role="heading" aria-level={3} className="dg-title">
            A well for Asante village
          </span>
          <span className="dg-sub">Ashanti, Ghana · 9 days left</span>
        </header>

        <div className="dg-stage">{palette && <Picture raised={state.raised} from={state.from} reached={reached} palette={palette} />}</div>

        <div className="dg-stats">
          <div className="dg-figures">
            <span className="dg-raised">
              <Odometer value={money(state.raised)} />
              <span>raised of {money(GOAL)}</span>
            </span>
            <span className="dg-backers">
              <Odometer value={String(state.backers)} /> backers
            </span>
          </div>
          <span className="dg-bar" aria-hidden="true">
            <motion.span initial={false} animate={{ width: `${percent}%` }} transition={BAR} />
          </span>
        </div>

        <div className="dg-actions">
          <AnimatePresence mode="popLayout" initial={false}>
            {reached ? (
              <motion.button
                key="again"
                type="button"
                className="dg-again"
                onClick={reset}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={POP}
              >
                Start again
              </motion.button>
            ) : (
              <motion.div
                key="amounts"
                className="dg-amounts"
                role="radiogroup"
                aria-label="Amount"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={POP}
              >
                <motion.span className="dg-thumb" aria-hidden="true" initial={false} animate={{ x: `${choice * 100}%` }} transition={POP} />
                {AMOUNTS.map((amount, index) => (
                  <button
                    key={amount}
                    type="button"
                    role="radio"
                    aria-checked={choice === index}
                    className="dg-amount"
                    onClick={() => setChoice(index)}
                  >
                    {money(amount)}
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>

          <motion.button
            type="button"
            className="dg-donate"
            disabled={reached}
            onClick={donate}
            whileTap={reached ? undefined : { scale: 0.96 }}
          >
            <AnimatePresence mode="popLayout" initial={false}>
              <motion.span
                key={reached ? "reached" : "donate"}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={POP}
              >
                {reached ? "Goal reached" : "Donate"}
              </motion.span>
            </AnimatePresence>
          </motion.button>
        </div>
      </section>
    </MotionConfig>
  );
}
