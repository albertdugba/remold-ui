"use client";

import { extrude, layout } from "@remold-ui/canvas";
import { CanvasStage, type StageScene } from "./canvas-stage";
import {
  BELL_GLYPH,
  CHART_GLYPH,
  CHAT_GLYPH,
  CODE_GLYPH,
  CREDIT_CARD_GLYPH,
  DATASTORE_GLYPH,
  LOCK_GLYPH,
  MAIL_GLYPH,
  RECEIPT_GLYPH,
  SPREADSHEET_GLYPH,
  SUN_GLYPH,
} from "./demo-glyphs";

type Category = "Data" | "Messaging" | "Payments";

interface Integration {
  id: string;
  name: string;
  icon: string;
  categories: Category[];
  blurb: string;
}

const INTEGRATIONS: Integration[] = [
  {
    id: "ledgerly",
    name: "Ledgerly",
    categories: ["Payments"],
    blurb: "Invoices and refunds sync both ways.",
    icon: CREDIT_CARD_GLYPH,
  },
  {
    id: "tillpoint",
    name: "Tillpoint",
    categories: ["Payments"],
    blurb: "Takes card payments at the counter.",
    icon: RECEIPT_GLYPH,
  },
  {
    id: "keyring",
    name: "Keyring",
    categories: ["Payments", "Data"],
    blurb: "Signs people in and keeps their keys safe.",
    icon: LOCK_GLYPH,
  },
  {
    id: "postbox",
    name: "Postbox",
    categories: ["Messaging"],
    blurb: "Sends receipts and digests by email.",
    icon: MAIL_GLYPH,
  },
  {
    id: "chatter",
    name: "Chatter",
    categories: ["Messaging"],
    blurb: "Posts updates into your team chat.",
    icon: CHAT_GLYPH,
  },
  {
    id: "pager",
    name: "Pager",
    categories: ["Messaging"],
    blurb: "Wakes the right person when something breaks.",
    icon: BELL_GLYPH,
  },
  {
    id: "webhooks",
    name: "Webhooks",
    categories: ["Messaging", "Data"],
    blurb: "Tells any system you run what just happened.",
    icon: CODE_GLYPH,
  },
  {
    id: "stackbase",
    name: "Stackbase",
    categories: ["Data"],
    blurb: "Copies every record into your warehouse hourly.",
    icon: DATASTORE_GLYPH,
  },
  {
    id: "sheetly",
    name: "Sheetly",
    categories: ["Data"],
    blurb: "Keeps a live spreadsheet of your orders.",
    icon: SPREADSHEET_GLYPH,
  },
  {
    id: "graphwell",
    name: "Graphwell",
    categories: ["Data"],
    blurb: "Turns events into dashboards.",
    icon: CHART_GLYPH,
  },
];

const SUN = SUN_GLYPH;

export interface IntegrationsHubProps {
  ringRadius?: number;

  focusRadius?: number;

  tileSize?: number;

  hubSize?: number;

  hubHeight?: number;

  flow?: boolean;

  showOthers?: boolean;

  zoom?: number;

  every?: number;

  height?: number;
}

const CATEGORIES = ["All", "Data", "Messaging", "Payments"] as const;
const ALL_IDS = INTEGRATIONS.map((x) => x.id);
const tile = (icon: string) =>
  extrude({ radius: 0.28, height: 20, decal: { icon, text: "", size: 42 } });

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
  const outer = layout.ring(ALL_IDS, {
    radius: ringRadius * 1.26,
    size: tileSize * 0.77,
    extra: { height: 4, opacity: showOthers ? 0.35 : 0 },
  });
  const layoutFor = (
    category: Category | "All",
  ): StageScene["layouts"][string] => {
    const members = ALL_IDS.filter(
      (id) =>
        category === "All" ||
        INTEGRATIONS.find((x) => x.id === id)!.categories.includes(category),
    );
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
          : layout.ring(members, {
              radius: focusRadius,
              size: tileSize * 1.18,
            })),
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
      ...Object.fromEntries(
        INTEGRATIONS.map((x) => [
          x.id,
          { look: tile(x.icon), label: x.name, description: x.blurb },
        ]),
      ),
    },
    links: INTEGRATIONS.map((x) => ({
      from: "hub",
      to: x.id,
      flow,
      layouts: CATEGORIES.filter(
        (c) => c === "All" || x.categories.includes(c),
      ),
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
  const scene = buildHub({
    ringRadius,
    focusRadius,
    tileSize,
    hubSize,
    hubHeight,
    flow,
    showOthers,
    zoom,
  });
  return (
    <CanvasStage
      scene={scene}
      title="Integrations"
      every={every}
      height={height}
      describe={(layout, focused) => {
        const x = INTEGRATIONS.find((i) => i.id === focused);
        if (x)
          return {
            title: `${x.name} · ${x.categories.join(" and ")}`,
            body: x.blurb,
          };
        if (focused === "hub")
          return {
            title: "Lumen",
            body: "Your product. Every integration talks to it, and nothing talks around it.",
          };
        const count =
          layout === "All"
            ? INTEGRATIONS.length
            : INTEGRATIONS.filter((i) =>
                i.categories.includes(layout as Category),
              ).length;
        return {
          title:
            layout === "All"
              ? `${count} integrations`
              : `${count} for ${layout.toLowerCase()}`,
          body: "Tap a tile to see what it does. Drag sideways to turn the scene.",
        };
      }}
    />
  );
}

export const IntegrationsHubDemo = IntegrationsHub;
