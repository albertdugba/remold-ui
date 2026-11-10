"use client";

import { HugeiconsIcon } from "@hugeicons/react";
import { NextIcon, PauseIcon, PlayIcon, RotateLeft01Icon } from "@hugeicons/core-free-icons";
import { samplePath, type CloudPoint } from "@remold-ui/core";
import { Remold } from "@remold-ui/react/canvas";
import { MotionConfig, motion } from "motion/react";
import { useEffect, useMemo, useReducer, useImperativeHandle, useRef, type Ref } from "react";
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
const FLIP = { type: "spring" as const, duration: 1, bounce: 0.18 };

const GLASS =
  "M22 6C22 30 44 40 47 50C44 60 22 70 22 94L78 94C78 70 56 60 53 50C56 40 78 30 78 6Z M12 4L88 4 M12 96L88 96";

const TONE = { glass: 0, sand: 1 } as const;
const PALETTE = ["var(--ft-glass)", "var(--ft-sand)"];

function seeded(index: number) {
  const x = Math.sin(index * 12.9898 + 78.233) * 43758.5453;
  return x - Math.floor(x);
}

const mirror = (point: CloudPoint): CloudPoint => ({ ...point, x: 100 - point.x, y: 100 - point.y });

const GLASS_POINTS: CloudPoint[] = samplePath(GLASS, { count: 230, mode: "outline" }).map((point) => ({
  ...point,
  tone: TONE.glass,
}));

const bezier = (t: number, a: number, b: number, c: number, d: number) =>
  (1 - t) ** 3 * a + 3 * (1 - t) ** 2 * t * b + 3 * (1 - t) * t * t * c + t ** 3 * d;

const WALL = Array.from({ length: 65 }, (_, index) => ({
  x: bezier(index / 64, 27, 27, 45, 48.6),
  y: bezier(index / 64, 9, 29, 40, 48.5),
}));

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
  const grains = TOP.map((top, index) => {
    if (index < fallen) return BOTTOM[index]!;
    const inStream = index - fallen;
    if (flowing && inStream < STREAM) {
      return { x: 50 + (seeded(index) - 0.5) * 1.4, y: surface - (surface - 51) * (inStream / STREAM) };
    }
    return top;
  });
  return [
    ...GLASS_POINTS,
    ...grains.map((grain) => ({ ...(flipped ? mirror(grain) : grain), tone: TONE.sand })),
  ];
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

export type FocusTimerAction =
  | { type: "tick" }
  | { type: "toggle" }
  | { type: "start" }
  | { type: "pause" }
  | { type: "skip" }
  | { type: "reset" }
  | { type: "set"; phase: Phase; round: number; remaining: number };

const lengthOf = (phase: Phase) => (phase === "focus" ? FOCUS : BREAK);

const INITIAL: Timer = {
  phase: "focus",
  round: 2,
  remaining: 3 * 60,
  running: false,
  flips: 0,
  wait: 0,
  rush: false,
};

function next(timer: Timer): Timer {
  const phase: Phase = timer.phase === "focus" ? "break" : "focus";
  const round = phase === "focus" ? (timer.round % ROUNDS) + 1 : timer.round;
  return {
    ...timer,
    phase,
    round,
    remaining: lengthOf(phase),
    flips: timer.flips + 1,
    wait: FLIP_TICKS,
    rush: false,
  };
}

