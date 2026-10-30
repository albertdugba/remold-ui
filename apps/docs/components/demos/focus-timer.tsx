"use client";

import { samplePath, type CloudPoint } from "@remold-ui/core";
import { Remold } from "@remold-ui/react";
import { AnimatePresence, MotionConfig, motion } from "motion/react";
import { useEffect, useMemo, useReducer, useRef, useState, type RefObject } from "react";
import { Odometer } from "./odometer";
import { useScene } from "./use-scene";
import "./focus-timer.css";

const FOCUS = 25 * 60;
const BREAK = 5 * 60;
const ROUNDS = 4;
const TICK_MS = 100;
const SPEED = { focus: 30, break: 20 } as const;
const RUSH_MS = 50;
const RUSH_TICKS = 10;
const FLIP_TICKS = 10;
const GRAIN_GAP = 1.8;
const STREAM = 14;
const POP = { type: "spring" as const, duration: 0.4, bounce: 0.2 };
const FLIP = { type: "spring" as const, duration: 1, bounce: 0.18 };

const GLASS =
  "M22 6C22 30 44 40 47 50C44 60 22 70 22 94L78 94C78 70 56 60 53 50C56 40 78 30 78 6Z M12 4L88 4 M12 96L88 96";

const TONE = { glass: 0, sand: 1 } as const;

function seeded(i: number) {
  const x = Math.sin(i * 12.9898 + 78.233) * 43758.5453;
  return x - Math.floor(x);
}

const mirror = (p: CloudPoint): CloudPoint => ({ ...p, x: 100 - p.x, y: 100 - p.y });

const GLASS_POINTS: CloudPoint[] = samplePath(GLASS, { count: 230, mode: "outline" }).map((p) => ({ ...p, tone: TONE.glass }));

const bezier = (t: number, a: number, b: number, c: number, d: number) =>
  (1 - t) ** 3 * a + 3 * (1 - t) ** 2 * t * b + 3 * (1 - t) * t * t * c + t ** 3 * d;

const WALL = Array.from({ length: 65 }, (_, i) => ({ x: bezier(i / 64, 27, 27, 45, 48.6), y: bezier(i / 64, 9, 29, 40, 48.5) }));

function wallAt(y: number) {
  for (let i = 1; i < WALL.length; i++) {
    const a = WALL[i - 1]!;
    const b = WALL[i]!;
    if (y >= a.y && y <= b.y) return a.x + ((b.x - a.x) * (y - a.y)) / (b.y - a.y);
  }
  return 50;
}

function bulb(): CloudPoint[] {
  const grains: CloudPoint[] = [];
  for (let row = 0, y = 10; y <= 48; row++, y = 10 + row * GRAIN_GAP * 0.866) {
    const half = 50 - wallAt(y) - 0.4;
    const offset = row % 2 ? GRAIN_GAP / 2 : 0;
    for (let x = 50 - Math.floor(30 / GRAIN_GAP) * GRAIN_GAP + offset; x <= 80; x += GRAIN_GAP) {
      if (Math.abs(x - 50) <= half) grains.push({ x, y });
    }
  }
  return grains.sort((a, b) => a.y + Math.abs(a.x - 50) * 0.2 - (b.y + Math.abs(b.x - 50) * 0.2));
}

const TOP = bulb();
const GRAINS = TOP.length;

const BOTTOM = TOP.map(mirror);

function sand(fallen: number, flowing: boolean, flipped: boolean): CloudPoint[] {
  const surface = BOTTOM[Math.min(fallen, BOTTOM.length - 1)]!.y;
  const grains = TOP.map((top, i) => {
    if (i < fallen) return BOTTOM[i]!;
    const j = i - fallen;
    if (flowing && j < STREAM) {
      return { x: 50 + (seeded(i) - 0.5) * 1.4, y: surface - (surface - 51) * (j / STREAM) };
    }
    return top;
  });
  return [...GLASS_POINTS, ...grains.map((p) => ({ ...(flipped ? mirror(p) : p), tone: TONE.sand }))];
}

