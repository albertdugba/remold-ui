"use client";
/**
 * A landing-page hero for a hosting product: push a commit and watch it ship. The commit sits on
 * the left as a slab of code; a glass build tank fills as the build runs and turns green when it's
 * done; then three edge regions rise into place and the build flows out to each of them.
 *
 * Built with `Remold.Scene`: every object springs between four named layouts (positions, the tank's
 * fill level and colour, the regions arriving on arcs a beat apart), and the links carry moving
 * dots. The copy beside it follows the same four beats. It plays while on screen; Deploy replays
 * it. The product and commit are made up.
 */
import { extrude } from "@remold-ui/canvas";
import { Remold } from "@remold-ui/react";
import { useEffect, useState } from "react";
import { CODE_GLYPH, GLOBE_GLYPH } from "./demo-glyphs";
import { useScene } from "./use-scene";
import "./deploy-hero.css";

type SceneProps = Remold.Scene.Props;
type Beat = "commit" | "build" | "ready" | "live";

const REGIONS = [
  { id: "iad", city: "Washington", x: 110, y: -170 },
  { id: "fra", city: "Frankfurt", x: 160, y: -30 },
  { id: "sin", city: "Singapore", x: 110, y: 110 },
] as const;

const VIOLET = "#7c5cff";
const AMBER = "#f5a524";
const GREEN = "#22c55e";

/** The regions glow green: they're where the build is live. */
const EDGE = {
  top: "#ffffff",
  sides: ["#b9bdc6", "#d9dce2", "#f3f4f6"],
  line: "63, 63, 70",
  glow: "34, 197, 94",
  text: "#18181b",
} as const;

const OBJECTS: SceneProps["objects"] = {
  commit: {
    look: extrude({ radius: 0.16, sides: "sheen", edge: true, decal: { icon: CODE_GLYPH, text: "", size: 34, color: "#ffffff" } }),
    label: "Your commit",
    palette: "violet",
  },
  tank: {
    look: extrude({ shape: "ellipse", glass: true, sides: "sheen", decal: { text: "" } }),
    label: "Build",
  },
  ...Object.fromEntries(
    REGIONS.map((r) => [
      r.id,
      {
        look: extrude({ shape: "ellipse", sides: "gradient", edge: true, decal: { icon: GLOBE_GLYPH, text: "", size: 26 } }),
        label: r.city,
        palette: EDGE,
      },
    ]),
  ),
};

const COMMIT = { x: -260, y: 0, width: 120, depth: 92, height: 14 };
const TANK = { x: -70, y: -70, width: 120, depth: 120, height: 84 };

/** Each beat's layout: the tank fills and changes colour; the regions rise in once it's built. */
function layoutFor(beat: Beat): SceneProps["layouts"][string] {
  const built = beat === "ready" || beat === "live";
  const live = beat === "live";
  return {
    camera: { zoom: 1.45 },
    caption: {
      commit: "A new commit on main.",
      build: "The build is running.",
      ready: "The build is ready.",
      live: "Live in Washington, Frankfurt and Singapore.",
    }[beat],
    objects: {
      commit: { ...COMMIT, z: 0 },
      tank: {
        ...TANK,
        z: 0,
        fill: beat === "commit" ? 0.04 : beat === "build" ? 0.55 : 1,
        color: beat === "build" ? AMBER : built ? GREEN : VIOLET,
      },
      ...Object.fromEntries(
        REGIONS.map((r, index) => [
          r.id,
          live
            ? { x: r.x, y: r.y, z: 0, width: 92, depth: 92, height: 12, arc: 30, delay: 0.12 * index, color: GREEN }
            : { x: r.x, y: r.y, z: 60, width: 92, depth: 92, height: 12, opacity: 0, delay: 0.06 * (2 - index) },
        ]),
      ),
    },
  };
}

