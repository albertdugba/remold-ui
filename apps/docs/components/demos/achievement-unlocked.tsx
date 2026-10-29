"use client";
/**
 * Achievement unlocked, drawn the way build tools draw their heroes: a dark stage, a platform with
 * a violet edge, and the badges you haven't earned yet as wireframes on it. Earn one and it lifts
 * off its slot, turns solid, reshapes from a tile into a hexagon badge with a gold band, and throws
 * a burst of gold cubes; a toast says what you earned. Then it settles back into its slot, kept.
 *
 * Built with `Remold.Scene`: the badge's lift, its outline morph (tile to hexagon), the wireframe
 * turning solid and the gold filling its sides are all one layout change. The burst is the scene's
 * own cube cloud, grown, flung out and shrunk away. The toast is Motion. It plays while on screen;
 * Unlock replays it.
 */
import { extrude } from "@remold-ui/canvas";
import { Remold } from "@remold-ui/react";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useRef } from "react";
import { useScene } from "./use-scene";
import { NIGHT, PLATFORM_INK, WIRE_INK } from "./night-stage";
import "./achievement-unlocked.css";

type SceneProps = Remold.Scene.Props;
type Beat = "locked" | "unlocked" | "kept";

/** Both outlines in the same 100 × 100 box, so the morph changes the shape, not its size. */
const TILE = "M22 0H78Q100 0 100 22V78Q100 100 78 100H22Q0 100 0 78V22Q0 0 22 0Z";
const HEX = "M50 0L93.3 25V75L50 100L6.7 75V25Z";

/** Badge marks on a 24 grid. */
const FLAME = "M12 3c.8 3 4.8 4.9 4.8 9.6a4.8 4.8 0 0 1-9.6 0c0-1.9.9-3.1 1.9-4 0 1.8.9 2.9 1.9 3-.6-2.9.2-5.9 1-8.6Z";
const STAR = "M12 3.5l2.5 5.3 5.8.7-4.3 4 1.1 5.8L12 16.5l-5.1 2.8 1.1-5.8-4.3-4 5.8-.7Z";
const BOLT = "M13 3 5.5 13.5H12L11 21l7.5-10.5H12Z";

const BADGES = [
  { id: "first", icon: BOLT, x: -150 },
  { id: "streak", icon: FLAME, x: -45 },
  { id: "stars", icon: STAR, x: 60 },
] as const;

const GOLD = "#f5c451";

const OBJECTS: SceneProps["objects"] = {
  base: {
    look: extrude({ radius: 0.1, sides: "gradient", edge: true, ink: PLATFORM_INK, shadow: false, passive: true, decal: { text: "" } }),
    label: "Achievements",
    interactive: false,
  },
  ...Object.fromEntries(
    BADGES.map((b) => [
      b.id,
      {
        look: extrude({
          shape: { path: TILE },
          sides: "gradient",
          ink: WIRE_INK,
          shadow: false,
          fillColor: GOLD,
          decal: { icon: b.icon, text: "", size: 30, color: "#cfc9ee" },
        }),
        label: b.id === "streak" ? "On a roll" : b.id === "first" ? "First deploy" : "Five stars",
      },
    ]),
  ),
};

const BASE = { x: -200, y: -110, z: 0, width: 360, depth: 220, height: 16 };
const SLOT = { y: -45, z: 16, width: 90, depth: 90, height: 12 };

function layoutFor(beat: Beat): SceneProps["layouts"][string] {
  return {
    camera: { zoom: 1.55, centerX: -70, centerY: -50 },
    caption: {
      locked: "Three badges, none earned yet.",
      unlocked: "On a roll, unlocked: seven days in a row.",
      kept: "On a roll, earned and kept.",
    }[beat],
    objects: {
      base: BASE,
      ...Object.fromEntries(
        BADGES.map((b) => {
          const slot = { ...SLOT, x: b.x };
          if (b.id !== "streak") return [b.id, { ...slot, ghost: 0.85 }];
          if (beat === "locked") return [b.id, { ...slot, ghost: 0.85, shape: TILE, fill: 0 }];
          if (beat === "unlocked")
            return [b.id, { x: b.x - 25, y: SLOT.y - 25, z: 100, width: 140, depth: 140, height: 18, ghost: 0, shape: HEX, fill: 1, color: GOLD }];
          return [b.id, { ...slot, ghost: 0, shape: HEX, fill: 1, color: GOLD, delay: 0.05 }];
        }),
      ),
    },
  };
}

