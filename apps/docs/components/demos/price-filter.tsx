"use client";

import { NumberField } from "@base-ui/react/number-field";
import { Slider } from "@base-ui/react/slider";
import { HugeiconsIcon } from "@hugeicons/react";
import { MinusSignIcon, PlusSignIcon } from "@hugeicons/core-free-icons";
import { AnimatePresence, MotionConfig, animate, motion, useMotionValue, useReducedMotion } from "motion/react";
import { useLayoutEffect, useRef, useState, type PointerEvent } from "react";
import { Odometer } from "./odometer";
import { useScript } from "./use-script";
import "./price-filter.css";

type Mode = "stepper" | "range";

const MIN = 0;
const MAX = 500;
const STEP = 10;
const START = 120;
const STEPPER_WIDTH = 172;
/** The slider's widest; on a narrow screen it takes the room it has. */
const RANGE_WIDTH = 320;
/** Where the slider's track starts: the padding, an end label and the gap before it. */
const TRACK_LEFT = 14 + 34 + 10;
/** Pixels the pointer moves sideways on the number before the stepper becomes a range. */
const DRAG_FROM = 6;

const SPRING = { type: "spring" as const, duration: 0.5, bounce: 0.25 };
const QUICK = { duration: 0.12 };
/** Following a drag: stiff enough to keep up, soft enough to smooth over a coarse step. */
const FOLLOW = { type: "spring" as const, stiffness: 900, damping: 60 };
const clamp = (value: number) => Math.min(MAX, Math.max(MIN, Math.round(value / STEP) * STEP));

/** The prices of everything in the category, spread the way a real shop's are: most cheap, a long tail. */
const PRICES = [
  12, 18, 19, 24, 26, 29, 32, 35, 38, 39, 42, 45, 48, 49, 55, 58, 59, 64, 68, 72, 75, 79, 84, 89, 95, 99, 105, 112,
  119, 125, 134, 139, 149, 159, 169, 179, 189, 199, 219, 239, 249, 269, 299, 329, 349, 389, 429, 479,
];
const BUCKET = 25;
const BUCKETS = Array.from({ length: MAX / BUCKET }, (_, index) =>
  PRICES.filter((price) => price >= index * BUCKET && price < (index + 1) * BUCKET).length,
);
const TALLEST = Math.max(...BUCKETS);

const fade = (delay = 0) => ({
  initial: { opacity: 0, scale: 0.6, filter: "blur(4px)" },
  animate: { opacity: 1, scale: 1, filter: "blur(0px)", transition: { ...SPRING, delay } },
  exit: { opacity: 0, scale: 0.6, filter: "blur(4px)", transition: QUICK },
});

