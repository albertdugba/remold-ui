"use client";
/**
 * A food order, from kitchen to doorstep, told on a little town. The bag sits on the kitchen's roof
 * while it's cooked; the rider picks it up and rides the streets corner by corner; at the door the
 * bag hops down onto the step. The card above reads like the app's live status, with the minutes
 * counting down.
 *
 * Built with `Remold.Scene`: the rider moves between corners on springs, and the bag rides along
 * and hops on arcs. It plays while on screen; Order again runs it again. The places and food are
 * made up.
 */
import { extrude } from "@remold-ui/canvas";
import { Remold } from "@remold-ui/react";
import { AnimatePresence, motion } from "motion/react";
import { useEffect } from "react";
import { CLAY, MINT, ORANGE, PAPER, SKY, SUN, STREET } from "./day-stage";
import { useScene } from "./use-scene";

type SceneProps = Remold.Scene.Props;
type Beat = "ordered" | "picked" | "street" | "corner" | "door" | "delivered";

const SCENERY = [
  { id: "h1", x: -60, y: -180, width: 80, depth: 70, height: 40 },
  { id: "h2", x: 40, y: -190, width: 70, depth: 80, height: 70 },
  { id: "h3", x: -80, y: 60, width: 90, depth: 80, height: 30 },
  { id: "h4", x: -250, y: 80, width: 80, depth: 90, height: 46 },
] as const;

/** The streets the rider takes: down from the kitchen, across town, up to the house. */
const STREETS = [
  { id: "s1", x: -204, y: -104, width: 48, depth: 148 },
  { id: "s2", x: -204, y: -4, width: 403, depth: 48 },
  { id: "s3", x: 151, y: -4, width: 48, depth: 108 },
] as const;

const KITCHEN = { x: -230, y: -190, z: 0, width: 100, depth: 90, height: 60 };
const HOME = { x: 130, y: 110, z: 0, width: 90, depth: 90, height: 50 };
const RIDER = 34;
const BAG = 24;

/** Where the rider stands at each beat: the kitchen door, two street corners, the front door. */
const STOPS: Record<Beat, { x: number; y: number }> = {
  ordered: { x: -180, y: -80 },
  picked: { x: -180, y: -80 },
  street: { x: -180, y: 20 },
  corner: { x: 175, y: 20 },
  door: { x: 175, y: 80 },
  delivered: { x: 175, y: 80 },
};

const OBJECTS: SceneProps["objects"] = {
  ...Object.fromEntries(SCENERY.map((h) => [h.id, { look: extrude({ radius: 0.1, shadow: true, passive: true, decal: { text: "" } }), palette: SKY, interactive: false }])),
  ...Object.fromEntries(STREETS.map((st) => [st.id, { look: extrude({ radius: 0.04, sides: "flat", passive: true, decal: { text: "" } }), palette: STREET, interactive: false }])),
  kitchen: { look: extrude({ radius: 0.1, shadow: true, decal: { text: "Mama’s", size: 14 } }), label: "Mama’s Kitchen", palette: ORANGE },
  home: { look: extrude({ radius: 0.1, shadow: true, decal: { text: "Home", size: 14 } }), label: "Your home", palette: CLAY },
  rider: { look: extrude({ shape: "ellipse", shadow: true, decal: { text: "" } }), label: "Kojo, your rider", palette: MINT },
  bag: { look: extrude({ radius: 0.2, shadow: true, decal: { text: "" } }), label: "Your order", palette: SUN },
};

function layoutFor(beat: Beat): SceneProps["layouts"][string] {
  const stop = STOPS[beat];
  const rider = { x: stop.x - RIDER / 2, y: stop.y - RIDER / 2, z: 3, width: RIDER, depth: RIDER, height: 16 };
  const onRider = { x: stop.x - BAG / 2, y: stop.y - BAG / 2, z: 19, width: BAG, depth: BAG, height: 18 };
  const bag =
    beat === "ordered"
      ? { x: KITCHEN.x + 38, y: KITCHEN.y + 33, z: KITCHEN.z + KITCHEN.height, width: BAG, depth: BAG, height: 18 }
      : beat === "delivered"
        ? { x: HOME.x + 33, y: HOME.y - 30, z: 0, width: BAG, depth: BAG, height: 18, arc: 30 }
        : { ...onRider, arc: beat === "picked" ? 50 : 0 };
  return {
    camera: { zoom: 1.38, centerX: 5, centerY: -5 },
    caption: {
      ordered: "Mama's Kitchen is cooking your order.",
      picked: "Kojo picked up your order.",
      street: "On the way.",
      corner: "Turning onto your street.",
      door: "Kojo is at your door.",
      delivered: "Delivered to your doorstep.",
    }[beat],
    objects: {
      ...Object.fromEntries(SCENERY.map((h) => [h.id, { ...h, z: 0 }])),
      ...Object.fromEntries(STREETS.map((st) => [st.id, { ...st, z: 0, height: 3 }])),
      kitchen: KITCHEN,
      home: HOME,
      rider: { ...rider, delay: beat === "picked" ? 0 : 0.05 },
      bag: { ...bag, delay: beat === "picked" ? 0 : 0.05 },
    },
  };
}

