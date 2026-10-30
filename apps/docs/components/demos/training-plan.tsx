"use client";

import { HugeiconsIcon, type IconSvgElement } from "@hugeicons/react";
import {
  FireIcon,
  FlashIcon,
  Medal01Icon,
  MountainIcon,
  Route01Icon,
  RunningShoesIcon,
  SquareLock02Icon,
  Tick02Icon,
  Timer02Icon,
  WalkingIcon,
} from "@hugeicons/core-free-icons";
import { Remold } from "@remold-ui/react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { Odometer } from "./odometer";
import { useScene } from "./use-scene";
import "./training-plan.css";

type Id = "walk" | "easy" | "intervals" | "hills" | "tempo" | "long";
type Branch = "hills" | "tempo";
type Status = "locked" | "open" | "active" | "done" | "skipped";

interface Workout {
  id: Id;
  title: string;
  icon: IconSvgElement;
  minutes: number;
  after: Id | null;
  also?: Id;
  branch?: Branch;
}

const WORKOUTS: Workout[] = [
  { id: "walk", title: "Warm-up walk", icon: WalkingIcon, minutes: 15, after: null },
  { id: "easy", title: "Easy run", icon: RunningShoesIcon, minutes: 20, after: "walk" },
  { id: "intervals", title: "Intervals", icon: Timer02Icon, minutes: 24, after: "easy" },
  { id: "hills", title: "Hills", icon: MountainIcon, minutes: 28, after: "intervals", branch: "hills" },
  { id: "tempo", title: "Tempo", icon: FlashIcon, minutes: 26, after: "intervals", branch: "tempo" },
  { id: "long", title: "Long run", icon: Route01Icon, minutes: 35, after: "hills", also: "tempo" },
];

const ROWS: Id[][] = [["walk"], ["easy"], ["intervals"], ["hills", "tempo"], ["long"]];
const SHIFT: Record<Id, number> = { walk: 34, easy: -40, intervals: 34, hills: 0, tempo: 0, long: 34 };
const MEDAL_SHIFT = -40;
const WORKOUT_SECONDS = 0.9;
const POP = { type: "spring" as const, duration: 0.5, bounce: 0.45 };
const SOFT = { type: "spring" as const, duration: 0.45, bounce: 0.2 };

const SPARKS = Array.from({ length: 12 }, (_, i) => ({
  angle: i * 30 + 15,
  distance: 38 + (i % 3) * 12,
  size: 5 + (i % 2) * 2,
  color: ["#ff5a1f", "#facc15", "#38bdf8", "#fb7185"][i % 4]!,
}));

interface State {
  done: Id[];
  branch: Branch | null;
  active: Id | null;
  claimed: boolean;
}

const START: State = { done: [], branch: null, active: null, claimed: false };

const BEATS: readonly (State & { ms: number })[] = [
  { ...START, ms: 1400 },
  { ...START, active: "walk", ms: 1000 },
  { ...START, done: ["walk"], ms: 1300 },
  { ...START, done: ["walk"], active: "easy", ms: 1000 },
  { ...START, done: ["walk", "easy"], ms: 1300 },
  { ...START, done: ["walk", "easy"], active: "intervals", ms: 1000 },
  { ...START, done: ["walk", "easy", "intervals"], ms: 1600 },
  { ...START, done: ["walk", "easy", "intervals"], branch: "hills", active: "hills", ms: 1000 },
  { ...START, done: ["walk", "easy", "intervals", "hills"], branch: "hills", ms: 1400 },
  { ...START, done: ["walk", "easy", "intervals", "hills"], branch: "hills", active: "long", ms: 1000 },
  { ...START, done: ["walk", "easy", "intervals", "hills", "long"], branch: "hills", ms: 1600 },
  { ...START, done: ["walk", "easy", "intervals", "hills", "long"], branch: "hills", claimed: true, ms: 2800 },
];

function fromBeat(step: number): State {
  const { ms: _, ...state } = BEATS[step]!;
  return state;
}

const workout = (id: Id) => WORKOUTS.find((w) => w.id === id)!;

function statusOf(s: State, id: Id): Status {
  const item = workout(id);
  if (s.done.includes(id)) return "done";
  if (s.active === id) return "active";
  if (item.branch && s.branch && s.branch !== item.branch) return "skipped";
  if (item.after === null) return "open";
  if (item.also) return s.branch && s.done.includes(s.branch) ? "open" : "locked";
  return s.done.includes(item.after) ? "open" : "locked";
}

function lineInto(s: State, from: Id, to: Id) {
  const target = workout(to);
  if (target.branch && s.branch && s.branch !== target.branch) return "skipped";
  if (target.also && s.branch && s.branch !== from) return "skipped";
  return s.done.includes(from) ? "open" : "locked";
}

