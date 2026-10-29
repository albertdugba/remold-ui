"use client";
/**
 * Keeping a daily streak, the celebration learning apps show when you finish today's lesson. The
 * grey ember reshapes into a full flame and catches colour, sparks burst out of it, the day count
 * rolls up, and today's dot on the week fills in.
 *
 * Built with Motion; the flame reshapes with Remold's `createMorph`, so the ember genuinely grows
 * into the flame rather than one swapping for the other. It plays a short scene while it's on
 * screen. Touch it and it's yours.
 */
import { AnimatePresence, motion } from "motion/react";
import { MorphIcon } from "./morph-icon";
import { useScene } from "./use-scene";
import "./streak.css";

/** Each shape is an outline and its inner core, cut out with even-odd, so they morph part for part. */
const EMBER =
  "M12 9c.4 2 1.6 3 2.6 4.2.9 1.1 1.6 2.2 1.6 3.7 0 2.4-1.9 4.1-4.2 4.1s-4.2-1.7-4.2-4.1c0-1.6.7-2.8 1.7-3.7.1 1 .6 1.7 1.3 2-.4-2.2.4-4.4 1.2-6.2zM12 17.4c.4.5 1 .9 1 1.6 0 .6-.5 1-1 1s-1-.4-1-1c0-.5.3-.8.6-1 0 .2.1.4.3.5-.1-.4 0-.8.1-1.1z";
const FLAME =
  "M12 2.5c.6 3.2 2.6 5 4.3 7 1.5 1.8 2.7 3.6 2.7 6.2 0 3.9-3.1 6.8-7 6.8s-7-2.9-7-6.8c0-2.6 1.2-4.6 2.8-6.2.2 1.6 1 2.8 2.2 3.3-.6-3.6.6-7.4 2-10.3zM12 12.5c1.2 1.5 3 2.8 3 5 0 1.9-1.4 3.2-3 3.2s-3-1.3-3-3.2c0-1.4.8-2.4 1.7-3.1.1.8.5 1.3 1 1.5-.2-1.2 0-2.4.3-3.4z";

const DAYS = ["M", "T", "W", "T", "F", "S", "S"];
/** Today is Thursday; the days before it are already done. */
const TODAY = 3;
const START = 41;

const GROW = { type: "spring" as const, duration: 0.7, bounce: 0.35 };
const ROLL = { type: "spring" as const, duration: 0.45, bounce: 0.2 };

/** Sparks around the flame: angle in degrees, distance, size, colour. */
const SPARKS = Array.from({ length: 14 }, (_, i) => ({
  angle: (360 / 14) * i + (i % 2 ? 9 : -6),
  distance: 62 + (i % 3) * 16,
  size: 4 + (i % 3) * 2,
  color: ["#fb923c", "#facc15", "#f472b6", "#f97316"][i % 4]!,
}));

interface State {
  lit: boolean;
  days: number;
  /** Bumped each time it lights, to fire a fresh burst. */
  burst: number;
}

const BEATS: readonly (State & { ms: number })[] = [
  { lit: false, days: START, burst: 0, ms: 1600 },
  { lit: true, days: START + 1, burst: 1, ms: 3400 },
];

const fromBeat = (step: number): State => {
  const { ms: _, ...state } = BEATS[step]!;
  return state;
};

/** The count as digits that keep their identity, so only the ones that change roll. */
function Count({ value }: { value: number }) {
  const digits = String(value).split("");
  return (
    <span className="st-count" aria-label={String(value)}>
      <AnimatePresence initial={false} mode="popLayout">
        {digits.map((d, i) => (
          <motion.span
            key={`${digits.length - i}-${d}`}
            initial={{ y: "70%", opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: "-70%", opacity: 0 }}
            transition={ROLL}
            aria-hidden="true"
          >
            {d}
          </motion.span>
        ))}
      </AnimatePresence>
    </span>
  );
}

interface StreakDemoProps {
  /** Plays and pauses the scene from outside, as the home page's card does. Leave it out to play until touched. */
  playing?: boolean;
}

export function StreakDemo({ playing }: StreakDemoProps = {}) {
  const scene = useScene(BEATS, fromBeat, playing);
  const { state, take } = scene;

  // Finishing a lesson lights the flame; Continue moves on to the next day, ember again.
  const act = () =>
    take((s) => (s.lit ? { ...s, lit: false } : { lit: true, days: s.days + 1, burst: s.burst + 1 }));

  return (
    <section ref={scene.ref} className="st not-prose" aria-label="Daily streak" data-lit={state.lit || undefined}>
      <div className="st-hero">
        <span className="st-glow" aria-hidden="true" />
        <AnimatePresence>
          {state.lit && (
            <span key={state.burst} className="st-sparks" aria-hidden="true">
              {SPARKS.map((s, i) => {
                const a = (s.angle * Math.PI) / 180;
                return (
                  <motion.i
                    key={i}
                    style={{ width: s.size, height: s.size, background: s.color }}
                    initial={{ x: 0, y: 0, scale: 0, opacity: 1 }}
                    animate={{
                      x: Math.cos(a) * s.distance,
                      y: Math.sin(a) * s.distance - 8,
                      scale: [0, 1.2, 0],
                      opacity: [1, 1, 0],
                    }}
                    transition={{ duration: 0.9, ease: [0.15, 0.8, 0.3, 1], delay: 0.12 + (i % 3) * 0.03 }}
                  />
                );
              })}
            </span>
          )}
        </AnimatePresence>
        <motion.span
          className="st-flame"
          animate={{ scale: state.lit ? [1, 1.12, 1] : 1, rotate: state.lit ? [0, -4, 3, 0] : 0 }}
          transition={{ duration: 0.7, ease: "easeOut" }}
        >
          <MorphIcon d={state.lit ? FLAME : EMBER} fill="currentColor" stroke="none" fillRule="evenodd" transition={GROW} />
        </motion.span>
      </div>

      <p className="st-title">
        <Count value={state.days} />
        <span>day streak</span>
      </p>
      <div className="st-sub">
        <AnimatePresence initial={false} mode="popLayout">
          <motion.span
            key={state.lit ? "lit" : "waiting"}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.2 }}
          >
            {state.lit ? "You're on fire. Come back tomorrow to keep it going." : "Finish today's lesson to keep your streak."}
          </motion.span>
        </AnimatePresence>
      </div>

      <ol className="st-week" aria-label="This week">
        {DAYS.map((d, i) => {
          const done = i < TODAY || (i === TODAY && state.lit);
          return (
            <li key={i} data-today={i === TODAY || undefined} aria-label={`${d}${done ? ", done" : ""}`}>
              <span className="st-day">{d}</span>
              <span className="st-dot">
                <motion.span
                  className="st-dot-fill"
                  initial={false}
                  animate={{ scale: done ? 1 : 0, opacity: done ? 1 : 0 }}
                  transition={{ ...GROW, delay: i === TODAY && done ? 0.35 : 0 }}
                >
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <motion.path
                      d="M6.5 12.5l3.5 3.5 7.5-8"
                      initial={false}
                      animate={{ pathLength: done ? 1 : 0 }}
                      transition={{ duration: 0.35, delay: i === TODAY && done ? 0.5 : 0 }}
                    />
                  </svg>
                </motion.span>
              </span>
            </li>
          );
        })}
      </ol>

      <motion.button type="button" className="st-action" onClick={act} whileTap={{ scale: 0.97 }}>
        {state.lit ? "Continue" : "Finish today's lesson"}
      </motion.button>
    </section>
  );
}
