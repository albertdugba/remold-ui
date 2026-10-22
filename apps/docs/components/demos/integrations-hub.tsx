"use client";
/**
 * An integrations hub: your product in the middle, the tools it connects to around it, with data
 * flowing along the lines. Pick a category and the tiles rearrange: the ones in it step forward
 * into a ring around the hub, the rest step back and sink. A tile in two categories (Webhooks,
 * Keyring) stays lit and only moves. Tap a tile to light its line and read what it does.
 *
 * Built with `Remold.Scene` and canvas `extrude()`: plain data, no drawing code. "Lumen" and
 * every integration here are made up; use your own product mark and your partners' icons.
 */
import { extrude, layout } from "@remold-ui/canvas";
import { CanvasStage, type StageScene } from "./canvas-stage";

type Category = "Data" | "Messaging" | "Payments";

interface Integration {
  id: string;
  name: string;
  icon: string;
  categories: Category[];
  blurb: string;
}

/** 24 × 24 outline icons, drawn for this demo. */
const INTEGRATIONS: Integration[] = [
  {
    id: "ledgerly",
    name: "Ledgerly",
    categories: ["Payments"],
    blurb: "Invoices and refunds sync both ways.",
    icon: "M3.5 7.5h17v10h-17ZM3.5 10.5h17M7 14.5h3",
  },
  {
    id: "tillpoint",
    name: "Tillpoint",
    categories: ["Payments"],
    blurb: "Takes card payments at the counter.",
    icon: "M6 3.5h12v17l-2-1.5-2 1.5-2-1.5-2 1.5-2-1.5-2 1.5ZM9 8h6M9 11.5h6M9 15h3",
  },
  {
    id: "keyring",
    name: "Keyring",
    categories: ["Payments", "Data"],
    blurb: "Signs people in and keeps their keys safe.",
    icon: "M7.5 11V8a4.5 4.5 0 0 1 9 0v3M5.5 11h13v9h-13ZM12 14.5v2",
  },
  {
    id: "postbox",
    name: "Postbox",
    categories: ["Messaging"],
    blurb: "Sends receipts and digests by email.",
    icon: "M3.5 6.5h17v11h-17ZM3.5 7l8.5 6 8.5-6",
  },
  {
    id: "chatter",
    name: "Chatter",
    categories: ["Messaging"],
    blurb: "Posts updates into your team chat.",
    icon: "M4 5.5h16v10H10l-4.5 3.5v-3.5H4Z",
  },
  {
    id: "pager",
    name: "Pager",
    categories: ["Messaging"],
    blurb: "Wakes the right person when something breaks.",
    icon: "M6.5 16.5V11a5.5 5.5 0 0 1 11 0v5.5l1.5 1.5H5ZM10 20.5h4",
  },
  {
    id: "webhooks",
    name: "Webhooks",
    categories: ["Messaging", "Data"],
    blurb: "Tells any system you run what just happened.",
    icon: "M9 7.5 4.5 12 9 16.5M15 7.5l4.5 4.5-4.5 4.5M13.5 5l-3 14",
  },
  {
    id: "stackbase",
    name: "Stackbase",
    categories: ["Data"],
    blurb: "Copies every record into your warehouse hourly.",
    icon: "M5 6.5c0-1.5 3-2.5 7-2.5s7 1 7 2.5-3 2.5-7 2.5-7-1-7-2.5ZM5 6.5v11c0 1.5 3 2.5 7 2.5s7-1 7-2.5v-11M5 12c0 1.5 3 2.5 7 2.5s7-1 7-2.5",
  },
  {
    id: "sheetly",
    name: "Sheetly",
    categories: ["Data"],
    blurb: "Keeps a live spreadsheet of your orders.",
    icon: "M4 4.5h16v15H4ZM4 9.5h16M4 14.5h16M10 4.5v15",
  },
  {
    id: "graphwell",
    name: "Graphwell",
    categories: ["Data"],
    blurb: "Turns events into dashboards.",
    icon: "M4.5 19.5h15M7 16v-4M11 16V8M15 16v-6M19 16V5",
  },
];

const SUN =
  "M12 2.5v2.5M12 19v2.5M2.5 12H5M19 12h2.5M5.3 5.3l1.8 1.8M16.9 16.9l1.8 1.8M5.3 18.7l1.8-1.8M16.9 7.1l1.8-1.8M12 8a4 4 0 1 1 0 8a4 4 0 1 1 0-8Z";