type Phase = "focus" | "break";

interface Timer {
  phase: Phase;
  round: number;
  remaining: number;
  running: boolean;
  flips: number;
  wait: number;
  rush: boolean;
}

type Action =
  | { type: "tick" }
  | { type: "toggle" }
  | { type: "start" }
  | { type: "pause" }
  | { type: "skip" }
  | { type: "reset" }
  | { type: "set"; phase: Phase; round: number; remaining: number };

const lengthOf = (phase: Phase) => (phase === "focus" ? FOCUS : BREAK);

const INITIAL: Timer = { phase: "focus", round: 2, remaining: 3 * 60, running: false, flips: 0, wait: 0, rush: false };

function next(timer: Timer): Timer {
  const phase: Phase = timer.phase === "focus" ? "break" : "focus";
  const round = phase === "focus" ? (timer.round % ROUNDS) + 1 : timer.round;
  return { ...timer, phase, round, remaining: lengthOf(phase), flips: timer.flips + 1, wait: FLIP_TICKS, rush: false };
}

function reduce(timer: Timer, action: Action): Timer {
  switch (action.type) {
    case "tick": {
      if (timer.wait > 0) return { ...timer, wait: timer.wait - 1 };
      if (!timer.running && !timer.rush) return timer;
      const step = timer.rush ? lengthOf(timer.phase) / RUSH_TICKS : (SPEED[timer.phase] * TICK_MS) / 1000;
      const remaining = Math.max(0, timer.remaining - step);
      return remaining === 0 ? next(timer) : { ...timer, remaining };
    }
    case "toggle":
      return { ...timer, running: !timer.running };
    case "start":
      return { ...timer, running: true };
    case "pause":
      return { ...timer, running: false };
    case "skip":
      return timer.rush || timer.wait > 0 ? timer : { ...timer, rush: true };
    case "reset":
      return { ...timer, remaining: lengthOf(timer.phase), running: false, rush: false, wait: 0 };
    case "set":
      return {
        ...timer,
        phase: action.phase,
        round: action.round,
        remaining: action.remaining,
        running: false,
        rush: false,
        wait: 0,
      };
  }
}

const BEATS: readonly { action: Action; ms: number }[] = [
  { action: { type: "set", phase: "focus", round: 2, remaining: 3 * 60 }, ms: 1400 },
  { action: { type: "start" }, ms: 8400 },
  { action: { type: "pause" }, ms: 1600 },
  { action: { type: "start" }, ms: 2200 },
  { action: { type: "skip" }, ms: 2800 },
];

const beatAction = (step: number) => BEATS[step]!.action;

const shown = (timer: Timer) => {
  const step = SPEED[timer.phase];
  return Math.min(lengthOf(timer.phase), Math.ceil(timer.remaining / step - 1e-6) * step);
};

