"use client";

import { samplePath, type CloudPoint } from "@remold-ui/core";
import { Remold } from "@remold-ui/react/canvas";
import { AnimatePresence, MotionConfig, motion } from "motion/react";
import { useEffect, useMemo, useState, type Ref } from "react";
import { Odometer } from "./odometer";
import { useControllableState } from "./use-controllable-state";
import { useScene } from "./use-scene";
import "./donation-goal.css";

const GOAL = 1000;
const START = 640;
const AMOUNTS = [10, 25, 50] as const;
const DROP = "M50 2C38 22 16 42 16 64C16 84 31 98 50 98C69 98 84 84 84 64C84 42 62 22 50 2Z";
const HEART =
  "M50 94C50 94 12 70 12 40C12 26 22 16 35 16C42 16 47 20 50 26C53 20 58 16 65 16C78 16 88 26 88 40C88 70 50 94 50 94Z";
const DOTS = 1100;
const FRAME = { x: 10, y: 0, width: 80, height: 108 };
const STREAM_STEPS = 10;
const STREAM_EVERY = 60;
const POP = { type: "spring" as const, duration: 0.4, bounce: 0.2 };
const BAR = { type: "spring" as const, duration: 0.8, bounce: 0.1 };

const TONE = { ghost: 0, hidden: 0.5, water: 1 } as const;
const PALETTE = ["var(--dg-ghost)", "var(--dg-ghost)", "transparent", "var(--dg-accent)", "var(--dg-accent)"];

function seeded(index: number) {
  const x = Math.sin(index * 12.9898 + 78.233) * 43758.5453;
  return x - Math.floor(x);
}

const PICTURE: CloudPoint[] = samplePath(DROP, { count: DOTS })
  .map((point, index) => ({
    ...point,
    order: point.y - Math.sin(point.x * 0.18) * 2.2 + seeded(index) * 1.5,
  }))
  .sort((a, b) => b.order - a.order)
  .map(({ x, y }) => ({ x, y }));

const LOVE: CloudPoint[] = samplePath(HEART, { spacing: 2.3 }).map((point) => ({
  ...point,
  tone: TONE.water,
}));

function frame(filled: number, from: number): CloudPoint[] {
  const ghost = PICTURE.map((point) => ({ ...point, tone: TONE.ghost }));
  const fill = PICTURE.map((point, index) =>
    index < filled
      ? { ...point, tone: TONE.water }
      : { x: from * 100 + (seeded(index) - 0.5) * 18, y: 105 + seeded(index + 3) * 2, tone: TONE.hidden },
  );
  return [...ghost, ...fill];
}

export interface DonationGoalValue {
  raised: number;
  backers: number;
  from: number;
}

const money = (amount: number) => `£${amount.toLocaleString("en-GB")}`;
const filledFor = (raised: number) => Math.round(Math.min(1, raised / GOAL) * PICTURE.length);

function useStream(target: number) {
  const [shown, setShown] = useState(target);

  useEffect(() => {
    if (shown === target) return;
    const step = Math.max(1, Math.ceil(Math.abs(target - shown) / STREAM_STEPS));
    const timer = setTimeout(
      () =>
        setShown((current) =>
          current < target ? Math.min(target, current + step) : Math.max(target, current - step),
        ),
      STREAM_EVERY,
    );
    return () => clearTimeout(timer);
  }, [shown, target]);

  return shown;
}

function Picture({ raised, from, reached }: { raised: number; from: number; reached: boolean }) {
  const shown = useStream(filledFor(raised));
  const points = useMemo(() => frame(shown, from), [shown, from]);

  return (
    <Remold.Particles
      className="dg-canvas"
      shape={{ points: reached ? LOVE : points }}
      count={DOTS}
      palette={PALETTE}
      radius={1.4}
      fit={FRAME}
      padding={4}
      pointer={false}
      pairing={reached ? "match" : "index"}
      transition={reached ? { type: "scatter", spread: 0.4, hold: 0.2 } : "direct"}
      spring={{ duration: 0.9, bounce: 0.15 }}
      label={reached ? "Funded" : `${Math.round((raised / GOAL) * 100)}% of the well is funded`}
    />
  );
}

