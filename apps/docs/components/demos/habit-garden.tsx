"use client";
/**
 * A habit you keep, grown into a plant. A clay pot sits on a warm table with a row of seven day
 * tiles in front. Each day you keep the habit, that day's tile lights green and the plant grows:
 * the stem climbs, leaves unfold one by one on alternating sides, and on the seventh day a pink
 * flower opens at the top. The card above keeps the streak.
 *
 * Built with `Remold.Scene`: the stem's height, the leaves arriving on small arcs and the flower
 * landing are all layout changes, a beat apart. It plays while on screen; Water today adds a day by
 * hand. The habit is made up.
 */
import { extrude } from "@remold-ui/canvas";
import { Remold } from "@remold-ui/react";
import { BLOOM, CLAY, LEAF, PAPER } from "./day-stage";
import { useScene } from "./use-scene";

type SceneProps = Remold.Scene.Props;

/** A leaf lying flat, its tip pointing up the page; and a five-petal flower. */
const LEAF_SHAPE = "M50 0C82 18 96 52 50 100C4 52 18 18 50 0Z";
const FLOWER =
  "M50 6C60 6 64 20 60 32C72 24 88 28 90 40C92 52 80 58 68 58C78 66 80 82 70 88C60 94 52 84 50 72C48 84 40 94 30 88C20 82 22 66 32 58C20 58 8 52 10 40C12 28 28 24 40 32C36 20 40 6 50 6Z";

const DAYS = ["M", "T", "W", "T", "F", "S", "S"] as const;

/** Leaves in the order they unfold, on alternating sides of the stem, higher each time. */
const LEAVES = [
  { id: "l1", side: -1, z: 70 },
  { id: "l2", side: 1, z: 92 },
  { id: "l3", side: -1, z: 116 },
  { id: "l4", side: 1, z: 140 },
  { id: "l5", side: -1, z: 162 },
] as const;

const OBJECTS: SceneProps["objects"] = {
  table: { look: extrude({ radius: 0.1, shadow: true, passive: true, decal: { text: "" } }), palette: PAPER, interactive: false },
  pot: { look: extrude({ shape: "ellipse", sides: "gradient", shadow: true, decal: { text: "" } }), label: "Pot", palette: CLAY },
  stem: { look: extrude({ radius: 0.5, decal: { text: "" } }), label: "Stem", palette: LEAF, interactive: false },
  ...Object.fromEntries(LEAVES.map((l) => [l.id, { look: extrude({ shape: { path: LEAF_SHAPE }, decal: { text: "" } }), palette: LEAF, interactive: false }])),
  flower: { look: extrude({ shape: { path: FLOWER }, edge: true, decal: { text: "" } }), label: "Flower", palette: BLOOM },
  ...Object.fromEntries(
    DAYS.map((d, i) => [`d${i}`, { look: extrude({ radius: 0.28, shadow: true, fillColor: "#4fa865", decal: { text: d, size: 13 } }), label: `Day ${i + 1}`, palette: PAPER }]),
  ),
};

const POT = { x: -60, y: -90, z: 16, width: 90, depth: 90, height: 56 };
const STEM_X = POT.x + POT.width / 2 - 5;
const STEM_Y = POT.y + POT.depth / 2 - 5;

/** How tall the stem is after `days` days kept. */
const stemHeight = (days: number) => 8 + days * 22;

function layoutFor(days: number): SceneProps["layouts"][string] {
  const leaves = Math.max(0, Math.min(LEAVES.length, days - 1));
  const bloom = days >= 7;
  return {
    camera: { zoom: 1.6, centerX: -40, centerY: -10 },
    caption: bloom ? "Seven days kept: the plant has flowered." : `${days} of 7 days kept.`,
    objects: {
      table: { x: -220, y: -170, z: 0, width: 360, depth: 360, height: 16 },
      pot: POT,
      stem: { x: STEM_X, y: STEM_Y, z: POT.z + POT.height, width: 10, depth: 10, height: stemHeight(Math.min(days, 6)) },
      ...Object.fromEntries(
        LEAVES.map((l, i) => {
          const out = i < leaves;
          const x = STEM_X + (l.side < 0 ? -44 : 10);
          return [
            l.id,
            out
              ? { x, y: STEM_Y - 16, z: l.z, width: 40, depth: 40, height: 3, arc: 12 }
              : { x: STEM_X - 2, y: STEM_Y - 2, z: l.z - 20, width: 14, depth: 14, height: 3, opacity: 0 },
          ];
        }),
      ),
      flower: bloom
        ? { x: STEM_X - 30, y: STEM_Y - 30, z: POT.z + POT.height + stemHeight(6), width: 70, depth: 70, height: 8, arc: 20 }
        : { x: STEM_X - 4, y: STEM_Y - 4, z: POT.z + POT.height + stemHeight(Math.min(days, 6)) - 10, width: 18, depth: 18, height: 4, opacity: 0 },
      ...Object.fromEntries(
        DAYS.map((_, i) => {
          const kept = i < days;
          return [`d${i}`, { x: -200 + i * 46, y: 120, z: kept ? 26 : 16, width: 36, depth: 36, height: kept ? 10 : 5, fill: kept ? 1 : 0, color: "#4fa865" }];
        }),
      ),
    },
  };
}

const LAYOUTS: SceneProps["layouts"] = Object.fromEntries(Array.from({ length: 8 }, (_, d) => [`day-${d}`, layoutFor(d)]));

interface State {
  days: number;
}

const BEATS: readonly (State & { ms: number })[] = [
  ...Array.from({ length: 7 }, (_, d) => ({ days: d, ms: d === 0 ? 1200 : 800 })),
  { days: 7, ms: 3000 },
];

const fromBeat = (step: number): State => ({ days: BEATS[step]!.days });

interface HabitGardenProps {
  /** Plays and pauses the scene from outside, as the home page's card does. Leave it out to play until touched. */
  playing?: boolean;
}

export function HabitGarden({ playing }: HabitGardenProps = {}) {
  const scene = useScene(BEATS, fromBeat, playing);
  const { state, take } = scene;
  const bloom = state.days >= 7;

  return (
    <section ref={scene.ref} className="day-stage not-prose" aria-label="Habit garden">
      <Remold.Scene
        className="day-scene"
        label="A plant growing a little for each day a habit is kept"
        objects={OBJECTS}
        layouts={LAYOUTS}
        layout={`day-${state.days}`}
        palette={PAPER}
        interact={{ drag: false }}
        spring={{ duration: 0.8, bounce: 0.3 }}
      />

      <div className="day-chip" role="status">
        <span className="day-chip-mark" style={{ background: bloom ? "#ffe0ea" : "#dff5e6" }} aria-hidden="true">
          {bloom ? "🌸" : "🌱"}
        </span>
        <span className="day-chip-copy">
          <span>Read 20 pages</span>
          <b>{bloom ? "7-day streak · it bloomed" : state.days === 0 ? "Start your streak today" : `${state.days}-day streak`}</b>
        </span>
      </div>

      <div className="day-foot">
        <span className="day-readout">
          <b>{state.days}</b> of 7 days this week
        </span>
        <button type="button" className="day-cta" onClick={() => take((s) => ({ days: s.days >= 7 ? 0 : s.days + 1 }))}>
          {bloom ? "New week" : "Water today"}
        </button>
      </div>
    </section>
  );
}