const clock = (seconds: number) => {
  const s = Math.ceil(seconds);
  return `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
};

function usePalette(root: RefObject<HTMLElement | null>) {
  const [palette, setPalette] = useState<string[] | null>(null);

  useEffect(() => {
    const read = () => {
      if (!root.current) return;
      const style = getComputedStyle(root.current);
      setPalette([style.getPropertyValue("--ft-glass").trim(), style.getPropertyValue("--ft-sand").trim()]);
    };
    read();
    const observer = new MutationObserver(read);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    return () => observer.disconnect();
  }, [root]);

  return palette;
}

function Hourglass({ timer, palette }: { timer: Timer; palette: string[] }) {
  const total = lengthOf(timer.phase);
  const fallen = Math.round((1 - timer.remaining / total) * GRAINS);
  const flowing = timer.wait === 0 && fallen < GRAINS && (timer.running || timer.rush || fallen > 0);
  const flipped = timer.flips % 2 === 1;
  const points = useMemo(() => sand(fallen, flowing, flipped), [fallen, flowing, flipped]);

  return (
    <motion.div className="ft-glass" initial={false} animate={{ rotate: timer.flips * 180 }} transition={FLIP}>
      <Remold.Particles
        key={palette.join()}
        className="ft-canvas"
        shape={{ points }}
        palette={palette}
        radius={1.5}
        padding={4}
        pointer={false}
        pairing="index"
        spring={{ duration: 0.45, bounce: 0 }}
        label={`${clock(shown(timer))} left`}
      />
    </motion.div>
  );
}

function Icon({ d }: { d: string }) {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={d} />
    </svg>
  );
}

export function FocusTimerDemo({ playing }: { playing?: boolean } = {}) {
  const scene = useScene(BEATS, beatAction, playing);
  const [timer, dispatch] = useReducer(reduce, INITIAL);
  const root = useRef<HTMLElement>(null);
  const palette = usePalette(root);
  const { live, step, take } = scene;
  const active = timer.running || timer.rush || timer.wait > 0;

  useEffect(() => {
    if (live) dispatch(BEATS[step]!.action);
  }, [live, step]);

  useEffect(() => {
    if (!active) return;
    const id = setInterval(() => dispatch({ type: "tick" }), timer.rush ? RUSH_MS : TICK_MS);
    return () => clearInterval(id);
  }, [active, timer.rush]);

  const act = (action: Action) => {
    take((a) => a);
    dispatch(action);
  };

  const focus = timer.phase === "focus";

  return (
    <MotionConfig reducedMotion="user">
      <section
        ref={(el) => {
          root.current = el;
          scene.ref(el);
        }}
        className="ft not-prose"
        aria-label="Focus timer"
        data-phase={timer.phase}
      >
        <header className="ft-head">
          <div className="ft-meta">
            <span className="ft-phase">
              <AnimatePresence mode="wait" initial={false}>
                <motion.span key={timer.phase} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }} transition={POP}>
                  {focus ? "Focus" : "Break"}
                </motion.span>
              </AnimatePresence>
            </span>
            <span className="ft-rounds" aria-label={`Round ${timer.round} of ${ROUNDS}`}>
              {Array.from({ length: ROUNDS }, (_, i) => (
                <motion.span
                  key={i}
                  className="ft-round"
                  data-state={i + 1 < timer.round ? "done" : i + 1 === timer.round ? "now" : undefined}
                  initial={false}
                  animate={{ width: i + 1 === timer.round ? 18 : 6 }}
                  transition={POP}
                />
              ))}
            </span>
          </div>
          <span role="heading" aria-level={3} className="ft-title">
            Ship the onboarding flow
          </span>
        </header>

        <div className="ft-stage">{palette && <Hourglass timer={timer} palette={palette} />}</div>

        <div className="ft-readout">
          <Odometer className="ft-time" value={clock(shown(timer))} />
          <span className="ft-note">{focus ? "until your break" : "until the next round"}</span>
        </div>

        <div className="ft-actions">
          <button type="button" className="ft-icon" aria-label="Reset" onClick={() => act({ type: "reset" })}>
            <Icon d="M3 12a9 9 0 1 0 3-6.7L3 8M3 3v5h5" />
          </button>
          <motion.button
            type="button"
            className="ft-primary"
            aria-pressed={timer.running}
            onClick={() => act({ type: "toggle" })}
            whileTap={{ scale: 0.96 }}
          >
            <AnimatePresence mode="popLayout" initial={false}>
              <motion.span
                key={timer.running ? "pause" : "start"}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={POP}
              >
                {timer.running ? "Pause" : timer.remaining < lengthOf(timer.phase) ? "Resume" : "Start"}
              </motion.span>
            </AnimatePresence>
          </motion.button>
          <button type="button" className="ft-icon" aria-label={focus ? "Skip to break" : "Skip break"} onClick={() => act({ type: "skip" })}>
            <Icon d="M5 5l10 7-10 7V5zM19 5v14" />
          </button>
        </div>
      </section>
    </MotionConfig>
  );
}