export function PriceFilterDemo({ playing }: { playing?: boolean } = {}) {
  const [value, setValue] = useState(START);
  const [mode, setMode] = useState<Mode>("stepper");
  const control = useRef<HTMLDivElement>(null);
  const pill = useRef<HTMLSpanElement>(null);
  const shownMode = useRef<Mode | null>(null);
  const x = useMotionValue(0);
  const [rangeWidth, setRangeWidth] = useState(RANGE_WIDTH);
  const trackWidth = rangeWidth - TRACK_LEFT * 2;

  useLayoutEffect(() => {
    const stage = control.current?.closest<HTMLElement>(".stp-stage");
    if (!stage) return;
    const fit = () => setRangeWidth(Math.min(RANGE_WIDTH, stage.clientWidth));
    fit();
    const observer = new ResizeObserver(fit);
    observer.observe(stage);
    return () => observer.disconnect();
  }, []);
  const reduceMotion = useReducedMotion();

  // One value pill, always there: centred in the stepper, over the thumb in the range. It springs
  // between the two when the shape changes, and follows the thumb closely while you drag.
  useLayoutEffect(() => {
    const width = pill.current?.offsetWidth ?? 0;
    const centre = mode === "range" ? TRACK_LEFT + ((value - MIN) / (MAX - MIN)) * trackWidth : STEPPER_WIDTH / 2;
    const target = centre - width / 2;
    const reshaped = shownMode.current !== mode;
    if (shownMode.current === null || reduceMotion) x.set(target);
    else void animate(x, target, reshaped ? SPRING : FOLLOW);
    shownMode.current = mode;
  }, [mode, value, x, reduceMotion, trackWidth]);

  const handlePointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (mode !== "stepper" || event.button !== 0 || !(event.target as HTMLElement).closest(".stp-number")) return;
    event.preventDefault();
    const from = { x: event.clientX, value };
    let moved = false;

    // The control holds on to the pointer, so the drag keeps going over the slider that replaces
    // the stepper, and ends even if the pointer is let go outside the window.
    const element = event.currentTarget;
    element.setPointerCapture(event.pointerId);
    const move = (next: globalThis.PointerEvent) => {
      const distance = next.clientX - from.x;
      if (!moved && Math.abs(distance) < DRAG_FROM) return;
      if (!moved) {
        moved = true;
        setMode("range");
      }
      // Relative to where the drag began, so the thumb starts under the value it already had.
      setValue(clamp(from.value + (distance / rangeWidth) * (MAX - MIN)));
    };
    const end = () => {
      element.removeEventListener("pointermove", move);
      element.removeEventListener("lostpointercapture", end);
      window.removeEventListener("blur", end);
      if (moved) setMode("stepper");
      else control.current?.querySelector<HTMLInputElement>(".stp-input")?.focus();
    };
    element.addEventListener("pointermove", move);
    element.addEventListener("lostpointercapture", end);
    window.addEventListener("blur", end);
  };

  const sweep = (from: number, to: number, every: number) =>
    Array.from({ length: Math.abs(to - from) / STEP }, (_, index) => {
      const next = from + Math.sign(to - from) * STEP * (index + 1);
      return [every, () => setValue(next)] as const;
    });

  useScript(control, playing, [
    ...sweep(START, 150, 320),
    [450, () => setMode("range")],
    ...sweep(150, 320, 24),
    [700, () => {}],
    ...sweep(320, 220, 30),
    [600, () => setMode("stepper")],
    [1200, () => {}],
    ...sweep(220, START, 70),
    [1600, () => setValue(START)],
  ]);

  const shown = PRICES.filter((price) => price <= value).length;

  return (
    <MotionConfig transition={SPRING} reducedMotion="user">
      <div className="stp-stage not-prose">
        <div className="stp-field">
          <label className="stp-label" htmlFor="stp-price">
            Max price
          </label>
          <div className="stp-bars" aria-hidden="true">
            {BUCKETS.map((count, index) => (
              <span
                key={index}
                className="stp-bar"
                data-in={index * BUCKET < value || undefined}
                style={{ height: `${Math.max(8, (count / TALLEST) * 100)}%` }}
              />
            ))}
          </div>
          <motion.div
            ref={control}
            className="stp"
            data-mode={mode}
            initial={false}
            animate={{ width: mode === "range" ? rangeWidth : STEPPER_WIDTH }}
            onPointerDown={handlePointerDown}
          >
            <AnimatePresence mode="popLayout" initial={false}>
              {mode === "stepper" ? (
                <motion.div key="stepper" className="stp-face">
                  <NumberField.Root
                    id="stp-price"
                    value={value}
                    min={MIN}
                    max={MAX}
                    step={STEP}
                    onValueChange={(next) => next !== null && setValue(clamp(next))}
                  >
                    <NumberField.Group className="stp-group">
                      <NumberField.Decrement className="stp-step" aria-label="Lower the max price" render={<motion.button {...fade(0.06)} />}>
                        <HugeiconsIcon icon={MinusSignIcon} strokeWidth={2.2} aria-hidden="true" />
                      </NumberField.Decrement>
                      <span className="stp-number">
                        <NumberField.Input className="stp-input" aria-label="Max price in dollars" />
                      </span>
                      <NumberField.Increment className="stp-step" aria-label="Raise the max price" render={<motion.button {...fade(0.06)} />}>
                        <HugeiconsIcon icon={PlusSignIcon} strokeWidth={2.2} aria-hidden="true" />
                      </NumberField.Increment>
                    </NumberField.Group>
                  </NumberField.Root>
                </motion.div>
              ) : (
                <motion.div key="range" className="stp-face">
                  <Slider.Root className="stp-slider" value={value} min={MIN} max={MAX} step={STEP} onValueChange={(next) => setValue(clamp(next))} aria-label="Max price">
                    <motion.span className="stp-end" {...fade(0.08)}>
                      ${MIN}
                    </motion.span>
                    <Slider.Control className="stp-control">
                      <Slider.Track className="stp-track">
                        <Slider.Indicator className="stp-fill" />
                        <Slider.Thumb className="stp-thumb" />
                      </Slider.Track>
                    </Slider.Control>
                    <motion.span className="stp-end" {...fade(0.08)}>
                      ${MAX}
                    </motion.span>
                  </Slider.Root>
                </motion.div>
              )}
            </AnimatePresence>
            <motion.span ref={pill} className="stp-value" data-mode={mode} style={{ x }} aria-hidden="true">
              <span className="stp-unit">$</span>
              <Odometer value={String(value)} />
            </motion.span>
          </motion.div>
        </div>
        <p className="stp-count" aria-live="polite">
          <b>
            <Odometer value={String(shown)} />
          </b>
          of {PRICES.length} lamps under ${value}
        </p>
        <p className="stp-hint">Drag the price sideways for a slider</p>
      </div>
    </MotionConfig>
  );
}
