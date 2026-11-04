"use client";
/**
 * Backups and restore, drawn on the night stage: a glass database sits full and violet, with a row
 * of daily snapshots behind it as wireframes. Something goes wrong and the level drops and turns
 * red. Pick Wednesday's snapshot and it lifts, turns solid, arcs over and pours itself back in: the
 * level climbs, green, and the readout says nothing was lost.
 *
 * Built with `Remold.Scene`: the database's fill level and colour spring between layouts, and the
 * snapshot lifts, arcs and fades as it lands. Pick any snapshot to restore from it. The days and
 * numbers are made up.
 */
import { extrude } from "@remold-ui/canvas";
import { Remold } from "@remold-ui/react";
import { useEffect } from "react";
import { NIGHT, PLATFORM_INK, VIOLET, WIRE_INK } from "./night-stage";
import { useScene } from "./use-scene";
import "./backup-restore.css";

type SceneProps = Remold.Scene.Props;
type Phase = "healthy" | "incident" | "picked" | "restored";

const RED = "#ef4444";
const GREEN = "#22c55e";

const DAYS = [
  { id: "mon", label: "Mon" },
  { id: "tue", label: "Tue" },
  { id: "wed", label: "Wed" },
  { id: "thu", label: "Thu" },
  { id: "fri", label: "Fri" },
] as const;
type Day = (typeof DAYS)[number]["id"];

const OBJECTS: SceneProps["objects"] = {
  base: {
    look: extrude({ radius: 0.08, edge: true, ink: PLATFORM_INK, shadow: false, passive: true, decal: { text: "" } }),
    interactive: false,
  },
  db: {
    look: extrude({ shape: "ellipse", glass: true, sides: "sheen", edge: true, decal: { text: "" } }),
    label: "Production database",
  },
  ...Object.fromEntries(
    DAYS.map((d) => [
      d.id,
      { look: extrude({ radius: 0.16, ink: WIRE_INK, shadow: false, fillColor: VIOLET, decal: { size: 12 } }), label: d.label },
    ]),
  ),
};

const BASE = { x: -230, y: -200, z: 0, width: 400, depth: 360, height: 14 };
const DB = { x: -40, y: -10, z: 14, width: 130, depth: 130, height: 90 };
/** Snapshots in a row along the back of the platform, oldest first. */
const slot = (index: number) => ({ x: -210 + index * 74, y: -180, z: 14, width: 60, depth: 60, height: 8 });

function layoutFor(phase: Phase, pick: Day): SceneProps["layouts"][string] {
  const level = phase === "healthy" ? 0.78 : phase === "restored" ? 0.74 : 0.22;
  const color = phase === "healthy" ? VIOLET : phase === "restored" ? GREEN : RED;
  return {
    camera: { zoom: 1.35, centerX: -60, centerY: -40 },
    caption: {
      healthy: "The database is healthy; a snapshot is taken every day.",
      incident: "Something went wrong: data is missing.",
      picked: `${DAYS.find((d) => d.id === pick)!.label}'s snapshot, picked.`,
      restored: `Restored from ${DAYS.find((d) => d.id === pick)!.label}'s snapshot.`,
    }[phase],
    objects: {
      base: BASE,
      db: { ...DB, fill: level, color, delay: phase === "restored" ? 0.45 : 0 },
      ...Object.fromEntries(
        DAYS.map((d, index) => {
          const home = slot(index);
          if (d.id !== pick || phase === "healthy" || phase === "incident") return [d.id, { ...home, ghost: 0.75 }];
          if (phase === "picked") return [d.id, { ...home, z: 70, ghost: 0, fill: 1, color: VIOLET }];
          // Restored: it arcs over and drops into the database, gone once it lands.
          return [d.id, { x: DB.x + 35, y: DB.y + 35, z: DB.z + DB.height + 10, width: 60, depth: 60, height: 8, ghost: 0, fill: 1, color: GREEN, arc: 80, opacity: 0, fadeDelay: 0.5 }];
        }),
      ),
    },
  };
}

const PHASES: readonly Phase[] = ["healthy", "incident", "picked", "restored"];
const LAYOUTS: SceneProps["layouts"] = Object.fromEntries(
  DAYS.flatMap((d) => PHASES.map((p) => [`${p}:${d.id}`, layoutFor(p, d.id)])),
);

interface State {
  phase: Phase;
  pick: Day;
}

const BEATS: readonly (State & { ms: number })[] = [
  { phase: "healthy", pick: "wed", ms: 1500 },
  { phase: "incident", pick: "wed", ms: 1500 },
  { phase: "picked", pick: "wed", ms: 1300 },
  { phase: "restored", pick: "wed", ms: 3000 },
];

const fromBeat = (step: number): State => ({ phase: BEATS[step]!.phase, pick: BEATS[step]!.pick });

interface BackupRestoreProps {
  /** Plays and pauses the scene from outside, as the home page's card does. Leave it out to play until touched. */
  playing?: boolean;
}

export function BackupRestore({ playing }: BackupRestoreProps = {}) {
  const scene = useScene(BEATS, fromBeat, playing);
  const { state, take } = scene;
  const day = DAYS.find((d) => d.id === state.pick)!;

  // A snapshot you pick restores itself a moment later.
  useEffect(() => {
    if (scene.live || state.phase !== "picked") return;
    const t = setTimeout(() => take((current) => ({ ...current, phase: "restored" })), 900);
    return () => clearTimeout(t);
  }, [scene.live, state.phase, take]);

  // Picking a snapshot in the scene restores from it; the platform does nothing.
  const pick = (id: string | null) => {
    const d = DAYS.find((x) => x.id === id);
    if (d) take({ phase: "picked", pick: d.id });
  };

  return (
    <section ref={scene.ref} className="night-stage not-prose" aria-label="Backup and restore">
      <Remold.Scene
        className="night-scene"
        label="A database restored from a daily snapshot"
        objects={OBJECTS}
        layouts={LAYOUTS}
        layout={`${state.phase}:${state.pick}`}
        palette={NIGHT}
        interact={{ drag: false }}
        focused={null}
        onFocusedChange={pick}
        spring={{ duration: 0.9, bounce: 0.18 }}
      />

      <div className="night-chip" role="status">
        <span className="br-dot" data-phase={state.phase} aria-hidden="true" />
        <span>
          {state.phase === "healthy"
            ? "All systems normal"
            : state.phase === "incident"
              ? "1,204 rows missing from orders"
              : state.phase === "picked"
                ? `Restoring from ${day.label} 09:00…`
                : `Restored from ${day.label} 09:00 · 0 rows lost`}
        </span>
      </div>

      <div className="night-foot">
        <span className="night-readout">
          <b>5</b> daily snapshots · tap one to restore
        </span>
        <button type="button" className="night-cta" onClick={() => take({ phase: "incident", pick: state.pick })} disabled={!scene.live && state.phase !== "restored"}>
          Break it again
        </button>
      </div>
    </section>
  );
}