export interface IntegrationsHubProps {
  /** How far tiles sit from the hub in the All view, in floor units. Default 285. */
  ringRadius?: number;
  /** How far a category's tiles sit from the hub. Default 215. */
  focusRadius?: number;
  /** Tile size in the All view; a category's tiles are a fifth bigger. Default 78. */
  tileSize?: number;
  /** The hub's size. Default 150. */
  hubSize?: number;
  /** How tall the hub stands. Default 44. */
  hubHeight?: number;
  /** Dots flow along the lines. Default true. */
  flow?: boolean;
  /** Keep tiles outside the category on an outer ring, faint, instead of hiding them. Default true. */
  showOthers?: boolean;
  /** How close the camera is. Default 1. */
  zoom?: number;
  /** Milliseconds per category while playing. Default 3200. */
  every?: number;
  /** The stage's height in pixels. Default 520. */
  height?: number;
}

const CATEGORIES = ["All", "Data", "Messaging", "Payments"] as const;
const ALL_IDS = INTEGRATIONS.map((x) => x.id);
const tile = (icon: string) => extrude({ radius: 0.28, height: 20, decal: { icon, text: "", size: 42 } });

/** The scene for these settings: plain data, rebuilt when a setting changes. */
function buildHub({
  ringRadius,
  focusRadius,
  tileSize,
  hubSize,
  hubHeight,
  flow,
  showOthers,
  zoom,
}: Required<Omit<IntegrationsHubProps, "every" | "height">>): StageScene {
  // Where tiles out of the category wait: an outer ring, flat and faint (or gone).
  const outer = layout.ring(ALL_IDS, {
    radius: ringRadius * 1.26,
    size: tileSize * 0.77,
    extra: { height: 4, opacity: showOthers ? 0.35 : 0 },
  });
  const layoutFor = (category: Category | "All"): StageScene["layouts"][string] => {
    const members = ALL_IDS.filter((id) => category === "All" || INTEGRATIONS.find((x) => x.id === id)!.categories.includes(category));
    return {
      camera: { zoom: (category === "All" ? 1.45 : 1.6) * zoom },
      caption:
        category === "All"
          ? "Lumen in the middle, every integration around it."
          : `The ${category.toLowerCase()} integrations, close to Lumen.`,
      objects: {
        ...outer,
        hub: layout.square(0, 0, hubSize, { height: hubHeight }),
        ...(category === "All"
          ? layout.ring(members, { radius: ringRadius, size: tileSize })
          : layout.ring(members, { radius: focusRadius, size: tileSize * 1.18 })),
      },
    };
  };
  return {
    label: "Lumen and the tools it connects to",
    objects: {
      hub: {
        look: extrude({
          radius: 0.32,
          height: hubHeight,
          sides: "sheen",
          edge: true,
          decal: { icon: SUN, text: "", size: hubSize * 0.47 },
        }),
        label: "Lumen",
        description: "Your product, in the middle.",
      },
      ...Object.fromEntries(INTEGRATIONS.map((x) => [x.id, { look: tile(x.icon), label: x.name, description: x.blurb }])),
    },
    links: INTEGRATIONS.map((x) => ({
      from: "hub",
      to: x.id,
      flow,
      layouts: CATEGORIES.filter((c) => c === "All" || x.categories.includes(c)),
    })),
    layouts: Object.fromEntries(CATEGORIES.map((c) => [c, layoutFor(c)])),
  };
}

export function IntegrationsHub({
  ringRadius = 285,
  focusRadius = 215,
  tileSize = 78,
  hubSize = 150,
  hubHeight = 44,
  flow = true,
  showOthers = true,
  zoom = 1,
  every = 3200,
  height = 520,
}: IntegrationsHubProps) {
  const scene = buildHub({ ringRadius, focusRadius, tileSize, hubSize, hubHeight, flow, showOthers, zoom });
  return (
    <CanvasStage
      scene={scene}
      title="Integrations"
      every={every}
      height={height}
      describe={(layout, focused) => {
        const x = INTEGRATIONS.find((i) => i.id === focused);
        if (x) return { title: `${x.name} · ${x.categories.join(" and ")}`, body: x.blurb };
        if (focused === "hub") return { title: "Lumen", body: "Your product. Every integration talks to it, and nothing talks around it." };
        const count = layout === "All" ? INTEGRATIONS.length : INTEGRATIONS.filter((i) => i.categories.includes(layout as Category)).length;
        return {
          title: layout === "All" ? `${count} integrations` : `${count} for ${layout.toLowerCase()}`,
          body: "Tap a tile to see what it does. Drag sideways to turn the scene.",
        };
      }}
    />
  );
}

/** The docs page's name for it. */
export const IntegrationsHubDemo = IntegrationsHub;