function reduce(timer: Timer, action: FocusTimerAction): Timer {
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

const shown = (timer: Timer) => {
  const step = SPEED[timer.phase];
  return Math.min(lengthOf(timer.phase), Math.ceil(timer.remaining / step - 1e-6) * step);
};

const clock = (seconds: number) => {
  const whole = Math.ceil(seconds);
  return `${String(Math.floor(whole / 60)).padStart(2, "0")}:${String(whole % 60).padStart(2, "0")}`;
};

function Hourglass({ timer }: { timer: Timer }) {
  const total = lengthOf(timer.phase);
  const fallen = Math.round((1 - timer.remaining / total) * GRAINS);
  const flowing = timer.wait === 0 && fallen < GRAINS && (timer.running || timer.rush || fallen > 0);
  const flipped = timer.flips % 2 === 1;
  const points = useMemo(() => sand(fallen, flowing, flipped), [fallen, flowing, flipped]);

  return (
    <motion.div
      className="ft-glass"
      initial={false}
      animate={{ rotate: timer.flips * 180 }}
      transition={FLIP}
    >
      <Remold.Particles
        className="ft-canvas"
        shape={{ points }}
        palette={PALETTE}
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

export interface FocusTimerHandle {
  /** Starts, pauses, skips or resets the timer from outside, as a guided walkthrough does. */
  dispatch: (action: FocusTimerAction) => void;
}

export interface FocusTimerProps {
  actionsRef?: Ref<FocusTimerHandle>;
  /** Called when the person presses one of the controls. */
  onAction?: (action: FocusTimerAction) => void;
  ref?: Ref<HTMLElement>;
}

/** A pomodoro timer drawn as an hourglass of particles that flips between focus and break. */
export function FocusTimer({ actionsRef, onAction, ref }: FocusTimerProps) {
  const [timer, dispatch] = useReducer(reduce, INITIAL);
  const active = timer.running || timer.rush || timer.wait > 0;

  useImperativeHandle(actionsRef, () => ({ dispatch }), []);

  useEffect(() => {
    if (!active) return;
    const id = setInterval(() => dispatch({ type: "tick" }), timer.rush ? RUSH_MS : TICK_MS);
    return () => clearInterval(id);
  }, [active, timer.rush]);

  const act = (action: FocusTimerAction) => {
    onAction?.(action);
    dispatch(action);
  };

  const focus = timer.phase === "focus";

  return (
    <MotionConfig reducedMotion="user">
      <section ref={ref} className="ft not-prose" aria-label="Focus timer" data-phase={timer.phase}>
        <div className="ft-stage">
          <Hourglass timer={timer} />
        </div>

        <div className="ft-readout">
          <Odometer className="ft-time" value={clock(shown(timer))} />
          <span className="ft-note">
            <span className="ft-phase">{focus ? "Focus" : "Break"}</span> · {timer.round} of {ROUNDS}
          </span>
        </div>

        <div className="ft-actions">
          <button type="button" className="ft-icon" aria-label="Reset" onClick={() => act({ type: "reset" })}>
            <HugeiconsIcon icon={RotateLeft01Icon} size={17} strokeWidth={2} aria-hidden="true" />
          </button>
          <motion.button
            type="button"
            className="ft-primary"
            aria-label={timer.running ? "Pause" : "Start"}
            aria-pressed={timer.running}
            onClick={() => act({ type: "toggle" })}
            whileTap={{ scale: 0.92 }}
          >
            <Remold.Icon
              icon={<HugeiconsIcon icon={timer.running ? PauseIcon : PlayIcon} />}
              fill="currentColor"
              className="ft-play"
              aria-hidden="true"
            />
          </motion.button>
          <button
            type="button"
            className="ft-icon"
            aria-label={focus ? "Skip to break" : "Skip break"}
            onClick={() => act({ type: "skip" })}
          >
            <HugeiconsIcon icon={NextIcon} size={17} strokeWidth={2} aria-hidden="true" />
          </button>
        </div>
      </section>
    </MotionConfig>
  );
}

// The docs demo: a short scripted scene that plays the element above. Your app doesn't need it.

const BEATS: readonly { action: FocusTimerAction; ms: number }[] = [
  { action: { type: "set", phase: "focus", round: 2, remaining: 3 * 60 }, ms: 1400 },
  { action: { type: "start" }, ms: 8400 },
  { action: { type: "pause" }, ms: 1600 },
  { action: { type: "start" }, ms: 2200 },
  { action: { type: "skip" }, ms: 2800 },
];

const beatAction = (step: number) => BEATS[step]!.action;

export function FocusTimerDemo({ playing }: { playing?: boolean } = {}) {
  const scene = useScene(BEATS, beatAction, playing);
  const timer = useRef<FocusTimerHandle>(null);

  useEffect(() => {
    if (scene.live) timer.current?.dispatch(BEATS[scene.step]!.action);
  }, [scene.live, scene.step]);

  return <FocusTimer ref={scene.ref} actionsRef={timer} onAction={() => scene.takeOver(scene.state)} />;
}