const BEAT_NAMES: readonly Beat[] = ["commit", "build", "ready", "live"];
const LAYOUTS: SceneProps["layouts"] = Object.fromEntries(BEAT_NAMES.map((b) => [b, layoutFor(b)]));

const LINKS: SceneProps["links"] = [
  { from: "commit", to: "tank", flow: true, arrow: "end", layouts: ["build"] },
  { from: "commit", to: "tank", arrow: "end", layouts: ["commit", "ready", "live"] },
  ...REGIONS.map((r) => ({ from: "tank", to: r.id, flow: true, layouts: ["live"] })),
];

/** A near-black night for dark mode, lit violet like the commit. */
const NIGHT = {
  top: "#1b1a22",
  sides: ["#131219", "#1d1b26", "#2a2735"],
  line: "200, 190, 255",
  glow: "124, 92, 255",
  text: "#f4f3ff",
} as const;

interface State {
  beat: Beat;
}

const BEATS: readonly (State & { ms: number })[] = [
  { beat: "commit", ms: 1400 },
  { beat: "build", ms: 2200 },
  { beat: "ready", ms: 1000 },
  { beat: "live", ms: 3600 },
];

const fromBeat = (step: number): State => ({ beat: BEATS[step]!.beat });

/** The status line under the headline, one per beat. */
const STATUS: Record<Beat, { dot: string; text: string; meta: string }> = {
  commit: { dot: "idle", text: "main · a1f9c2", meta: "“Fix checkout total”" },
  build: { dot: "busy", text: "Building", meta: "14s" },
  ready: { dot: "good", text: "Ready", meta: "Built in 18s" },
  live: { dot: "good", text: "Live in 3 regions", meta: "iad · fra · sin" },
};

interface DeployHeroProps {
  /** Plays and pauses the scene from outside, as the home page's card does. Leave it out to play until touched. */
  playing?: boolean;
}

export function DeployHero({ playing }: DeployHeroProps = {}) {
  const scene = useScene(BEATS, fromBeat, playing);
  const { state, take } = scene;
  const [dark, setDark] = useState(false);

  useEffect(() => {
    const root = document.documentElement;
    const read = () => setDark(root.classList.contains("dark"));
    read();
    const watch = new MutationObserver(read);
    watch.observe(root, { attributes: true, attributeFilter: ["class"] });
    return () => watch.disconnect();
  }, []);

  // Your own deploy runs the beats on its own clock.
  useEffect(() => {
    if (scene.live) return;
    const next: Partial<Record<Beat, [Beat, number]>> = { commit: ["build", 700], build: ["ready", 2000], ready: ["live", 800] };
    const step = next[state.beat];
    if (!step) return;
    const t = setTimeout(() => take({ beat: step[0] }), step[1]);
    return () => clearTimeout(t);
  }, [scene.live, state.beat, take]);

  const status = STATUS[state.beat];

  return (
    <section ref={scene.ref} className="dh not-prose" aria-label="Deploy">
      <div className="dh-copy">
        <span className="dh-eyebrow">Northwind Cloud</span>
        <h3 className="dh-title">
          Push to deploy.
          <br />
          <span>Live everywhere.</span>
        </h3>
        <p className="dh-lede">Every commit builds in seconds and goes live close to your users, in every region at once.</p>
        <div className="dh-actions">
          <button type="button" className="dh-cta" onClick={() => take({ beat: "commit" })} disabled={!scene.live && state.beat !== "live"}>
            Deploy
          </button>
          <span className="dh-status" role="status" data-dot={status.dot}>
            <i aria-hidden="true" />
            <b>{status.text}</b>
            <span>{status.meta}</span>
          </span>
        </div>
      </div>

      <Remold.Scene
        key={dark ? "dark" : "light"}
        className="dh-scene"
        label="A commit building and shipping to three regions"
        objects={OBJECTS}
        links={LINKS}
        layouts={LAYOUTS}
        layout={state.beat}
        palette={dark ? NIGHT : "paper"}
        interact={{ drag: false }}
      />
    </section>
  );
}
