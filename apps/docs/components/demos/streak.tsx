"use client";
import { Remold } from "@remold-ui/react";
import { AnimatePresence, motion } from "motion/react";
import type { Ref } from "react";
import { useControllableState } from "./use-controllable-state";
import { useScene } from "./use-scene";

const EMBER =
  "M12 9c.4 2 1.6 3 2.6 4.2.9 1.1 1.6 2.2 1.6 3.7 0 2.4-1.9 4.1-4.2 4.1s-4.2-1.7-4.2-4.1c0-1.6.7-2.8 1.7-3.7.1 1 .6 1.7 1.3 2-.4-2.2.4-4.4 1.2-6.2zM12 17.4c.4.5 1 .9 1 1.6 0 .6-.5 1-1 1s-1-.4-1-1c0-.5.3-.8.6-1 0 .2.1.4.3.5-.1-.4 0-.8.1-1.1z";
const FLAME =
  "M12 2.5c.6 3.2 2.6 5 4.3 7 1.5 1.8 2.7 3.6 2.7 6.2 0 3.9-3.1 6.8-7 6.8s-7-2.9-7-6.8c0-2.6 1.2-4.6 2.8-6.2.2 1.6 1 2.8 2.2 3.3-.6-3.6.6-7.4 2-10.3zM12 12.5c1.2 1.5 3 2.8 3 5 0 1.9-1.4 3.2-3 3.2s-3-1.3-3-3.2c0-1.4.8-2.4 1.7-3.1.1.8.5 1.3 1 1.5-.2-1.2 0-2.4.3-3.4z";

const DAYS = ["M", "T", "W", "T", "F", "S", "S"];
const START = 41;

const GROW = { type: "spring" as const, duration: 0.7, bounce: 0.35 };
const ROLL = { type: "spring" as const, duration: 0.45, bounce: 0.2 };

const SPARKS = Array.from({ length: 14 }, (_, index) => ({
  angle: (360 / 14) * index + (index % 2 ? 9 : -6),
  distance: 62 + (index % 3) * 16,
  size: 4 + (index % 3) * 2,
  color: ["#fb923c", "#facc15", "#f472b6", "#f97316"][index % 4]!,
}));

export interface StreakValue {
  days: number;
  lit: boolean;
}

function Count({ value }: { value: number }) {
  const digits = String(value).split("");
  return (
    <span
      className="inline-flex text-[40px] font-[750] tracking-[-0.03em] text-(--st-ink) tabular-nums transition-colors duration-450 group-data-lit/streak:text-(--st-fire)"
      aria-label={String(value)}
    >
      <AnimatePresence initial={false} mode="popLayout">
        {digits.map((digit, index) => (
          <motion.span
            key={`${digits.length - index}-${digit}`}
            className="inline-block"
            initial={{ y: "70%", opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: "-70%", opacity: 0 }}
            transition={ROLL}
            aria-hidden="true"
          >
            {digit}
          </motion.span>
        ))}
      </AnimatePresence>
    </span>
  );
}

export interface StreakProps {
  value?: StreakValue;
  defaultValue?: StreakValue;
  onValueChange?: (value: StreakValue) => void;
  today?: number;
  ref?: Ref<HTMLElement>;
}