const ORDER: readonly Beat[] = ["ordered", "picked", "street", "corner", "door", "delivered"];
const LAYOUTS: SceneProps["layouts"] = Object.fromEntries(ORDER.map((b) => [b, layoutFor(b)]));

interface State {
  beat: Beat;
}

const BEATS: readonly (State & { ms: number })[] = [
  { beat: "ordered", ms: 1500 },
  { beat: "picked", ms: 1100 },
  { beat: "street", ms: 1100 },
  { beat: "corner", ms: 1300 },
  { beat: "door", ms: 1100 },
  { beat: "delivered", ms: 3000 },
];

const fromBeat = (step: number): State => ({ beat: BEATS[step]!.beat });

const STATUS: Record<Beat, { mark: string; tint: string; title: string; detail: string }> = {
  ordered: { mark: "🍲", tint: "#ffe6cc", title: "Cooking your jollof", detail: "Mama’s Kitchen · 18 min" },
  picked: { mark: "🛵", tint: "#d7f5ea", title: "Kojo picked it up", detail: "Arriving in 12 min" },
  street: { mark: "🛵", tint: "#d7f5ea", title: "On the way", detail: "Arriving in 8 min" },
  corner: { mark: "🛵", tint: "#d7f5ea", title: "Turning onto your street", detail: "Arriving in 2 min" },
  door: { mark: "🚪", tint: "#ffe2d6", title: "Kojo is at your door", detail: "Head down now" },
  delivered: { mark: "✅", tint: "#dff5e6", title: "Delivered · enjoy!", detail: "Rate Kojo’s delivery" },
};

interface FoodDeliveryProps {
  /** Plays and pauses the scene from outside, as the home page's card does. Leave it out to play until touched. */
  playing?: boolean;
}

export function FoodDelivery({ playing }: FoodDeliveryProps = {}) {
  const scene = useScene(BEATS, fromBeat, playing);
  const { state, take } = scene;
  const status = STATUS[state.beat];

  // Your own order runs to the door on its own clock.
  useEffect(() => {
    if (scene.live) return;
    const i = ORDER.indexOf(state.beat);
    if (i === ORDER.length - 1) return;
    const t = setTimeout(() => take({ beat: ORDER[i + 1]! }), BEATS[i]!.ms);
    return () => clearTimeout(t);
  }, [scene.live, state.beat, take]);

  return (
    <section ref={scene.ref} className="day-stage not-prose" aria-label="Food delivery">
      <Remold.Scene
        className="day-scene"
        label="A food order travelling from a kitchen to a home"
        objects={OBJECTS}
        layouts={LAYOUTS}
        layout={state.beat}
        palette={PAPER}
        interact={{ drag: false }}
        spring={{ duration: 0.9, bounce: 0.15 }}
      />

      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={status.title}
          className="day-chip"
          role="status"
          initial={{ opacity: 0, y: -10, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -6, scale: 0.98 }}
          transition={{ type: "spring", duration: 0.45, bounce: 0.2 }}
        >
          <span className="day-chip-mark" style={{ background: status.tint }} aria-hidden="true">
            {status.mark}
          </span>
          <span className="day-chip-copy">
            <span>{status.detail}</span>
            <b>{status.title}</b>
          </span>
        </motion.div>
      </AnimatePresence>

      <div className="day-foot">
        <span className="day-readout">
          <b>1×</b> jollof with chicken · <b>GH₵ 85</b>
        </span>
        <button type="button" className="day-cta" onClick={() => take({ beat: "ordered" })} disabled={!scene.live && state.beat !== "delivered"}>
          Order again
        </button>
      </div>
    </section>
  );
}
