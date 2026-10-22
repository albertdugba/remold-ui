/**
 * Scenes built from `extrude()`: any flat shape pushed up into a solid, with optional sheen,
 * a glowing rim, a hollow well and text or an icon on top. Plain data, like the diagrams;
 * Remold.Scene springs every object, link and the camera between the layouts.
 */
import { caption, extrude } from "@remold-ui/canvas";
import type { Remold } from "@remold-ui/react";

type SceneProps = Remold.Scene.Props;
type Box = SceneProps["layouts"][string]["objects"][string];

export interface BuiltScene {
  label: string;
  objects: SceneProps["objects"];
  links?: SceneProps["links"];
  layouts: SceneProps["layouts"];
}

const B = (x: number, y: number, z: number, width: number, depth: number, extra: Partial<Box> = {}): Box => ({
  x,
  y,
  z,
  width,
  depth,
  ...extra,
});
/** A square footprint centred on (cx, cy). */
const C = (cx: number, cy: number, z: number, size: number, extra: Partial<Box> = {}): Box =>
  B(cx - size / 2, cy - size / 2, z, size, size, extra);

/** Remold's mark: one wave, drawn on a 24 × 24 grid. */
const WAVE = "M3 15C7 15 8 9 12 9S17 15 21 15";

/* 1. Adapters: one engine, a package name, and the adapters stacked like cards. */

const ADAPTERS = ["react", "dom", "canvas", "core", "vue"] as const;
const block = extrude({
  radius: 0.16,
  height: 36,
  sides: "sheen",
  edge: true,
  decal: { icon: WAVE, text: "", size: 96, color: "#c9b6ff" },
});
// The label runs along the front edge, so it still shows when the cards are stacked.
const card = extrude({ radius: 0.16, height: 10, decal: { align: "start", size: 15, at: [0, 0.36] } });

export const adapters: BuiltScene = {
  label: "One engine with an adapter for each place it runs",
  objects: {
    engine: { look: block, label: "Remold engine", description: "Matching and springs, shared by every adapter." },
    name: { look: caption, label: "@remold-ui/", interactive: false },
    ...Object.fromEntries(ADAPTERS.map((a) => [a, { look: card, label: a, description: `The ${a} package.` }])),
  },
  links: [
    { from: "engine", to: "name", fromPort: "right", route: "straight" },
    { from: "name", to: "react", toPort: "left", route: "straight", flow: true },
  ],
  layouts: {
    Stacked: {
      camera: { zoom: 1.05 },
      caption: "The adapters stacked, the React one lit by the line from the engine.",
      objects: {
        engine: C(-250, 250, 0, 190),
        name: C(0, 0, 18, 10),
        ...Object.fromEntries(ADAPTERS.map((a, i) => [a, C(250, -250, (ADAPTERS.length - 1 - i) * 40, 180)])),
      },
    },
    Spread: {
      camera: { zoom: 0.95 },
      caption: "The same cards dealt out on the table.",
      objects: {
        engine: C(-300, 300, 0, 170),
        name: C(-40, 40, 18, 10),
        ...Object.fromEntries(ADAPTERS.map((a, i) => [a, C(170 + (i - 2) * 120, -170 + (i - 2) * 120, 0, 110)])),
      },
    },
    Picked: {
      camera: { zoom: 1.1, yaw: 35 },
      caption: "One card pulled out of the stack towards the engine.",
      objects: {
        engine: C(-250, 250, 0, 190),
        name: C(0, 0, 18, 10),
        ...Object.fromEntries(
          ADAPTERS.map((a, i) => [a, a === "react" ? C(120, -120, 190, 180) : C(250, -250, (ADAPTERS.length - 1 - i) * 30, 180)]),
        ),
      },
    },
  },
};

/* 2. A snapshot tray: the page before, the matcher in the middle, the page after. */

const lid = extrude({ radius: 0.12, height: 8, edge: true, decal: { text: "" } });
const tray = extrude({ radius: 0.12, height: 74, sides: "sheen", well: { inset: 0.07, depth: 0.8 }, decal: { text: "" } });
const base = extrude({ radius: 0.12, height: 8, edge: true, decal: { text: "" } });