export function Streak({
  value,
  defaultValue = { days: START, lit: false },
  onValueChange,
  today = 3,
  ref,
}: StreakProps) {
  const [streak, setStreak] = useControllableState({ value, defaultValue, onValueChange });

  const act = () =>
    setStreak((current) =>
      current.lit ? { ...current, lit: false } : { lit: true, days: current.days + 1 },
    );

  return (
    <section
      ref={ref}
      className="not-prose group/streak grid w-[min(100%,340px)] justify-items-center rounded-[28px] bg-(--st-surface) px-[22px] pt-[26px] pb-5 text-center font-sans text-(--st-ink) [--st-fire-soft:#ffedd5] [--st-fire:#f97316] [--st-ink:#18181b] [--st-muted:#71717a] [--st-off:#e4e4e7] [--st-on-ink:#fafafa] [--st-surface:#ffffff] dark:[--st-fire-soft:rgb(251_146_60/0.16)] dark:[--st-fire:#fb923c] dark:[--st-ink:#fafafa] dark:[--st-muted:#a1a1aa] dark:[--st-off:#3a3a40] dark:[--st-on-ink:#18181b] dark:[--st-surface:#232327]"
      aria-label="Daily streak"
      data-lit={streak.lit || undefined}
    >
      <div className="relative grid size-32 place-items-center">
        <span
          className="absolute inset-3.5 scale-60 rounded-full bg-[radial-gradient(circle,var(--st-fire-soft)_0%,transparent_70%)] opacity-0 transition-[opacity,scale] duration-[500ms,700ms] ease-[ease,cubic-bezier(0.2,0.8,0.3,1.2)] group-data-lit/streak:scale-125 group-data-lit/streak:opacity-100"
          aria-hidden="true"
        />
        <AnimatePresence>
          {streak.lit && (
            <span
              key="sparks"
              className="pointer-events-none absolute inset-0 grid place-items-center"
              aria-hidden="true"
            >
              {SPARKS.map((spark, index) => {
                const radians = (spark.angle * Math.PI) / 180;
                return (
                  <motion.i
                    key={index}
                    className="absolute rounded-full"
                    style={{ width: spark.size, height: spark.size, background: spark.color }}
                    initial={{ x: 0, y: 0, scale: 0, opacity: 1 }}
                    animate={{
                      x: Math.cos(radians) * spark.distance,
                      y: Math.sin(radians) * spark.distance - 8,
                      scale: [0, 1.2, 0],
                      opacity: [1, 1, 0],
                    }}
                    transition={{
                      duration: 0.9,
                      ease: [0.15, 0.8, 0.3, 1],
                      delay: 0.12 + (index % 3) * 0.03,
                    }}
                  />
                );
              })}
            </span>
          )}
        </AnimatePresence>
        <motion.span
          className="grid origin-[50%_90%] text-(--st-off) transition-colors duration-450 group-data-lit/streak:text-(--st-fire) [&_svg]:size-26"
          animate={{ scale: streak.lit ? [1, 1.12, 1] : 1, rotate: streak.lit ? [0, -4, 3, 0] : 0 }}
          transition={{ duration: 0.7, ease: "easeOut" }}
        >
          <Remold.Icon
            path={streak.lit ? FLAME : EMBER}
            viewBox="0 0 24 24"
            fill="currentColor"
            stroke="none"
            fillRule="evenodd"
            spring={{ duration: GROW.duration, bounce: GROW.bounce }}
            aria-hidden="true"
          />
        </motion.span>
      </div>

      <p className="mt-1.5 mb-0 flex items-baseline gap-2 text-[18px] font-semibold">
        <Count value={streak.days} />
        <span>day streak</span>
      </p>
      <div className="mt-1 grid min-h-10 text-[13.5px] leading-[1.45] text-(--st-muted)">
        <AnimatePresence initial={false} mode="popLayout">
          <motion.span
            key={streak.lit ? "lit" : "waiting"}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.2 }}
          >
            {streak.lit
              ? "You're on fire. Come back tomorrow to keep it going."
              : "Finish today's lesson to keep your streak."}
          </motion.span>
        </AnimatePresence>
      </div>

      <ol
        className="m-0 mt-4 grid w-full list-none grid-cols-7 gap-1.5 rounded-2xl bg-[color-mix(in_oklab,var(--st-off)_45%,transparent)] px-2.5 py-3"
        aria-label="This week"
      >
        {DAYS.map((day, index) => {
          const done = index < today || (index === today && streak.lit);
          return (
            <li
              key={index}
              className="group/day grid justify-items-center gap-1.5"
              data-today={index === today || undefined}
              aria-label={`${day}${done ? ", done" : ""}`}
            >
              <span className="text-[11.5px] font-semibold text-(--st-muted) group-data-today/day:text-(--st-fire)">
                {day}
              </span>
              <span className="grid size-[26px] rounded-full bg-(--st-off) group-data-today/day:shadow-[0_0_0_2px_var(--st-surface),0_0_0_4px_color-mix(in_oklab,var(--st-fire)_45%,transparent)]">
                <motion.span
                  className="grid place-items-center rounded-full bg-(--st-fire)"
                  initial={false}
                  animate={{ scale: done ? 1 : 0, opacity: done ? 1 : 0 }}
                  transition={{ ...GROW, delay: index === today && done ? 0.35 : 0 }}
                >
                  <svg
                    className="size-4 fill-none stroke-white [stroke-linecap:round] [stroke-linejoin:round] [stroke-width:3]"
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                  >
                    <motion.path
                      d="M6.5 12.5l3.5 3.5 7.5-8"
                      initial={false}
                      animate={{ pathLength: done ? 1 : 0 }}
                      transition={{ duration: 0.35, delay: index === today && done ? 0.5 : 0 }}
                    />
                  </svg>
                </motion.span>
              </span>
            </li>
          );
        })}
      </ol>

      <motion.button
        type="button"
        className="mt-4 h-12 w-full cursor-pointer rounded-full border-0 bg-(--st-ink) text-[15px] font-semibold text-(--st-on-ink) transition-colors duration-300 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--st-fire) group-data-lit/streak:bg-(--st-fire) group-data-lit/streak:text-white"
        onClick={act}
        whileTap={{ scale: 0.97 }}
      >
        {streak.lit ? "Continue" : "Finish today's lesson"}
      </motion.button>
    </section>
  );
}

const BEATS: readonly (StreakValue & { ms: number })[] = [
  { lit: false, days: START, ms: 1600 },
  { lit: true, days: START + 1, ms: 3400 },
];

const fromBeat = (step: number): StreakValue => ({ days: BEATS[step]!.days, lit: BEATS[step]!.lit });

interface StreakDemoProps {
  playing?: boolean;
}

export function StreakDemo({ playing }: StreakDemoProps = {}) {
  const scene = useScene(BEATS, fromBeat, playing);
  return <Streak ref={scene.ref} value={scene.state} onValueChange={scene.onValueChange} />;
}