const LAYOUTS: SceneProps["layouts"] = {
  locked: layoutFor("locked"),
  unlocked: layoutFor("unlocked"),
  kept: layoutFor("kept"),
};

interface State {
  beat: Beat;
}

const BEATS: readonly (State & { ms: number })[] = [
  { beat: "locked", ms: 1600 },
  { beat: "unlocked", ms: 2600 },
  { beat: "kept", ms: 2400 },
];

const fromBeat = (step: number): State => ({ beat: BEATS[step]!.beat });

/** A ring of cubes round the lifted badge: `r` out from its middle, at its height. */
function ring(r: number, z: number, count = 22) {
  const cx = BADGES[1].x + 45;
  const cy = SLOT.y + 45;
  return Array.from({ length: count }, (_, i) => {
    const a = (i / count) * Math.PI * 2 + (i % 2) * 0.12;
    const reach = r * (i % 3 === 0 ? 1.18 : i % 3 === 1 ? 0.9 : 1);
    return { x: cx + Math.cos(a) * reach, y: cy + Math.sin(a) * reach, z: z + (i % 4) * 14 };
  });
}

const CUBES = { top: "#ffe7a3", sides: ["#9a6a12", "#d9a21f", "#ffd76a"], line: "255, 220, 140", glow: "245, 196, 81", text: "#ffffff" } as const;

interface AchievementUnlockedProps {
  /** Plays and pauses the scene from outside, as the home page's card does. Leave it out to play until touched. */
  playing?: boolean;
}

export function AchievementUnlocked({ playing }: AchievementUnlockedProps = {}) {
  const scene = useScene(BEATS, fromBeat, playing);
  const { state, take } = scene;
  const actions = useRef<Remold.Scene.Actions | null>(null);

  // The burst: cubes grow at the badge, fly out, and shrink away.
  useEffect(() => {
    if (state.beat !== "unlocked") return;
    const timers = [
      setTimeout(() => actions.current?.points(ring(20, 110), { size: 9, palette: CUBES }), 380),
      setTimeout(() => actions.current?.points(ring(150, 150), { size: 7, palette: CUBES }), 520),
      setTimeout(() => actions.current?.points([], { palette: CUBES }), 1250),
    ];
    return () => {
      timers.forEach(clearTimeout);
      actions.current?.points([]);
    };
  }, [state.beat]);

  // Your own unlock plays through on its own clock.
  useEffect(() => {
    if (scene.live) return;
    const next: Partial<Record<Beat, [Beat, number]>> = { locked: ["unlocked", 500], unlocked: ["kept", 2400] };
    const step = next[state.beat];
    if (!step) return;
    const t = setTimeout(() => take({ beat: step[0] }), step[1]);
    return () => clearTimeout(t);
  }, [scene.live, state.beat, take]);

  const earned = state.beat !== "locked";

  return (
    <section ref={scene.ref} className="night-stage not-prose" aria-label="Achievement unlocked">
      <Remold.Scene
        className="night-scene"
        label="A badge being unlocked"
        objects={OBJECTS}
        layouts={LAYOUTS}
        layout={state.beat}
        palette={NIGHT}
        interact={{ drag: false }}
        spring={{ duration: 0.9, bounce: 0.22 }}
        actionsRef={actions}
      />

      <AnimatePresence>
        {state.beat === "unlocked" && (
          <motion.div
            key="toast"
            className="au-toast"
            role="status"
            initial={{ opacity: 0, y: -14, scale: 0.94 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.96 }}
            transition={{ type: "spring", duration: 0.5, bounce: 0.25, delay: 0.25 }}
          >
            <span className="au-toast-mark" aria-hidden="true">
              <svg viewBox="0 0 24 24">
                <path d={FLAME} />
              </svg>
            </span>
            <span className="au-toast-copy">
              <span>Achievement unlocked</span>
              <b>On a roll · 7 days in a row</b>
            </span>
            <span className="au-xp">+50 XP</span>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="night-foot">
        <span className="night-readout">
          <b>{earned ? 1 : 0}</b> of 3 earned
        </span>
        <button type="button" className="night-cta" onClick={() => take({ beat: "locked" })} disabled={!scene.live && state.beat !== "kept"}>
          {earned ? "Unlock again" : "Unlock"}
        </button>
      </div>
    </section>
  );
}
