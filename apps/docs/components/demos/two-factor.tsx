"use client";

import { HugeiconsIcon } from "@hugeicons/react";
import { CheckIcon } from "@hugeicons/core-free-icons";
import { Switch as BaseSwitch } from "@base-ui/react/switch";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useEffect, useLayoutEffect, useRef, useState, type Ref } from "react";
import { Frame } from "./frame";
import { CodeField } from "./code-field";
import { useControllableState, type ChangeDetails } from "./use-controllable-state";
import { useScene } from "./use-scene";

const CODE = "482915";
const LENGTH = CODE.length;

export type TwoFactorPhase = "off" | "setup" | "on";

export interface TwoFactorValue {
  /** Off, setting up (scanning and typing the code), or on. */
  phase: TwoFactorPhase;
  /** The digits typed so far. */
  code: string;
  /** Whether sign-in alerts are on. */
  alerts: boolean;
}

const SPRING = { type: "spring" as const, duration: 0.55, bounce: 0.14 };
const SETTLE = { type: "spring" as const, duration: 0.4, bounce: 0.18 };

const ACCEPT = 450;

const OPEN = 328;

const SIZE = 21;
const FINDERS = [
  [0, 0],
  [SIZE - 7, 0],
  [0, SIZE - 7],
] as const;
const MODULES: [number, number][] = [];
for (let y = 0; y < SIZE; y++)
  for (let x = 0; x < SIZE; x++) {
    if (FINDERS.some(([fx, fy]) => x >= fx - 1 && x < fx + 8 && y >= fy - 1 && y < fy + 8)) continue;
    if (((x * 37 + y * 61 + x * y * 7) % 11) % 3 === 0) MODULES.push([x, y]);
  }

function Qr() {
  return (
    <svg
      className="size-[62px] text-zinc-900"
      viewBox={`-1 -1 ${SIZE + 2} ${SIZE + 2}`}
      aria-hidden="true"
      shapeRendering="crispEdges"
    >
      {FINDERS.map(([x, y]) => (
        <g key={`${x}-${y}`}>
          <rect
            x={x + 0.5}
            y={y + 0.5}
            width={6}
            height={6}
            fill="none"
            stroke="currentColor"
            strokeWidth={1}
          />
          <rect x={x + 2} y={y + 2} width={3} height={3} fill="currentColor" />
        </g>
      ))}
      {MODULES.map(([x, y]) => (
        <rect key={`${x}-${y}`} x={x} y={y} width={1} height={1} fill="currentColor" />
      ))}
    </svg>
  );
}

function Switch({ on, label, onToggle }: { on: boolean; label: string; onToggle: () => void }) {
  return (
    <BaseSwitch.Root
      className="flex h-[22px] w-9 flex-none cursor-pointer rounded-full border-0 bg-(--tf-track) p-0.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--tf-ink) data-checked:bg-(--tf-on) transition-colors duration-200"
      aria-label={label}
      checked={on}
      onCheckedChange={onToggle}
    >
      <BaseSwitch.Thumb
        className="size-[18px] rounded-full bg-white dark:data-checked:bg-zinc-900"
        render={<motion.span initial={false} animate={{ x: on ? 14 : 0 }} transition={SETTLE} />}
      />
    </BaseSwitch.Root>
  );
}

export interface TwoFactorProps {
  /** Where setup is, the digits typed, and whether sign-in alerts are on. */
  value?: TwoFactorValue;
  defaultValue?: TwoFactorValue;
  onValueChange?: (value: TwoFactorValue, details: ChangeDetails) => void;
  /** Moves focus to the code field when setup starts. */
  autoFocus?: boolean;
  ref?: Ref<HTMLElement>;
}

