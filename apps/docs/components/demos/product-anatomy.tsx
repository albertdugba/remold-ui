"use client";
/**
 * Product anatomy: an app drawn as the layers it's made of. Assembled, it's one block. Exploded,
 * the layers spread apart with a note beside each. As a request, the same layers lie down in a
 * row and data flows through them in order. Tap a layer to bring it forward and read what it does.
 *
 * Built with `Remold.Scene`, canvas `extrude()` and `caption`: plain data, no drawing code.
 * "Lumen" and its layers are made up; describe your own stack, device or service the same way.
 */
import { caption, extrude, layout } from "@remold-ui/canvas";
import { CanvasStage, type StageScene } from "./canvas-stage";

interface Layer {
  id: string;
  name: string;
  note: string;
  blurb: string;
  icon: string;
}

/** Bottom to top. Icons are 24 × 24 outlines drawn for this demo. */
const LAYERS: Layer[] = [
  {
    id: "edge",
    name: "Edge",
    note: "30 regions",
    blurb: "Runs close to your users in 30 regions, and keeps serving if one goes down.",
    icon: "M12 3a9 9 0 1 0 0 18a9 9 0 1 0 0-18ZM3 12h18M12 3c2.5 2.6 3.8 5.6 3.8 9s-1.3 6.4-3.8 9c-2.5-2.6-3.8-5.6-3.8-9S9.5 5.6 12 3Z",
  },
  {
    id: "data",
    name: "Database",
    note: "Hourly backups",
    blurb: "Relational storage with hourly backups you can restore to the minute.",
    icon: "M5 6.5c0-1.5 3-2.5 7-2.5s7 1 7 2.5-3 2.5-7 2.5-7-1-7-2.5ZM5 6.5v11c0 1.5 3 2.5 7 2.5s7-1 7-2.5v-11M5 12c0 1.5 3 2.5 7 2.5s7-1 7-2.5",
  },
  {
    id: "workers",
    name: "Workers",
    note: "Background jobs",
    blurb: "Sends the emails, builds the exports and runs billing, away from the request.",
    icon: "M4.5 5h15v5h-15ZM4.5 14h15v5h-15ZM8 7.5h.01M8 16.5h.01M12 7.5h4M12 16.5h4",
  },
  {
    id: "api",
    name: "API",
    note: "One typed API",
    blurb: "One typed API that every client talks to: web, mobile and your customers’ scripts.",
    icon: "M9 4.5c-2 0-3 1-3 3v2c0 1.5-.8 2.5-2.5 2.5 1.7 0 2.5 1 2.5 2.5v2c0 2 1 3 3 3M15 4.5c2 0 3 1 3 3v2c0 1.5.8 2.5 2.5 2.5-1.7 0-2.5 1-2.5 2.5v2c0 2-1 3-3 3",
  },
  {
    id: "interface",
    name: "Interface",
    note: "Web, iOS, Android",
    blurb: "What people see: the web app and the iOS and Android apps, from one design system.",
    icon: "M3.5 5h17v14h-17ZM3.5 9h17M6.5 7h.01M9 7h.01",
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
/** The notes sit to the right of the stack, one per layer; hidden unless the layout shows them. */
const notes = (shown: boolean, z: number) =>
  layout.stack(NOTES, { size: 10, gap: 90, z, at: [250, -250], extra: shown ? {} : { opacity: 0 } });

const ANATOMY: StageScene = {
  label: "Lumen, drawn as the layers it is made of",
  objects: {
    ...Object.fromEntries(LAYERS.map((l, i) => [l.id, { look: slab(l, i === LAYERS.length - 1), label: l.name, description: l.blurb }])),
    ...Object.fromEntries(LAYERS.map((l, i) => [NOTES[i]!, { look: caption, label: l.note, interactive: false }])),
  },
  links: [
    // Notes beside the exploded layers.
    ...IDS.map((id, i) => ({ from: id, to: NOTES[i]!, fromPort: "right" as const, dashed: true, layouts: ["Exploded"] })),
    // A request, top to bottom, when the layers lie in a row.
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
      objects: { ...layout.stack(IDS, { size: 300, gap: 22 }), ...notes(false, 0) },
    },
    Exploded: {
      camera: { zoom: 1.1 },
      caption: "The layers pulled apart, with a note beside each.",
      objects: { ...layout.stack(IDS, { size: 260, gap: 90, z: -120, at: [-60, 60] }), ...notes(true, -120) },
    },
    Request: {
      camera: { zoom: 1.15 },
      caption: "The same layers in a row, in the order a request passes through them.",
      objects: {
        // Top layer first, in the order a request passes through.
        ...layout.row([...IDS].reverse(), { gap: 200, size: 150 }),
        ...notes(false, 0),
      },
    },
  },
};

const VIEWS: Record<string, { title: string; body: string }> = {
  Assembled: { title: "Lumen", body: "Five layers, one product. Tap a layer to read what it does." },
  Exploded: { title: "What it’s made of", body: "The layers pulled apart, bottom to top: edge, database, workers, API, interface." },
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
