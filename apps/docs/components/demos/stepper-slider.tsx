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

type Mode = "stepper" | "range";

const TRACK_LEFT = 14 + 34 + 10;
const DRAG_FROM = 6;

const SPRING = { type: "spring" as const, duration: 0.5, bounce: 0.25 };
const QUICK = { duration: 0.12 };
const FOLLOW = { type: "spring" as const, stiffness: 900, damping: 60 };

const PALETTE = [
  "[--ssl-surface:#ffffff] [--ssl-well:#f4f4f5] [--ssl-line:rgb(10_10_11/0.1)] [--ssl-edge:rgb(0_0_0/0.06)]",
  "[--ssl-ink:#0a0a0b] [--ssl-soft:#3f3f46] [--ssl-muted:#71717a]",
  "dark:[--ssl-surface:#18181b] dark:[--ssl-well:#27272a] dark:[--ssl-line:rgb(255_255_255/0.12)] dark:[--ssl-edge:rgb(255_255_255/0.07)]",
  "dark:[--ssl-ink:#fafafa] dark:[--ssl-soft:#d4d4d8] dark:[--ssl-muted:#a1a1aa]",
].join(" ");

const STEP_BUTTON =
  "grid size-10 flex-none cursor-pointer place-items-center rounded-full border-0 bg-(--ssl-well) p-0 text-(--ssl-ink) transition-[scale,opacity] duration-150 not-data-disabled:active:scale-[0.92] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--ssl-ink) data-disabled:cursor-default data-disabled:opacity-35 max-[480px]:size-11 [&_svg]:size-4";
const END = "w-[34px] flex-none text-center text-[12px] font-semibold text-(--ssl-muted) tabular-nums";
const FACE = "flex size-full items-center [&>*]:flex-1";

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
  unit?: string;
  label: string;
  stepperWidth?: number;
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
    if (mode !== "stepper" || event.button !== 0 || !(event.target as HTMLElement).closest("[data-number]"))
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
      else control.current?.querySelector<HTMLInputElement>("[data-number] input")?.focus();
    };
    element.addEventListener("pointermove", move);
    element.addEventListener("lostpointercapture", end);
    window.addEventListener("blur", end);
  };

  return (
    <MotionConfig transition={SPRING} reducedMotion="user">
      <div
        className={`grid w-[min(100%,360px)] justify-items-center gap-3 font-sans tracking-[-0.006em] text-(--ssl-ink) antialiased ${PALETTE}`}
      >
        <label className="text-[13px] font-semibold text-(--ssl-soft)" htmlFor={id}>
          {label}
        </label>
        <div ref={row} className="flex w-full justify-center">
          <motion.div
            ref={control}
            data-mode={mode}
            className="group/control relative h-[52px] touch-pan-y overflow-clip rounded-full bg-(--ssl-surface) shadow-[0_0_0_1px_var(--ssl-edge),0_1px_2px_rgb(0_0_0/0.05),0_12px_28px_-20px_rgb(0_0_0/0.16)] select-none has-[[data-number]_input:focus-visible]:shadow-[inset_0_0_0_1.8px_var(--ssl-ink)]"
            initial={false}
            animate={{ width: mode === "range" ? rangeWidth : stepperWidth }}
            onPointerDown={handlePointerDown}
          >
            <AnimatePresence mode="popLayout" initial={false}>
              {mode === "stepper" ? (
                <motion.div key="stepper" className={FACE}>
                  <NumberField.Root
                    id={id}
                    value={value}
                    min={min}
                    max={max}
                    step={step}
                    onValueChange={(next) => next !== null && onValueChange(clamp(next))}
                  >
                    <NumberField.Group className="flex h-[52px] items-center px-1.5">
                      <NumberField.Decrement
                        className={STEP_BUTTON}
                        aria-label={`Less ${label.toLowerCase()}`}
                        render={<motion.button {...fade(0.06)} />}
                      >
                        <HugeiconsIcon icon={MinusSignIcon} strokeWidth={2.2} aria-hidden="true" />
                      </NumberField.Decrement>
                      <span data-number="" className="relative grid h-full flex-1 cursor-ew-resize place-items-center">
                        <NumberField.Input
                          className="absolute inset-0 w-full cursor-ew-resize border-0 bg-transparent text-center text-[18px] font-[650] text-transparent tabular-nums caret-(--ssl-ink) outline-none focus:cursor-text focus:text-(--ssl-ink) focus-visible:outline-none"
                          aria-label={unit ? `${label}, in ${unit}` : label}
                        />
                      </span>
                      <NumberField.Increment
                        className={STEP_BUTTON}
                        aria-label={`More ${label.toLowerCase()}`}
                        render={<motion.button {...fade(0.06)} />}
                      >
                        <HugeiconsIcon icon={PlusSignIcon} strokeWidth={2.2} aria-hidden="true" />
                      </NumberField.Increment>
                    </NumberField.Group>
                  </NumberField.Root>
                </motion.div>
              ) : (
                <motion.div key="range" className={FACE}>
                  <Slider.Root
                    className="flex h-[52px] items-center gap-2.5 px-3.5"
                    value={value}
                    min={min}
                    max={max}
                    step={step}
                    onValueChange={(next) => onValueChange(clamp(next))}
                    aria-label={label}
                  >
                    <motion.span className={END} {...fade(0.08)}>
                      {min}
                    </motion.span>
                    <Slider.Control className="flex h-[52px] flex-1 items-center">
                      <Slider.Track className="relative h-1 w-full rounded-[2px] bg-(--ssl-line)">
                        <Slider.Indicator className="rounded-[2px] bg-(--ssl-ink)" />
                        <Slider.Thumb data-thumb="" className="h-[34px] w-16 rounded-full outline-none max-[480px]:h-11" />
                      </Slider.Track>
                    </Slider.Control>
                    <motion.span className={END} {...fade(0.08)}>
                      {max}
                    </motion.span>
                  </Slider.Root>
                </motion.div>
              )}
            </AnimatePresence>
            <motion.span
              ref={pill}
              data-mode={mode}
              className="pointer-events-none absolute top-[9px] left-0 z-1 inline-flex h-[34px] items-center gap-0.5 rounded-full bg-transparent px-3 text-[18px] font-[650] whitespace-nowrap text-(--ssl-ink) tabular-nums transition-colors duration-250 group-has-[[data-number]_input:focus]/control:invisible group-has-[[data-thumb]_input:focus-visible]/control:outline-2 group-has-[[data-thumb]_input:focus-visible]/control:outline-offset-2 group-has-[[data-thumb]_input:focus-visible]/control:outline-(--ssl-ink) data-[mode=range]:bg-(--ssl-ink) data-[mode=range]:text-(--ssl-surface)"
              style={{ x }}
              aria-hidden="true"
            >
              <Odometer value={String(value)} />
              {unit && (
                <span className="ml-[3px] text-[12.5px] font-semibold text-[color-mix(in_oklab,currentColor_55%,transparent)]">
                  {unit}
                </span>
              )}
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
    <div ref={stage} className="not-prose grid min-h-[260px] w-full content-center justify-items-center gap-4">
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
      <p className="m-0 font-sans text-[12px] text-zinc-500 dark:text-zinc-400">Drag the number sideways for a slider</p>
    </div>
  );
}