/** Two-factor setup: turn it on, scan the code, type the six digits, and it settles into its on state. */
export function TwoFactor({
  value,
  defaultValue = { phase: "off", code: "", alerts: true },
  onValueChange,
  autoFocus = true,
  ref,
}: TwoFactorProps) {
  const [setup, setSetup] = useControllableState({ value, defaultValue, onValueChange });
  const input = useRef<HTMLInputElement>(null);
  const accepting = useRef<ReturnType<typeof setTimeout>>(undefined);
  const reduced = useReducedMotion();
  const swap = reduced
    ? { initial: { opacity: 0 }, animate: { opacity: 1 }, exit: { opacity: 0 } }
    : {
        initial: { opacity: 0, y: 6, filter: "blur(3px)" },
        animate: { opacity: 1, y: 0, filter: "blur(0px)" },
        exit: { opacity: 0, y: -6, filter: "blur(3px)" },
      };

  useEffect(() => {
    if (setup.phase === "setup" && autoFocus) input.current?.focus({ preventScroll: true });
  }, [setup.phase, autoFocus]);

  useEffect(() => () => clearTimeout(accepting.current), []);

  const card = useRef<HTMLDivElement>(null);
  const [tallest, setTallest] = useState(0);
  useLayoutEffect(() => {
    const element = card.current;
    if (!element) return;
    let width = element.offsetWidth;
    const observer = new ResizeObserver(() => {
      const reflowed = element.offsetWidth !== width;
      width = element.offsetWidth;
      const height = element.offsetHeight;
      setTallest((current) => (reflowed ? height : Math.max(current, height)));
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  const enter = (value: string) => {
    const code = value.replace(/\D/g, "").slice(0, LENGTH);
    setSetup((current) => ({ ...current, code }));
    clearTimeout(accepting.current);
    if (code.length === LENGTH)
      accepting.current = setTimeout(
        () => setSetup((current) => ({ ...current, phase: "on" }), "timer"),
        ACCEPT,
      );
  };

  return (
    <section
      ref={ref}
      style={{ minHeight: Math.max(OPEN, tallest) }}
      className="grid w-[min(100%,360px)] content-start font-sans text-(--tf-ink) [--tf-faint:#a1a1aa] [--tf-fill:#f4f4f5] [--tf-good:#15803d] [--tf-ink:#18181b] [--tf-line:rgb(24_24_27/0.07)] [--tf-muted:#71717a] [--tf-on:#18181b] [--tf-surface:#ffffff] [--tf-track:#e4e4e7] dark:[--tf-faint:#71717a] dark:[--tf-fill:#2c2c31] dark:[--tf-good:#4ade80] dark:[--tf-ink:#fafafa] dark:[--tf-line:rgb(255_255_255/0.07)] dark:[--tf-muted:#a1a1aa] dark:[--tf-on:#fafafa] dark:[--tf-surface:#232327] dark:[--tf-track:#3a3a40]"
      data-phase={setup.phase}
      aria-label="Two-factor settings"
    >
      <div
        ref={card}
        className="grid rounded-[18px] bg-(--tf-surface) px-4 py-1 in-[.rm-stage]:shadow-[inset_0_0_0_1px_rgb(24_24_27/0.08)] dark:in-[.rm-stage]:shadow-[inset_0_0_0_1px_rgb(255_255_255/0.08)]"
      >
        <div className="flex items-center gap-3.5 py-3.5 not-first:shadow-[0_-1px_0_var(--tf-line)]">
          <span className="grid min-w-0 flex-1 gap-0.5 [&>strong]:text-[13.5px] [&>strong]:font-semibold">
            <strong>Two-factor authentication</strong>
            <span className="relative grid overflow-hidden">
              <AnimatePresence initial={false} mode="popLayout">
                {setup.phase === "on" ? (
                  <motion.span
                    key="on"
                    className="inline-flex items-center gap-[5px] text-[12.5px] font-medium text-(--tf-good) [&_svg]:size-[13px]"
                    {...swap}
                    transition={SETTLE}
                  >
                    <HugeiconsIcon icon={CheckIcon} aria-hidden="true" strokeWidth={2.75} />
                    On · Authenticator app
                  </motion.span>
                ) : (
                  <motion.span
                    key="off"
                    className="text-[12.5px] text-(--tf-muted)"
                    {...swap}
                    transition={SETTLE}
                  >
                    Ask for a code when signing in
                  </motion.span>
                )}
              </AnimatePresence>
            </span>
          </span>
          <Switch
            on={setup.phase !== "off"}
            label="Two-factor authentication"
            onToggle={() => {
              clearTimeout(accepting.current);
              setSetup((current) => ({
                ...current,
                phase: current.phase === "off" ? "setup" : "off",
                code: "",
              }));
            }}
          />
        </div>

        <AnimatePresence initial={false}>
          {setup.phase === "setup" && (
            <motion.div
              key="setup"
              className="overflow-hidden"
              initial={reduced ? { opacity: 0 } : { height: 0 }}
              animate={reduced ? { opacity: 1 } : { height: "auto", transition: SPRING }}
              exit={reduced ? { opacity: 0 } : { height: 0, transition: { ...SPRING, delay: 0.1 } }}
              transition={reduced ? { duration: 0.15 } : undefined}
            >
              <motion.div
                className="grid gap-3.5 pt-0.5 pb-[18px]"
                initial={reduced ? false : { opacity: 0, y: -6, scale: 0.98, filter: "blur(4px)" }}
                animate={{
                  opacity: 1,
                  y: 0,
                  scale: 1,
                  filter: "blur(0px)",
                  transition: { ...SETTLE, delay: 0.12 },
                }}
                exit={
                  reduced
                    ? undefined
                    : {
                        opacity: 0,
                        scale: 0.98,
                        filter: "blur(4px)",
                        transition: { duration: 0.14, ease: "easeOut" as const },
                      }
                }
                style={{ transformOrigin: "top center" }}
              >
                <div className="flex items-center gap-3.5">
                  <span className="grid size-[76px] flex-none place-items-center rounded-xl bg-(--tf-fill) dark:bg-white">
                    <Qr />
                  </span>
                  <span className="text-[12.5px] leading-[1.45] text-pretty text-(--tf-muted)" id="tf-hint">
                    Scan with your authenticator app, then enter the 6-digit code it shows.
                  </span>
                </div>
                <CodeField
                  className="justify-self-center [--cf-cell:var(--tf-fill)]! [--cf-ink:var(--tf-ink)]!"
                  value={setup.code}
                  onChange={enter}
                  inputRef={input}
                  describedBy="tf-hint"
                />
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="flex items-center gap-3.5 py-3.5 not-first:shadow-[0_-1px_0_var(--tf-line)]">
          <span className="grid min-w-0 flex-1 gap-0.5 [&>strong]:text-[13.5px] [&>strong]:font-semibold">
            <strong>Sign-in alerts</strong>
            <span className="text-[12.5px] text-(--tf-muted)">Email me about new devices</span>
          </span>
          <Switch
            on={setup.alerts}
            label="Sign-in alerts"
            onToggle={() => setSetup((current) => ({ ...current, alerts: !current.alerts }))}
          />
        </div>
      </div>
    </section>
  );
}

// The docs demo: a short scripted scene that plays the element above. Your app doesn't need it.

const BEATS: readonly { phase: TwoFactorPhase; ms: number; digits?: number }[] = [
  { phase: "off", ms: 1800 },
  { phase: "setup", ms: 1500 },
  ...[1, 2, 3, 4, 5, 6].map((digits) => ({
    phase: "setup" as const,
    digits,
    ms: digits === LENGTH ? 520 : 75,
  })),
  { phase: "on", ms: 2800 },
];

const fromBeat = (step: number): TwoFactorValue => {
  const beat = BEATS[step]!;
  return {
    phase: beat.phase,
    code: CODE.slice(0, beat.digits ?? 0),
    alerts: true,
  };
};

interface TwoFactorDemoProps {
  framed?: boolean;
  playing?: boolean;
}

export function TwoFactorDemo({ framed = true, playing }: TwoFactorDemoProps) {
  const scene = useScene(BEATS, fromBeat, playing);
  const element = (
    <TwoFactor
      ref={scene.ref}
      value={scene.state}
      onValueChange={scene.onValueChange}
      autoFocus={!scene.live}
    />
  );
  return framed ? <Frame>{element}</Frame> : element;
}
