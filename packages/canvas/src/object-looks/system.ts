import { extrude, type ExtrudeOptions } from "../extrude";
import type { Look } from "./index";

const ICONS = {
  browser: "M3 5h18v14H3z M3 9h18 M6 7h.01 M8.5 7h.01 M11 7h.01",
  server: "M5 4h14v6H5z M5 14h14v6H5z M8 7h.01 M8 17h.01 M12 7h4 M12 17h4",
  database: "M4 7c0 1.66 3.58 3 8 3s8-1.34 8-3 M4 12c0 1.66 3.58 3 8 3s8-1.34 8-3",
  queue: "M3 8h4v8H3z M10 8h4v8h-4z M17 8h4v8h-4z",
  phone: "M8 3h8a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z M11 18h2",
  file: "M7 3h7l4 4v14H7z M14 3v4h4 M9.5 12h6 M9.5 15.5h6",
  person: "M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8z M5 21a7 7 0 0 1 14 0",
  vault: "M6 11h12v10H6z M8 11V7a4 4 0 0 1 8 0v4 M12 15v2",
  region: "M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18z M3 12h18 M12 3c3 3 3 15 0 18 M12 3c-3 3-3 15 0 18",
} as const;

/** The shape behind each solid look, so a skin can draw the same object its own way. */
export const SHAPES = {
  plate: { radius: 0.12, height: 14 },
  chip: { radius: 0.22, height: 9 },
  cylinder: { shape: "ellipse", height: 60 },
  tower: { radius: 0, height: 80 },
  browser: { radius: 0.08, height: 10, decal: { icon: ICONS.browser } },
  server: { radius: 0.06, height: 34, decal: { icon: ICONS.server } },
  database: { shape: "ellipse", height: 42, decal: { icon: ICONS.database } },
  queue: { radius: 0.18, height: 14, decal: { icon: ICONS.queue } },
  phone: { radius: 0.22, height: 8, decal: { icon: ICONS.phone } },
  file: { radius: 0.06, height: 4, decal: { icon: ICONS.file } },
  person: { shape: "ellipse", height: 6, decal: { icon: ICONS.person } },
  vault: { radius: 0.12, height: 26, decal: { icon: ICONS.vault } },
  region: { shape: "ellipse", height: 10, decal: { icon: ICONS.region } },
  coin: { shape: "ellipse", height: 5 },
} as const satisfies Record<string, ExtrudeOptions>;

export type ShapeName = keyof typeof SHAPES;

const solid = (name: ShapeName): Look => extrude({ sides: "sheen", shadow: true, ...SHAPES[name] });

/** A browser window: your app, a dashboard, a checkout page. */
export const browser = solid("browser");

/** A rack server: an API, a worker, an origin. */
export const server = solid("server");

/** A database cylinder. */
export const database = solid("database");

/** A queue or buffer: work waiting its turn. */
export const queue = solid("queue");

/** A phone: a customer, a mobile app, a push notification. */
export const phone = solid("phone");

/** A file: a document, a draft, a contract. */
export const file = solid("file");

/** A person: a user, a teammate, a customer. */
export const person = solid("person");

/** A vault: sealed or restricted data. */
export const vault = solid("vault");

/** A coin or token: credits, rate-limit tokens, a unit of something spent. */
export const coin = solid("coin");

/** A region or edge location. */
export const region = solid("region");
