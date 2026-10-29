"use client";

import { caption, extrude, layout } from "@remold-ui/canvas";
import { CanvasStage, type StageScene } from "./canvas-stage";
import {
  API_GLYPH,
  BROWSER_GLYPH,
  DATASTORE_GLYPH,
  GLOBE_GLYPH,
  SERVER_GLYPH,
} from "./demo-glyphs";

interface Layer {
  id: string;
  name: string;
  note: string;
  blurb: string;
  icon: string;
}

const LAYERS: Layer[] = [
  {
    id: "edge",
    name: "Edge",
    note: "30 regions",
    blurb:
      "Runs close to your users in 30 regions, and keeps serving if one goes down.",
    icon: GLOBE_GLYPH,
  },
  {
    id: "data",
    name: "Database",
    note: "Hourly backups",
    blurb:
      "Relational storage with hourly backups you can restore to the minute.",
    icon: DATASTORE_GLYPH,
  },
  {
    id: "workers",
    name: "Workers",
    note: "Background jobs",
    blurb:
      "Sends the emails, builds the exports and runs billing, away from the request.",
    icon: SERVER_GLYPH,
  },
  {
    id: "api",
    name: "API",
    note: "One typed API",
    blurb:
      "One typed API that every client talks to: web, mobile and your customers’ scripts.",
    icon: API_GLYPH,
  },
  {
    id: "interface",
    name: "Interface",
    note: "Web, iOS, Android",
    blurb:
      "What people see: the web app and the iOS and Android apps, from one design system.",
    icon: BROWSER_GLYPH,
  },
];

const slab = (layer: Layer, top: boolean) =>
  extrude({
    radius: 0.1,
    height: 18,
    sides: top ? "sheen" : "gradient",
    edge: top,
    decal: { icon: layer.icon, text: layer.name, at: [0, 0.3], size: 20 },
  });

const IDS = LAYERS.map((l) => l.id);
const NOTES = IDS.map((id) => `${id}-note`);

const notes = (shown: boolean, z: number) =>
  layout.stack(NOTES, {
    size: 10,
    gap: 90,
    z,
    at: [250, -250],
    extra: shown ? {} : { opacity: 0 },
  });

const ANATOMY: StageScene = {
  label: "Lumen, drawn as the layers it is made of",
  objects: {
    ...Object.fromEntries(
      LAYERS.map((l, i) => [
        l.id,
        {
          look: slab(l, i === LAYERS.length - 1),
          label: l.name,
          description: l.blurb,
        },
      ]),
    ),
    ...Object.fromEntries(
      LAYERS.map((l, i) => [
        NOTES[i]!,
        { look: caption, label: l.note, interactive: false },
      ]),
    ),
  },
  links: [
    ...IDS.map((id, i) => ({
      from: id,
      to: NOTES[i]!,
      fromPort: "right" as const,
      dashed: true,
      layouts: ["Exploded"],
    })),

    ...LAYERS.slice(1).map((l, i) => ({
      from: LAYERS[LAYERS.length - 1 - i]!.id,
      to: LAYERS[LAYERS.length - 2 - i]!.id,
      flow: true,
      arrow: "end" as const,
      layouts: ["Request"],
    })),
  ],
  layouts: {
    Assembled: {
      camera: { zoom: 1.35 },
      caption: "Lumen as one block, every layer stacked tight.",
      objects: {
        ...layout.stack(IDS, { size: 300, gap: 22 }),
        ...notes(false, 0),
      },
    },
    Exploded: {
      camera: { zoom: 1.1 },
      caption: "The layers pulled apart, with a note beside each.",
      objects: {
        ...layout.stack(IDS, { size: 260, gap: 90, z: -120, at: [-60, 60] }),
        ...notes(true, -120),
      },
    },
    Request: {
      camera: { zoom: 1.15 },
      caption:
        "The same layers in a row, in the order a request passes through them.",
      objects: {
        ...layout.row([...IDS].reverse(), { gap: 200, size: 150 }),
        ...notes(false, 0),
      },
    },
  },
};

const VIEWS: Record<string, { title: string; body: string }> = {
  Assembled: {
    title: "Lumen",
    body: "Five layers, one product. Tap a layer to read what it does.",
  },
  Exploded: {
    title: "What it’s made of",
    body: "The layers pulled apart, bottom to top: edge, database, workers, API, interface.",
  },
  Request: {
    title: "A request, start to finish",
    body: "From the app people see down to the edge it runs on, in the order a request travels.",
  },
};

export function ProductAnatomyDemo() {
  return (
    <CanvasStage
      scene={ANATOMY}
      title="Product anatomy"
      height={560}
      describe={(layout, focused) => {
        const layer = LAYERS.find((l) => l.id === focused);
        if (layer) return { title: layer.name, body: layer.blurb };
        return VIEWS[layout] ?? { title: layout, body: "" };
      }}
    />
  );
}
