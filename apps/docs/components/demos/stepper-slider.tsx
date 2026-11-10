"use client";
import { NumberField } from "@base-ui/react/number-field";
import { Slider } from "@base-ui/react/slider";
import { HugeiconsIcon } from "@hugeicons/react";
import { MinusSignIcon, PlusSignIcon } from "@hugeicons/core-free-icons";
import {
  AnimatePresence,
  MotionConfig,
  animate,
  motion,
  useMotionValue,
  useReducedMotion,
} from "motion/react";
import { useId, useLayoutEffect, useRef, useState, type PointerEvent } from "react";
import { Odometer } from "./odometer";
import { useScript } from "./use-script";
import "./stepper-slider.css";

type Mode = "stepper" | "range";

const TRACK_LEFT = 14 + 34 + 10;
const DRAG_FROM = 6;

const SPRING = { type: "spring" as const, duration: 0.5, bounce: 0.25 };
const QUICK = { duration: 0.12 };
const FOLLOW = { type: "spring" as const, stiffness: 900, damping: 60 };

const fade = (delay = 0) => ({
  initial: { opacity: 0, scale: 0.6, filter: "blur(4px)" },
  animate: { opacity: 1, scale: 1, filter: "blur(0px)", transition: { ...SPRING, delay } },
  exit: { opacity: 0, scale: 0.6, filter: "blur(4px)", transition: QUICK },
});

export interface StepperSliderProps {
  value: number;
  onValueChange: (value: number) => void;
  min: number;
  max: number;
  step: number;
  /** What the number counts, shown beside it: "months". */
  unit?: string;
  label: string;
  /** The stepper's width; the slider stretches to the width it's given. Default 200. */
  stepperWidth?: number;
  /** Show it as the slider regardless of dragging, for a demo that plays on its own. */
  stretched?: boolean;
}