function Node({ item, status, line, alsoLine, onStart }: { item: Workout; status: Status; line: string; alsoLine?: string; onStart: () => void }) {
  const reduced = useReducedMotion();
  const label = status === "done" ? "done" : status === "open" ? "start workout" : status === "active" ? "in progress" : status === "skipped" ? "not chosen" : "locked";
  const single = item.after && !item.also;

  return (
    <div className="sk-node" data-status={status} style={{ translate: `${SHIFT[item.id]}px 0` }}>
      <button
        type="button"
        className="sk-badge"
        disabled={status !== "open"}
        aria-label={`${item.title}: ${label}`}
        data-rm-anchor={item.id}
        data-rm-link={single ? item.after! : undefined}
        data-rm-line={single ? line : undefined}
        data-rm-pulse={single ? (line === "open" ? "lit" : "wait") : undefined}
        onClick={onStart}
      >
        {item.also && item.after && (
          <>
            <span className="sk-port" data-side="left" data-rm-link={item.after} data-rm-line={line} data-rm-pulse={line === "open" ? "lit" : "wait"} />
            <span className="sk-port" data-side="right" data-rm-link={item.also} data-rm-line={alsoLine} data-rm-pulse={alsoLine === "open" ? "lit" : "wait"} />
          </>
        )}
        {status === "open" && !reduced && (
          <motion.span className="sk-halo" aria-hidden="true" animate={{ scale: [1, 1.4], opacity: [0.45, 0] }} transition={{ duration: 1.6, repeat: Infinity, ease: "easeOut" }} />
        )}
        <svg className="sk-ring" viewBox="0 0 60 60" aria-hidden="true">
          <circle cx="30" cy="30" r="27" className="sk-ring-track" />
          <motion.circle
            cx="30"
            cy="30"
            r="27"
            className="sk-ring-fill"
            initial={false}
            animate={{ pathLength: status === "done" || status === "active" ? 1 : 0, opacity: status === "active" ? 1 : 0 }}
            transition={status === "active" ? { duration: reduced ? 0 : WORKOUT_SECONDS, ease: "easeInOut" } : { duration: 0.3 }}
          />
        </svg>
        <motion.span className="sk-face" initial={false} animate={status === "done" ? { scale: [0.82, 1.08, 1] } : { scale: 1 }} transition={{ duration: 0.45 }}>
          <AnimatePresence mode="popLayout" initial={false}>
            <motion.span
              key={status === "done" ? "done" : status === "locked" || status === "skipped" ? "lock" : "icon"}
              className="sk-glyph"
              initial={{ opacity: 0, scale: 0.5, rotate: -20 }}
              animate={{ opacity: 1, scale: 1, rotate: 0 }}
              exit={{ opacity: 0, scale: 0.5 }}
              transition={POP}
            >
              <HugeiconsIcon icon={status === "done" ? Tick02Icon : status === "locked" || status === "skipped" ? SquareLock02Icon : item.icon} strokeWidth={2} />
            </motion.span>
          </AnimatePresence>
        </motion.span>
      </button>
      <span className="sk-text">
        <AnimatePresence>
          {status === "done" && (
            <motion.span
              key="float"
              className="sk-float"
              aria-hidden="true"
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: [0, 1, 1, 0], y: -12 }}
              transition={{ duration: 1.2, times: [0, 0.15, 0.7, 1] }}
            >
              +{item.minutes} min
            </motion.span>
          )}
        </AnimatePresence>
        <span className="sk-title">{item.title}</span>
        <span className="sk-meta">
          <AnimatePresence mode="wait" initial={false}>
            <motion.span key={status === "open" ? "open" : status === "done" ? "done" : "rest"} initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -5 }} transition={SOFT}>
              {status === "open" ? <span className="sk-cta">Start</span> : status === "active" ? "In progress" : status === "done" ? `Done · ${item.minutes} min` : `${item.minutes} min`}
            </motion.span>
          </AnimatePresence>
        </span>
      </span>
    </div>
  );
}