export interface DonationGoalProps {
  /** What's been raised, by how many backers, and where across the picture the last gift fell (0 to 1). */
  value?: DonationGoalValue;
  defaultValue?: DonationGoalValue;
  onValueChange?: (value: DonationGoalValue) => void;
  ref?: Ref<HTMLElement>;
}

/** A fundraiser's progress: each gift drops into the picture and the totals roll up. */
export function DonationGoal({
  value,
  defaultValue = { raised: START, backers: 41, from: 0.5 },
  onValueChange,
  ref,
}: DonationGoalProps) {
  const [goal, setGoal] = useControllableState({ value, defaultValue, onValueChange });
  const [choice, setChoice] = useState(1);
  const reached = goal.raised >= GOAL;
  const percent = Math.min(100, (goal.raised / GOAL) * 100);

  const donate = () =>
    setGoal((current) => ({
      raised: Math.min(GOAL, current.raised + AMOUNTS[choice]!),
      backers: current.backers + 1,
      from: [0.2, 0.5, 0.8][choice] ?? 0.5,
    }));

  const reset = () => setGoal({ raised: START, backers: 41, from: 0.5 });

  return (
    <MotionConfig reducedMotion="user">
      <section
        ref={ref}
        className="dg not-prose"
        aria-label="Donation goal"
        data-reached={reached || undefined}
      >
        <header className="dg-head">
          <span role="heading" aria-level={3} className="dg-title">
            A well for Asante village
          </span>
          <span className="dg-sub">9 days left</span>
        </header>

        <div className="dg-stage">
          <Picture raised={goal.raised} from={goal.from} reached={reached} />
        </div>

        <div className="dg-stats">
          <span className="dg-figures">
            <Odometer className="dg-raised" value={money(goal.raised)} />
            <span>of {money(GOAL)}</span>
            <span className="dg-backers">
              <Odometer value={String(goal.backers)} /> backers
            </span>
          </span>
          <span className="dg-bar" aria-hidden="true">
            <motion.span initial={false} animate={{ width: `${percent}%` }} transition={BAR} />
          </span>
        </div>

        <AnimatePresence mode="popLayout" initial={false}>
          {reached ? (
            <motion.div
              key="done"
              className="dg-actions dg-done"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={POP}
            >
              <span>Funded by {goal.backers} backers. Thank you!</span>
              <button type="button" className="dg-again" onClick={reset} aria-label="Start again">
                <svg
                  viewBox="0 0 24 24"
                  width="16"
                  height="16"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  aria-hidden="true"
                >
                  <path d="M3 12a9 9 0 1 0 3-6.7L3 8M3 3v5h5" />
                </svg>
              </button>
            </motion.div>
          ) : (
            <motion.div
              key="give"
              className="dg-actions"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={POP}
            >
              <div className="dg-amounts" role="radiogroup" aria-label="Amount">
                <motion.span
                  className="dg-thumb"
                  aria-hidden="true"
                  initial={false}
                  animate={{ x: `${choice * 100}%` }}
                  transition={POP}
                />
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
              </div>
              <motion.button type="button" className="dg-donate" onClick={donate} whileTap={{ scale: 0.96 }}>
                Donate
              </motion.button>
            </motion.div>
          )}
        </AnimatePresence>
      </section>
    </MotionConfig>
  );
}

// The docs demo: a short scripted scene that plays the element above. Your app doesn't need it.

const BEATS: readonly (DonationGoalValue & { ms: number })[] = [
  { raised: START, backers: 41, from: 0.5, ms: 1600 },
  { raised: 690, backers: 42, from: 0.82, ms: 1500 },
  { raised: 790, backers: 43, from: 0.18, ms: 1500 },
  { raised: 940, backers: 44, from: 0.5, ms: 1600 },
  { raised: 1000, backers: 45, from: 0.82, ms: 4200 },
];

const fromBeat = (step: number): DonationGoalValue => {
  const { ms: _, ...state } = BEATS[step]!;
  return state;
};

export function DonationGoalDemo({ playing }: { playing?: boolean } = {}) {
  const scene = useScene(BEATS, fromBeat, playing);
  return <DonationGoal ref={scene.ref} value={scene.state} onValueChange={scene.onValueChange} />;
}
