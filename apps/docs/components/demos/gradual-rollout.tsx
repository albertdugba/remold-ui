"use client";
/**
 * A gradual rollout, drawn as a build-tool hero: your users are a grid of tiles on a dark platform,
 * wireframes until the new feature reaches them. Raise the rollout and that share of tiles lights
 * up violet and lifts a little, a scattered few at a time, not row by row; errors stay flat. Roll
 * back and they all go dark again.
 *
 * Built with `Remold.Scene`: each tile's lift, fill and wire turning solid is one layout change, a
 * beat apart in a shuffled order. The percentage control is a Base UI ToggleGroup. It plays while on
 * screen; pick a percentage to take over. The flag and numbers are made up.
 */
import { Toggle } from "@base-ui/react/toggle";
import { ToggleGroup } from "@base-ui/react/toggle-group";
import { extrude } from "@remold-ui/canvas";
import { Remold } from "@remold-ui/react";
import { NIGHT, PLATFORM_INK, VIOLET, WIRE_INK } from "./night-stage";
import { useScene } from "./use-scene";
import "./gradual-rollout.css";

type SceneProps = Remold.Scene.Props;

const COLS = 6;
const ROWS = 5;
const TILE = 42;
const GAP = 14;
const PERCENTS = [0, 10, 50, 100] as const;
type Percent = (typeof PERCENTS)[number];

const TILES = Array.from({ length: COLS * ROWS }, (_, i) => ({
  id: `u${i}`,
  x: (i % COLS) * (TILE + GAP) - ((COLS * (TILE + GAP) - GAP) / 2),
  y: Math.floor(i / COLS) * (TILE + GAP) - ((ROWS * (TILE + GAP) - GAP) / 2),
}));

/** The order users get the feature: shuffled once, so a rollout looks scattered, not row by row. */
const ORDER = (() => {
  const ids = TILES.map((_, i) => i);
  let seed = 7;
  for (let i = ids.length - 1; i > 0; i--) {
    seed = (seed * 9301 + 49297) % 233280;
    const j = Math.floor((seed / 233280) * (i + 1));
    [ids[i], ids[j]] = [ids[j]!, ids[i]!];
  }
  const rank = new Array<number>(ids.length);
  ids.forEach((tile, r) => (rank[tile] = r));
  return rank;
})();

const OBJECTS: SceneProps["objects"] = {
  base: {
    look: extrude({ radius: 0.08, edge: true, ink: PLATFORM_INK, shadow: false, passive: true, decal: { text: "" } }),
    interactive: false,
  },
  ...Object.fromEntries(
    TILES.map((t) => [
      t.id,
      { look: extrude({ radius: 0.24, ink: WIRE_INK, shadow: false, fillColor: VIOLET, decal: { text: "" } }), interactive: false },
    ]),
  ),
};

function layoutFor(percent: Percent): SceneProps["layouts"][string] {
  const reached = Math.round((TILES.length * percent) / 100);
  return {
    camera: { zoom: 1.45, centerX: -20, centerY: -20 },
    caption: percent === 0 ? "No one has the new checkout yet." : `${percent}% of users have the new checkout.`,
    objects: {
      base: { x: -190, y: -165, z: 0, width: 380, depth: 330, height: 14 },
      ...Object.fromEntries(
        TILES.map((t, i) => {
          const on = ORDER[i]! < reached;
          return [
            t.id,
            {
              x: t.x,
              y: t.y,
              z: on ? 26 : 14,
              width: TILE,
              depth: TILE,
              height: on ? 14 : 8,
              ghost: on ? 0 : 0.8,
              fill: on ? 1 : 0,
              color: VIOLET,
              delay: on ? ORDER[i]! * 0.025 : (TILES.length - ORDER[i]!) * 0.012,
            },
          ];
        }),
      ),
    },
  };
}

const LAYOUTS: SceneProps["layouts"] = Object.fromEntries(PERCENTS.map((p) => [String(p), layoutFor(p)]));

interface State {
  percent: Percent;
}

const BEATS: readonly (State & { ms: number })[] = [
  { percent: 0, ms: 1400 },
  { percent: 10, ms: 1600 },
  { percent: 50, ms: 1900 },
  { percent: 100, ms: 2600 },
];

const fromBeat = (step: number): State => ({ percent: BEATS[step]!.percent });

/** Users reached, out of an install base of 48,200. */
const reachedOf = (p: Percent) => Math.round((48200 * p) / 100).toLocaleString("en-US");

interface GradualRolloutProps {
  /** Plays and pauses the scene from outside, as the home page's card does. Leave it out to play until touched. */
  playing?: boolean;
}

export function GradualRollout({ playing }: GradualRolloutProps = {}) {
  const scene = useScene(BEATS, fromBeat, playing);
  const { state, take } = scene;

  return (
    <section ref={scene.ref} className="night-stage not-prose" aria-label="Gradual rollout">
      <Remold.Scene
        className="night-scene"
        label="Users getting a new feature"
        objects={OBJECTS}
        layouts={LAYOUTS}
        layout={String(state.percent)}
        palette={NIGHT}
        interact={{ drag: false, hover: false }}
        spring={{ duration: 0.7, bounce: 0.25 }}
      />

      <div className="night-chip gr-flag">
        <span className="gr-dot" data-on={state.percent > 0 || undefined} aria-hidden="true" />
        <code>checkout-v2</code>
        <span className="gr-errors">errors 0.02%</span>
      </div>

      <div className="night-foot">
        <span className="night-readout" aria-live="polite">
          <b>{reachedOf(state.percent)}</b> users
        </span>
        <ToggleGroup
          className="gr-steps"
          aria-label="Roll out to"
          value={[String(state.percent)]}
          onValueChange={(v) => v[0] !== undefined && take({ percent: Number(v[0]) as Percent })}
        >
          {PERCENTS.map((p) => (
            <Toggle key={p} value={String(p)} className="gr-step">
              {p}%
            </Toggle>
          ))}
        </ToggleGroup>
      </div>
    </section>
  );
}