function Medal({ state, onClaim }: { state: State; onClaim: () => void }) {
  const ready = state.done.includes("long");
  const status = state.claimed ? "claimed" : ready ? "ready" : "locked";
  const reduced = useReducedMotion();

  return (
    <div className="sk-medal" data-status={status} style={{ translate: `${MEDAL_SHIFT}px 0` }}>
      <button
        type="button"
        className="sk-cup"
        disabled={status !== "ready"}
        onClick={onClaim}
        aria-label={state.claimed ? "Finisher medal earned" : ready ? "Claim your medal" : "Finisher medal locked"}
        data-rm-link="long"
        data-rm-line={ready ? "open" : "locked"}
        data-rm-pulse={ready ? "lit" : "wait"}
      >
        {status === "ready" && !reduced && (
          <motion.span className="sk-halo gold" aria-hidden="true" animate={{ scale: [1, 1.4], opacity: [0.5, 0] }} transition={{ duration: 1.4, repeat: Infinity, ease: "easeOut" }} />
        )}
        <motion.span className="sk-cup-face" initial={false} animate={state.claimed ? { scale: [0.8, 1.18, 1], rotate: [0, -8, 6, 0] } : { scale: 1 }} transition={{ duration: 0.6 }}>
          <HugeiconsIcon icon={status === "locked" ? SquareLock02Icon : Medal01Icon} strokeWidth={2} aria-hidden="true" />
        </motion.span>
        <AnimatePresence>
          {state.claimed && (
            <span className="sk-sparks" aria-hidden="true">
              {SPARKS.map((spark, i) => {
                const a = (spark.angle * Math.PI) / 180;
                return (
                  <motion.i
                    key={i}
                    style={{ width: spark.size, height: spark.size, background: spark.color }}
                    initial={{ x: 0, y: 0, scale: 0, opacity: 1 }}
                    animate={{ x: Math.cos(a) * spark.distance, y: Math.sin(a) * spark.distance, scale: [0, 1.2, 0], opacity: [1, 1, 0] }}
                    transition={{ duration: 0.9, ease: [0.15, 0.8, 0.3, 1], delay: 0.1 + (i % 3) * 0.04 }}
                  />
                );
              })}
            </span>
          )}
        </AnimatePresence>
      </button>
      <span className="sk-text">
        <span className="sk-title">5K finisher</span>
        <span className="sk-meta">
          <AnimatePresence mode="wait" initial={false}>
            <motion.span key={status} initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -5 }} transition={SOFT}>
              {state.claimed ? "Medal earned" : ready ? <span className="sk-cta gold">Claim medal</span> : "Finish the plan"}
            </motion.span>
          </AnimatePresence>
        </span>
      </span>
    </div>
  );
}

function useRound(state: State) {
  const [round, setRound] = useState(0);
  const had = useRef(state.done.length);
  useEffect(() => {
    if (had.current > 0 && state.done.length === 0) setRound((r) => r + 1);
    had.current = state.done.length;
  }, [state.done.length]);
  return round;
}

export function TrainingPlanDemo({ playing }: { playing?: boolean } = {}) {
  const scene = useScene(BEATS, fromBeat, playing);
  const { state, take, live } = scene;
  const round = useRound(state);
  const minutes = state.done.reduce((sum, id) => sum + workout(id).minutes, 0);
  const progress = state.done.length / (WORKOUTS.length - 1);
  const streak = 6 + state.done.length;

  useEffect(() => {
    if (!state.active || live) return;
    const id = setTimeout(() => take((s) => (s.active ? { ...s, done: [...s.done, s.active], active: null } : s)), WORKOUT_SECONDS * 1000 + 150);
    return () => clearTimeout(id);
  }, [state.active, live, take]);

  const start = (id: Id) =>
    take((s) => {
      if (s.active || statusOf(s, id) !== "open") return s;
      return { ...s, active: id, branch: workout(id).branch ?? s.branch };
    });

  return (
    <section ref={scene.ref} className="sk not-prose" aria-label="Couch to 5K training plan">
      <header className="sk-head">
        <span className="sk-plan">
          <b>Couch to 5K</b>
          <span>Week 2 of 4</span>
        </span>
        <span className="sk-stats">
          <span className="sk-stat" data-kind="streak" aria-label={`${streak} day streak`}>
            <HugeiconsIcon icon={FireIcon} strokeWidth={2} aria-hidden="true" />
            <Odometer value={String(streak)} />
          </span>
          <span className="sk-stat" aria-label={`${minutes} minutes this week`}>
            <Odometer value={String(minutes)} />
            <span>min</span>
          </span>
        </span>
        <span className="sk-progress" role="progressbar" aria-label="Week progress" aria-valuenow={Math.round(progress * 100)} aria-valuemin={0} aria-valuemax={100}>
          <motion.span initial={false} animate={{ scaleX: progress }} transition={SOFT} />
        </span>
      </header>

      <Remold.Connectors key={round} className="sk-lines" from="bottom" end="top" radius={18} gap={6} pulse={{ duration: 0.8, length: 0.35 }}>
        {ROWS.map((row) => (
          <div key={row.join()} className="sk-row">
            {row.map((id) => {
              const item = workout(id);
              return (
                <Node
                  key={id}
                  item={item}
                  status={statusOf(state, id)}
                  line={item.after ? lineInto(state, item.after, id) : "open"}
                  alsoLine={item.also ? lineInto(state, item.also, id) : undefined}
                  onStart={() => start(id)}
                />
              );
            })}
          </div>
        ))}
        <div className="sk-row">
          <Medal state={state} onClaim={() => take((s) => ({ ...s, claimed: true }))} />
        </div>
      </Remold.Connectors>

      <p className="sk-hint">
        {state.claimed ? "Week complete. Rest day tomorrow." : state.done.includes("intervals") && !state.branch ? "Pick a session: Hills or Tempo." : "Tap a glowing workout to start it."}
      </p>
    </section>
  );
}
