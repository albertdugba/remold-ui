"use client";

import type { Diagram, DiagramNode, DiagramOptions } from "@remold-ui/canvas";
import { BLOOM, CLAY, LEAF, SKY, SUN } from "./day-stage";
import { DiagramStage, type Say } from "./diagram-stage";

const LAYERS = [
  { id: "storage", name: "Storage", palette: CLAY, detail: "Files and images, served from the edge" },
  { id: "database", name: "Database", palette: SUN, detail: "Postgres, with a branch for every preview" },
  { id: "auth", name: "Auth", palette: BLOOM, detail: "Sessions, single sign-on and roles" },
  { id: "api", name: "API", palette: LEAF, detail: "One typed endpoint for every client" },
  { id: "ui", name: "Interface", palette: SKY, detail: "The app your customers click through", look: "browser" },
] as const;

const TOP = LAYERS[LAYERS.length - 1].id;
const CLOSED_LABEL = "Your app";
const SIZE = 250;
const THICKNESS = 14;
const SPREAD = 74;
const STAGGER = 0.07;
const DWELL = 1.8;

const closedZ = (index: number) => index * THICKNESS;
const openZ = (index: number) => index * SPREAD;
const topDown = [...LAYERS.entries()].reverse();

const layers = (): Record<string, DiagramNode> =>
  Object.fromEntries(
    LAYERS.map((layer, index) => [
      layer.id,
      {
        look: "look" in layer ? layer.look : "plate",
        label: layer.id === TOP ? CLOSED_LABEL : "",
        labelSide: "right",
        at: [0, 0],
        size: SIZE,
        height: THICKNESS,
        z: closedZ(index),
        palette: layer.palette,
      },
    ]),
  );

const options = (): DiagramOptions => ({
  label: "Exploded stack: one app opens into its five layers, interface, API, auth, database and storage, then closes again.",
  camera: { zoom: 1, centerX: -30, centerY: -170 },
  nodes: layers(),
  colors: { packet: "14, 165, 233", label: "#27272a", surface: "255, 255, 255" },
});

async function spread(diagram: Diagram, open: boolean) {
  for (const [index, layer] of topDown) {
    diagram.lift(layer.id, open ? openZ(index) : closedZ(index));
    diagram.relabel(layer.id, open ? layer.name : layer.id === TOP ? CLOSED_LABEL : "");
    await diagram.wait(STAGGER);
  }
}

async function explode(diagram: Diagram, say: Say) {
  say("One app");
  await diagram.wait(1.4);

  say("is five layers working together");
  await spread(diagram, true);
  await diagram.wait(1);

  for (const [, layer] of topDown) {
    diagram.highlight(layer.id);
    say(`${layer.name}: ${layer.detail}`);
    await diagram.wait(DWELL);
  }

  diagram.highlight(null);
  say("Each one can change without touching the others");
  await diagram.wait(1.2);
  await spread(diagram, false);
  await diagram.wait(1.6);
}

export function ExplodedStack() {
  return <DiagramStage figure="0.8" title="Exploded stack" tag="Architecture" options={options} script={explode} first="One app" />;
}
