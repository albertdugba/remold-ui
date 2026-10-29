"use client";
/**
 * A savings goal that turns into the thing you saved for. A glass jar stands on a warm table with
 * four week tiles in front of it. Each week a deposit lands: its tile pops up gold and the jar fills
 * a little more. When the goal is reached the jar lifts, reshapes into a suitcase and turns orange,
 * and the card above says the trip is booked.
 *
 * Built with `Remold.Scene`: the jar's fill level springs between layouts, the week tiles lift a
 * beat apart, and the jar's outline morphs into the suitcase. It plays while on screen; Start again
 * runs it again. The goal and amounts are made up.
 */
import { extrude } from "@remold-ui/canvas";
import { Remold } from "@remold-ui/react";
import { AnimatePresence, motion } from "motion/react";
import { useEffect } from "react";
import { ORANGE, PAPER, SKY } from "./day-stage";
import { useScene } from "./use-scene";

type SceneProps = Remold.Scene.Props;

/** Both outlines in the same 100 × 100 box. */
const JAR = "M50 4C76 4 96 24 96 50C96 76 76 96 50 96C24 96 4 76 4 50C4 24 24 4 50 4Z";
const CASE = "M16 18H84Q96 18 96 30V84Q96 96 84 96H16Q4 96 4 84V30Q4 18 16 18Z";

const WEEKS = [
  { id: "w1", amount: 1500 },
  { id: "w2", amount: 1500 },
  { id: "w3", amount: 1500 },
  { id: "w4", amount: 1500 },
] as const;
const GOAL = 6000;

const OBJECTS: SceneProps["objects"] = {
  table: { look: extrude({ radius: 0.1, shadow: true, passive: true, decal: { text: "" } }), palette: PAPER, interactive: false },
  jar: {
    look: extrude({ shape: { path: JAR }, glass: true, sides: "sheen", fillColor: "#ffd166", decal: { text: "" } }),
    label: "Lisbon trip fund",
    palette: SKY,
  },
  ...Object.fromEntries(
    WEEKS.map((w, i) => [
      w.id,
      { look: extrude({ radius: 0.22, shadow: true, fillColor: "#ffd166", decal: { text: `W${i + 1}`, size: 13 } }), label: `Week ${i + 1}`, palette: PAPER },
    ]),
  ),
  tag: {
    look: extrude({ radius: 0.3, shadow: true, decal: { text: "LIS", size: 15 } }),
    label: "Lisbon",
    palette: ORANGE,
  },
};

const TABLE = { x: -200, y: -170, z: 0, width: 360, depth: 340, height: 16 };
const JAR_BOX = { x: -80, y: -110, width: 130, depth: 130 };

/** `saved` weeks have landed; `trip` means the goal turned into the suitcase. */
function layoutFor(saved: number, trip: boolean): SceneProps["layouts"][string] {
  return {
    camera: { zoom: 1.4, centerX: -40, centerY: -20 },
    caption: trip ? "Goal reached: the trip to Lisbon is booked." : `${saved} of 4 weekly deposits saved.`,
    objects: {
      table: TABLE,
      jar: trip
        ? { x: JAR_BOX.x - 20, y: JAR_BOX.y + 10, z: 40, width: 170, depth: 110, height: 70, shape: CASE, fill: 1, color: "#ff9a4d", arc: 30 }
        : { ...JAR_BOX, z: 16, height: 110, shape: JAR, fill: 0.06 + saved * 0.22, color: "#ffd166" },
      ...Object.fromEntries(
        WEEKS.map((w, i) => {
          const on = i < saved;
          return [w.id, { x: -170 + i * 78, y: 80, z: on ? 30 : 16, width: 58, depth: 58, height: on ? 12 : 6, fill: on ? 1 : 0, color: "#ffd166", delay: on ? 0 : 0.03 * i }];
        }),
      ),
      // The destination tag swings in beside the suitcase once it's booked.
      tag: trip ? { x: 90, y: -150, z: 16, width: 60, depth: 60, height: 10, arc: 50, delay: 0.35 } : { x: 90, y: -150, z: 90, width: 60, depth: 60, height: 10, opacity: 0 },
    },
  };
}

const STEPS = [0, 1, 2, 3, 4] as const;
const LAYOUTS: SceneProps["layouts"] = {
  ...Object.fromEntries(STEPS.map((n) => [`saved-${n}`, layoutFor(n, false)])),
  trip: layoutFor(4, true),
};

interface State {
  saved: number;
  trip: boolean;
}

const BEATS: readonly (State & { ms: number })[] = [
  { saved: 0, trip: false, ms: 1200 },
  { saved: 1, trip: false, ms: 1000 },
  { saved: 2, trip: false, ms: 1000 },
  { saved: 3, trip: false, ms: 1000 },
  { saved: 4, trip: false, ms: 1300 },
  { saved: 4, trip: true, ms: 3200 },
];

const fromBeat = (step: number): State => ({ saved: BEATS[step]!.saved, trip: BEATS[step]!.trip });

const money = (n: number) => `GH₵ ${n.toLocaleString("en-US")}`;

interface SavingsGoalProps {
  /** Plays and pauses the scene from outside, as the home page's card does. Leave it out to play until touched. */
  playing?: boolean;
}

export function SavingsGoal({ playing }: SavingsGoalProps = {}) {
  const scene = useScene(BEATS, fromBeat, playing);
  const { state, take } = scene;
  const total = state.saved * 1500;

  // Your own run saves week by week, then books the trip.
  useEffect(() => {
    if (scene.live) return;
    if (state.trip) return;
    const t = setTimeout(
      () => take((s) => (s.saved < 4 ? { ...s, saved: s.saved + 1 } : { ...s, trip: true })),
      state.saved < 4 ? 800 : 1000,
    );
    return () => clearTimeout(t);
  }, [scene.live, state.saved, state.trip, take]);

  return (
    <section ref={scene.ref} className="day-stage not-prose" aria-label="Savings goal">
      <Remold.Scene
        className="day-scene"
        label="A savings jar filling week by week, then becoming a suitcase"
        objects={OBJECTS}
        layouts={LAYOUTS}
        layout={state.trip ? "trip" : `saved-${state.saved}`}
        palette={PAPER}
        interact={{ drag: false }}
        spring={{ duration: 0.85, bounce: 0.22 }}
      />

      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={state.trip ? "trip" : "saving"}
          className="day-chip"
          role="status"
          initial={{ opacity: 0, y: -10, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -6, scale: 0.98 }}
          transition={{ type: "spring", duration: 0.45, bounce: 0.2 }}
        >
          <span className="day-chip-mark" style={{ background: state.trip ? "#ffe2c7" : "#fff1c7" }} aria-hidden="true">
            {state.trip ? "✈️" : "🫙"}
          </span>
          <span className="day-chip-copy">
            <span>{state.trip ? "Goal reached" : "Lisbon in December"}</span>
            <b>{state.trip ? "Flights booked · 12 Dec" : `${money(total)} of ${money(GOAL)}`}</b>
          </span>
        </motion.div>
      </AnimatePresence>

      <div className="day-foot">
        <span className="day-readout">
          <b>{state.saved}</b> of 4 weeks · {money(1500)} a week
        </span>
        <button type="button" className="day-cta" onClick={() => take({ saved: 0, trip: false })} disabled={!scene.live && !state.trip}>
          Start again
        </button>
      </div>
    </section>
  );
}