export const snapshots: BuiltScene = {
  label: "A transition as layers: the page after, the matcher, and the page before",
  objects: {
    after: { look: lid, label: "After", description: "The page as it is now." },
    matcher: { look: tray, label: "Matcher", description: "Works out which element became which." },
    before: { look: base, label: "Before", description: "The page as it was a moment ago." },
    afterNote: { look: caption, label: "after snapshot", interactive: false },
    beforeNote: { look: caption, label: "before snapshot", interactive: false },
  },
  links: [
    { from: "afterNote", to: "after", toPort: "left", dashed: true, layouts: ["Open", "Closed"] },
    { from: "beforeNote", to: "before", toPort: "right", dashed: true, layouts: ["Open", "Closed"] },
  ],
  layouts: {
    Open: {
      camera: { zoom: 1.15 },
      caption: "Pulled apart: the lid lifted off the tray, the base dropped below.",
      objects: {
        after: C(0, 0, 210, 250),
        matcher: C(0, 0, 60, 290),
        before: C(0, 0, 0, 250),
        afterNote: C(-200, 200, 210, 10),
        beforeNote: C(200, -200, 0, 10),
      },
    },
    Closed: {
      camera: { zoom: 1.2 },
      caption: "Closed up: one block, the way it runs.",
      objects: {
        after: C(0, 0, 84, 266),
        matcher: C(0, 0, 10, 290),
        before: C(0, 0, 0, 290),
        afterNote: C(-200, 200, 84, 10),
        beforeNote: C(200, -200, 0, 10),
      },
    },
    "Side by side": {
      camera: { zoom: 0.95, pitch: 70 },
      caption: "Laid out in order, left to right.",
      objects: {
        before: C(-320, 320, 0, 200),
        matcher: C(0, 0, 0, 220),
        after: C(320, -320, 0, 200),
        afterNote: C(320, -320, 0, 10, { opacity: 0 }),
        beforeNote: C(-320, 320, 0, 10, { opacity: 0 }),
      },
    },
  },
};

/* 3. Any outline: SVG path data in, a solid out. */

/** A cog with `teeth` teeth and a round hole, as path data in a 100 × 100 box. */
function gear(teeth: number): string {
  const points: string[] = [];
  for (let i = 0; i < teeth * 4; i++) {
    const a = (i / (teeth * 4)) * Math.PI * 2;
    const r = i % 4 < 2 ? 50 : 39;
    points.push(`${(50 + Math.cos(a) * r).toFixed(1)} ${(50 + Math.sin(a) * r).toFixed(1)}`);
  }
  return `M${points.join("L")}ZM36 50a14 14 0 1 0 28 0a14 14 0 1 0-28 0Z`;
}

const SHAPES = {
  star: "M50 0L61 38H100L69 60L80 100L50 76L20 100L31 60L0 38H39Z",
  heart: "M50 92C20 70 4 52 4 32A22 22 0 0 1 50 22A22 22 0 0 1 96 32C96 52 80 70 50 92Z",
  hexagon: "M25 4H75L100 50L75 96H25L0 50Z",
  ring: "M0 50a50 50 0 1 0 100 0a50 50 0 1 0-100 0ZM28 50a22 22 0 1 0 44 0a22 22 0 1 0-44 0Z",
  arrow: "M0 35H58V8L100 50L58 92V65H0Z",
  gear: gear(10),
} as const;
type ShapeName = keyof typeof SHAPES;
const NAMES = Object.keys(SHAPES) as ShapeName[];
const solid = (path: string) => extrude({ shape: { path }, height: 34, sides: "sheen", edge: true, decal: { text: "" } });

export const outlines: BuiltScene = {
  label: "Six shapes made from SVG path data: a star, a heart, a hexagon, a ring, an arrow and a gear",
  objects: Object.fromEntries(NAMES.map((n) => [n, { look: solid(SHAPES[n]), label: n, description: `A ${n}, extruded from its path.` }])),
  layouts: {
    Row: {
      camera: { zoom: 0.92 },
      caption: "In a row. The star and the gear are concave, and every notch is drawn the right way round.",
      objects: Object.fromEntries(NAMES.map((n, i) => [n, C((i - 2.5) * 118, -(i - 2.5) * 118, 0, 104)])),
    },
    Tower: {
      camera: { zoom: 1.2 },
      caption: "Stacked into one tower.",
      objects: Object.fromEntries(NAMES.map((n, i) => [n, C(0, 0, i * 42, 200 - i * 14)])),
    },
    Circle: {
      camera: { zoom: 1, yaw: 30, pitch: 55 },
      caption: "Round a circle. Drag sideways to turn it.",
      objects: Object.fromEntries(
        NAMES.map((n, i) => {
          const a = (i / NAMES.length) * Math.PI * 2;
          return [n, C(Math.cos(a) * 250, Math.sin(a) * 250, 0, 140)];
        }),
      ),
    },
  },
};