export function StepperSlider({
  value,
  onValueChange,
  min,
  max,
  step,
  unit,
  label,
  stepperWidth = 200,
  stretched = false,
}: StepperSliderProps) {
  const id = useId();
  const [dragging, setMode] = useState<Mode>("stepper");
  const mode: Mode = stretched ? "range" : dragging;
  const control = useRef<HTMLDivElement>(null);
  const row = useRef<HTMLDivElement>(null);
  const pill = useRef<HTMLSpanElement>(null);
  const shownMode = useRef<Mode | null>(null);
  const x = useMotionValue(0);
  const [rangeWidth, setRangeWidth] = useState(340);
  const trackWidth = rangeWidth - TRACK_LEFT * 2;
  const reduceMotion = useReducedMotion();
  const clamp = (next: number) => Math.min(max, Math.max(min, Math.round(next / step) * step));

  useLayoutEffect(() => {
    const element = row.current;
    if (!element) return;
    const fit = () => setRangeWidth(element.clientWidth);
    fit();
    const observer = new ResizeObserver(fit);
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  useLayoutEffect(() => {
    const width = pill.current?.offsetWidth ?? 0;
    const centre =
      mode === "range" ? TRACK_LEFT + ((value - min) / (max - min)) * trackWidth : stepperWidth / 2;
    const target = centre - width / 2;
    const reshaped = shownMode.current !== mode;
    if (shownMode.current === null || reduceMotion) x.set(target);
    else void animate(x, target, reshaped ? SPRING : FOLLOW);
    shownMode.current = mode;
  }, [mode, value, x, reduceMotion, trackWidth, min, max, stepperWidth]);

  const handlePointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (mode !== "stepper" || event.button !== 0 || !(event.target as HTMLElement).closest(".ssl-number"))
      return;
    event.preventDefault();
    const from = { x: event.clientX, value };
    let moved = false;

    const element = event.currentTarget;
    element.setPointerCapture(event.pointerId);
    const move = (next: globalThis.PointerEvent) => {
      const distance = next.clientX - from.x;
      if (!moved && Math.abs(distance) < DRAG_FROM) return;
      if (!moved) {
        moved = true;
        setMode("range");
      }
      onValueChange(clamp(from.value + (distance / trackWidth) * (max - min)));
    };
    const end = () => {
      element.removeEventListener("pointermove", move);
      element.removeEventListener("lostpointercapture", end);
      window.removeEventListener("blur", end);
      if (moved) setMode("stepper");
      else control.current?.querySelector<HTMLInputElement>(".ssl-input")?.focus();
    };
    element.addEventListener("pointermove", move);
    element.addEventListener("lostpointercapture", end);
    window.addEventListener("blur", end);
  };

  return (
    <MotionConfig transition={SPRING} reducedMotion="user">
      <div className="ssl">
        <label className="ssl-label" htmlFor={id}>
          {label}
        </label>
        <div ref={row} className="ssl-row">
          <motion.div
            ref={control}
            className="ssl-control"
            data-mode={mode}
            initial={false}
            animate={{ width: mode === "range" ? rangeWidth : stepperWidth }}
            onPointerDown={handlePointerDown}
          >
            <AnimatePresence mode="popLayout" initial={false}>
              {mode === "stepper" ? (
                <motion.div key="stepper" className="ssl-face">
                  <NumberField.Root
                    id={id}
                    value={value}
                    min={min}
                    max={max}
                    step={step}
                    onValueChange={(next) => next !== null && onValueChange(clamp(next))}
                  >
                    <NumberField.Group className="ssl-group">
                      <NumberField.Decrement
                        className="ssl-step"
                        aria-label={`Less ${label.toLowerCase()}`}
                        render={<motion.button {...fade(0.06)} />}
                      >
                        <HugeiconsIcon icon={MinusSignIcon} strokeWidth={2.2} aria-hidden="true" />
                      </NumberField.Decrement>
                      <span className="ssl-number">
                        <NumberField.Input
                          className="ssl-input"
                          aria-label={unit ? `${label}, in ${unit}` : label}
                        />
                      </span>
                      <NumberField.Increment
                        className="ssl-step"
                        aria-label={`More ${label.toLowerCase()}`}
                        render={<motion.button {...fade(0.06)} />}
                      >
                        <HugeiconsIcon icon={PlusSignIcon} strokeWidth={2.2} aria-hidden="true" />
                      </NumberField.Increment>
                    </NumberField.Group>
                  </NumberField.Root>
                </motion.div>
              ) : (
                <motion.div key="range" className="ssl-face">
                  <Slider.Root
                    className="ssl-slider"
                    value={value}
                    min={min}
                    max={max}
                    step={step}
                    onValueChange={(next) => onValueChange(clamp(next))}
                    aria-label={label}
                  >
                    <motion.span className="ssl-end" {...fade(0.08)}>
                      {min}
                    </motion.span>
                    <Slider.Control className="ssl-slider-control">
                      <Slider.Track className="ssl-track">
                        <Slider.Indicator className="ssl-fill" />
                        <Slider.Thumb className="ssl-thumb" />
                      </Slider.Track>
                    </Slider.Control>
                    <motion.span className="ssl-end" {...fade(0.08)}>
                      {max}
                    </motion.span>
                  </Slider.Root>
                </motion.div>
              )}
            </AnimatePresence>
            <motion.span ref={pill} className="ssl-value" data-mode={mode} style={{ x }} aria-hidden="true">
              <Odometer value={String(value)} />
              {unit && <span className="ssl-unit">{unit}</span>}
            </motion.span>
          </motion.div>
        </div>
      </div>
    </MotionConfig>
  );
}

const MIN = 3;
const MAX = 24;
const STEP = 3;
const START = 6;

export function StepperSliderDemo({ playing }: { playing?: boolean } = {}) {
  const [value, setValue] = useState(START);
  const [stretched, setStretched] = useState(false);
  const stage = useRef<HTMLDivElement>(null);

  const sweep = (from: number, to: number, every: number) =>
    Array.from({ length: Math.abs(to - from) / STEP }, (_, index) => {
      const stop = from + Math.sign(to - from) * STEP * (index + 1);
      return [every, () => setValue(stop)] as const;
    });

  useScript(stage, playing, [
    [1000, () => {}],
    ...sweep(START, 12, 650),
    [700, () => setStretched(true)],
    ...sweep(12, 21, 260),
    [900, () => {}],
    ...sweep(21, 9, 220),
    [800, () => setStretched(false)],
    [1400, () => {}],
    ...sweep(9, START, 650),
    [1600, () => setValue(START)],
  ]);

  return (
    <div ref={stage} className="ssl-stage not-prose">
      <StepperSlider
        value={value}
        onValueChange={setValue}
        min={MIN}
        max={MAX}
        step={STEP}
        unit="months"
        label="Months"
        stretched={stretched}
      />
      <p className="ssl-hint">Drag the number sideways for a slider</p>
    </div>
  );
}
