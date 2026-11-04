"use client";
/**
 * Import your data, drawn as a build-tool hero: three files wait beside a dark platform, wired to
 * it. Import, and the wires carry the files' rows in; each file hops into the platform and is gone,
 * and the tables it held drop out of the air one by one, wireframes turning solid as they stack.
 *
 * Built with `Remold.Scene`: the hops (arcs, a beat apart), the files fading once they land, and
 * the tables dropping and filling in are all one layout change; the wires carry moving dots. It
 * plays while on screen; Import runs it again. The files and numbers are made up.
 */
import { extrude } from "@remold-ui/canvas";
import { Remold } from "@remold-ui/react";
import { AnimatePresence, motion } from "motion/react";
import { useEffect } from "react";
import { DATASTORE_GLYPH } from "./demo-glyphs";
import { NIGHT, PLATFORM_INK, WIRE_INK } from "./night-stage";
import { useScene } from "./use-scene";

type SceneProps = Remold.Scene.Props;
type Beat = "idle" | "reading" | "imported";

const FILES = [
  { id: "csv", name: ".csv", x: -330, y: -170 },
  { id: "json", name: ".json", x: -360, y: -10 },
  { id: "xlsx", name: ".xlsx", x: -300, y: 140 },
] as const;

const TABLES = [
  { id: "users", rows: "2,140" },
  { id: "orders", rows: "8,912" },
  { id: "events", rows: "1,356" },
] as const;

const OBJECTS: SceneProps["objects"] = {
  base: {
    look: extrude({ radius: 0.1, edge: true, ink: PLATFORM_INK, shadow: false, passive: true, decal: { text: "" } }),
    interactive: false,
  },
  hub: {
    look: extrude({ radius: 0.16, sides: "sheen", edge: true, decal: { icon: DATASTORE_GLYPH, text: "", size: 34, color: "#cfc9ee" } }),
    label: "Your workspace",
  },
  ...Object.fromEntries(
    FILES.map((f) => [
      f.id,
      { look: extrude({ radius: 0.2, sides: "sheen", edge: true, decal: { text: f.name, size: 13 } }), label: `data${f.name}` },
    ]),
  ),
  ...Object.fromEntries(
    TABLES.map((t) => [
      t.id,
      { look: extrude({ radius: 0.08, ink: WIRE_INK, shadow: false, decal: { text: t.id, size: 13, at: [0.3, 0.38] } }), label: `${t.id} table` },
    ]),
  ),
};

const BASE = { x: -150, y: -150, z: 0, width: 300, depth: 300, height: 14 };
const HUB = { x: -70, y: -70, z: 14, width: 140, depth: 140, height: 20 };

function layoutFor(beat: Beat): SceneProps["layouts"][string] {
  const done = beat === "imported";
  return {
    camera: { zoom: 1.2, centerX: -165, centerY: -25 },
    caption: {
      idle: "Three files, ready to import.",
      reading: "Reading the files.",
      imported: "Imported: three tables, 12,408 rows.",
    }[beat],
    objects: {
      base: BASE,
      hub: HUB,
      ...Object.fromEntries(
        FILES.map((f, index) => [
          f.id,
          done
            ? { x: -30, y: -30, z: 34, width: 60, depth: 60, height: 10, arc: 90, delay: 0.12 * index, opacity: 0, fadeDelay: 0.45 }
            : { x: f.x, y: f.y, z: beat === "reading" ? 8 : 0, width: 64, depth: 64, height: 10 },
        ]),
      ),
      ...Object.fromEntries(
        TABLES.map((t, index) => [
          t.id,
          done
            ? { x: -90, y: -90, z: 46 + index * 22, width: 180, depth: 180, height: 6, ghost: 0.25, delay: 0.55 + 0.14 * index }
            : { x: -90, y: -90, z: 170 + index * 46, width: 180, depth: 180, height: 6, ghost: 1, opacity: 0.55 },
        ]),
      ),
    },
  };
}

const LAYOUTS: SceneProps["layouts"] = {
  idle: layoutFor("idle"),
  reading: layoutFor("reading"),
  imported: layoutFor("imported"),
};

const LINKS: SceneProps["links"] = FILES.map((f) => ({ from: f.id, to: "hub", dashed: true, layouts: ["idle"] })).concat(
  FILES.map((f) => ({ from: f.id, to: "hub", flow: true, dashed: false, layouts: ["reading"] })),
);

interface State {
  beat: Beat;
}

const BEATS: readonly (State & { ms: number })[] = [
  { beat: "idle", ms: 1500 },
  { beat: "reading", ms: 1800 },
  { beat: "imported", ms: 3400 },
];

const fromBeat = (step: number): State => ({ beat: BEATS[step]!.beat });

interface DataImportProps {
  /** Plays and pauses the scene from outside, as the home page's card does. Leave it out to play until touched. */
  playing?: boolean;
}

export function DataImport({ playing }: DataImportProps = {}) {
  const scene = useScene(BEATS, fromBeat, playing);
  const { state, take } = scene;

  // Your own import reads, then lands, on its own clock.
  useEffect(() => {
    if (scene.live || state.beat !== "reading") return;
    const t = setTimeout(() => take({ beat: "imported" }), 1600);
    return () => clearTimeout(t);
  }, [scene.live, state.beat, take]);

  const done = state.beat === "imported";

  return (
    <section ref={scene.ref} className="night-stage not-prose" aria-label="Data import">
      <Remold.Scene
        className="night-scene"
        label="Files importing into tables"
        objects={OBJECTS}
        links={LINKS}
        layouts={LAYOUTS}
        layout={state.beat}
        palette={NIGHT}
        interact={{ drag: false }}
        spring={{ duration: 0.85, bounce: 0.18 }}
      />

      <AnimatePresence>
        {done && (
          <motion.div
            key="done"
            className="night-chip gap-0 overflow-hidden p-0"
            role="status"
            initial={{ opacity: 0, y: -12, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ type: "spring", duration: 0.5, bounce: 0.2, delay: 1 }}
          >
            {TABLES.map((t) => (
              <span key={t.id} className="grid gap-px px-3.5 py-2 [&+span]:shadow-[inset_1px_0_0_rgb(255_255_255_/_0.08)]">
                <span className="font-mono text-[11px] text-[#8f8ca3]">{t.id}</span>
                <b className="text-sm tabular-nums">{t.rows}</b>
              </span>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="night-foot">
        <span className="night-readout" aria-live="polite">
          {done ? (
            <>
              <b>12,408</b> rows · 3 tables
            </>
          ) : state.beat === "reading" ? (
            <>
              Reading <b>3</b> files…
            </>
          ) : (
            <>
              <b>3</b> files ready
            </>
          )}
        </span>
        <button
          type="button"
          className="night-cta"
          onClick={() => take({ beat: done ? "idle" : "reading" })}
          disabled={!scene.live && state.beat === "reading"}
        >
          {done ? "Start over" : "Import"}
        </button>
      </div>
    </section>
  );
}
