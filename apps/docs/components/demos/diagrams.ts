/**
 * Four diagrams for the scene gallery: plain data (objects, links, a few named layouts), ported
 * from the playground. Remold.Scene springs every object, link and the camera between them.
 */
import type { Remold } from "@remold-ui/react";

type SceneProps = Remold.Scene.Props;
type Box = SceneProps["layouts"][string]["objects"][string];

export interface Diagram {
  label: string;
  palette: SceneProps["palette"];
  objects: SceneProps["objects"];
  links?: SceneProps["links"];
  layouts: SceneProps["layouts"];
}

/** A box on the floor: position, footprint, and anything else (height, opacity, label). */
const B = (x: number, y: number, z: number, width: number, depth: number, extra: Partial<Box> = {}): Box => ({
  x,
  y,
  z,
  width,
  depth,
  ...extra,
});

const POPS = ["ams", "sin", "gru", "iad", "syd"] as const;
const USERS = ["u1", "u2", "u3", "u4", "u5"] as const;
const ring = (i: number, n: number, r: number, w: number, d: number, extra: Partial<Box> = {}) => {
  const a = (i / n) * Math.PI * 2 - Math.PI / 2;
  return B(Math.cos(a) * r - w / 2, Math.sin(a) * r - d / 2, 0, w, d, extra);
};
const SERVICES = {
  payments: "Takes card payments and sends receipts back.",
  email: "Sends sign-up, reset and digest emails.",
  crm: "Keeps customer records in step with sign-ups.",
  calendar: "Books and moves meetings.",
  storage: "Holds uploads and exports.",
  analytics: "Receives product events.",
} as const;
type Service = keyof typeof SERVICES;
const SERVICE_IDS = Object.keys(SERVICES) as Service[];
const INBOUND: Service[] = ["payments", "crm", "calendar"];
const OUTBOUND: Service[] = ["email", "storage", "analytics"];
const SERVICE = { width: 120, depth: 74 };

export const architecture: Diagram = {
  label: "An app's architecture: clients, an api, a cache and data",
  palette: "violet",
  objects: {
    data: { look: "plate", label: "data", description: "Your database and files." },
    api: { look: "glass", label: "api", description: "The service that reads and writes data." },
    app: { look: "wire", label: "app", description: "What people use: web and mobile." },
    cache: { look: "glass", label: "cache", description: "Keeps hot answers close to the api." },
    web: { look: "chip", label: "web", description: "The web client." },
    ios: { look: "chip", label: "ios", description: "The iPhone client." },
    android: { look: "chip", label: "android", description: "The Android client." },
  },
  links: [
    // The compact views use the 3D-facing ports; the flat documentation view has its own
    // left-to-right endpoints so every object remains on one readable request path.
    {
      from: "web",
      to: "app",
      fromPort: "right",
      toPort: "left",
      route: "curve",
      arrow: "end",
      flow: true,
      layouts: ["Stacked", "Exploded"],
    },
    {
      from: "ios",
      to: "app",
      fromPort: "back",
      toPort: "front",
      route: "orthogonal",
      arrow: "end",
      flow: true,
      layouts: ["Stacked", "Exploded"],
    },
    {
      from: "android",
      to: "app",
      fromPort: "left",
      toPort: "right",
      route: "curve",
      arrow: "end",
      flow: true,
      layouts: ["Stacked", "Exploded"],
    },
    { from: "web", to: "app", fromPort: "right", toPort: "left", route: "curve", arrow: "end", flow: true, layouts: ["Flat"] },
    { from: "ios", to: "app", fromPort: "right", toPort: "left", route: "curve", arrow: "end", flow: true, layouts: ["Flat"] },
    { from: "android", to: "app", fromPort: "right", toPort: "left", route: "curve", arrow: "end", flow: true, layouts: ["Flat"] },
    { from: "app", to: "api", fromPort: "top", toPort: "top", route: "curve", arrow: "end", flow: true, layouts: ["Stacked", "Exploded"] },
    { from: "app", to: "api", fromPort: "right", toPort: "left", route: "straight", arrow: "end", flow: true, layouts: ["Flat"] },
    {
      from: "api",
      to: "data",
      fromPort: "top",
      toPort: "top",
      route: "curve",
      arrow: "both",
      dashed: true,
      layouts: ["Stacked", "Exploded"],
    },
    { from: "api", to: "data", fromPort: "right", toPort: "left", route: "curve", arrow: "both", dashed: true, layouts: ["Flat"] },
    { from: "cache", to: "api", fromPort: "top", toPort: "top", route: "curve", dashed: true, layouts: ["Stacked"] },
    { from: "cache", to: "api", dashed: true, layouts: ["Exploded", "Flat"] },
  ],
  layouts: {
    Stacked: {
      caption: "Three layers, one stack. Clients enter through the app; the api owns the data.",
      camera: { yaw: 45, pitch: 60, zoom: 1 },
      objects: {
        data: B(-150, -150, 0, 300, 300),
        api: B(-150, -150, 95, 300, 300),
        app: B(-150, -150, 190, 300, 300),
        cache: B(10, 10, 190, 120, 120),
        web: B(-390, -20, 0, 76, 76),
        ios: B(-40, 260, 0, 76, 76),
        android: B(260, -40, 0, 76, 76),
      },
    },
    Exploded: {
      caption: "Pulled apart, the path from clients to app, api and data stays connected.",
      camera: { yaw: 45, pitch: 57, zoom: 0.66 },
      objects: {
        data: B(-150, -150, 0, 300, 300),
        api: B(-150, -150, 200, 300, 300),
        app: B(-150, -150, 400, 300, 300),
        cache: B(200, -380, 200, 140, 140),
        web: B(-500, -20, 0, 76, 76),
        ios: B(-40, 380, 0, 76, 76),
        android: B(380, -40, 0, 76, 76),
      },
    },
    Flat: {
      caption: "One complete request path, flattened into a diagram for the docs.",
      camera: "fit",
      objects: {
        app: B(-500, -120, 0, 220, 180),
        api: B(-140, -120, 0, 220, 180),
        data: B(220, -120, 0, 220, 180),
        cache: B(-140, 120, 0, 220, 90),
        web: B(-760, -130, 0, 100, 50),
        ios: B(-760, -60, 0, 100, 50),
        android: B(-760, 10, 0, 100, 50),
      },
    },
  },
};

export const database: Diagram = {
  label: "A database that shards and replicates",
  palette: "amber",
  objects: {
    s1: { look: "cylinder", label: "a–f", description: "Customers whose names start with A to F." },
    s2: { look: "cylinder", label: "g–p", description: "Customers from G to P." },
    s3: { look: "cylinder", label: "q–z", description: "Customers from Q to Z, and the primary when merged." },
    r1: { look: "cylinder", label: "replica", description: "A read replica that copies every write." },
    r2: { look: "cylinder", label: "replica", description: "A second read replica, in another zone." },
    api: { look: "chip", label: "api", description: "Your API, sending reads and writes." },
  },
  links: [
    { from: "api", to: "s3", flow: true, layouts: ["Single", "Replicated"] },
    { from: "api", to: "s1", flow: true, layouts: ["Sharded"] },
    { from: "api", to: "s2", flow: true, layouts: ["Sharded"] },
    { from: "api", to: "s3", flow: true, layouts: ["Sharded"] },
    { from: "s3", to: "r1", dashed: true, flow: true, layouts: ["Replicated"] },
    { from: "s3", to: "r2", dashed: true, flow: true, layouts: ["Replicated"] },
  ],
  layouts: {
    Single: {
      caption: "One database, three disks deep.",
      camera: { yaw: 45, pitch: 58, zoom: 1.15 },
      objects: {
        s1: B(-80, -80, 0, 160, 160, { height: 55 }),
        s2: B(-80, -80, 55, 160, 160, { height: 55 }),
        s3: B(-80, -80, 110, 160, 160, { height: 55, label: "primary" }),
        r1: B(-55, -55, 0, 110, 110, { height: 10, opacity: 0 }),
        r2: B(-55, -55, 0, 110, 110, { height: 10, opacity: 0 }),
        api: B(-60, 240, 0, 96, 56),
      },
    },
    Sharded: {
      caption: "The same database splits into three shards by key range.",
      camera: { yaw: 45, pitch: 56, zoom: 1.05 },
      objects: {
        s1: B(-360, -70, 0, 140, 140, { height: 70 }),
        s2: B(-70, -70, 0, 140, 140, { height: 70 }),
        s3: B(220, -70, 0, 140, 140, { height: 70 }),
        r1: B(-45, -45, 0, 90, 90, { height: 10, opacity: 0 }),
        r2: B(-45, -45, 0, 90, 90, { height: 10, opacity: 0 }),
        api: B(-48, 260, 0, 96, 56),
      },
    },
    Replicated: {
      caption: "Merged back into one primary, with two replicas copying every write.",
      camera: { yaw: 45, pitch: 58, zoom: 1.05 },
      objects: {
        s1: B(-80, -80, 0, 160, 160, { height: 55 }),
        s2: B(-80, -80, 55, 160, 160, { height: 55 }),
        s3: B(-80, -80, 110, 160, 160, { height: 55, label: "primary" }),
        r1: B(-420, -40, 0, 120, 120, { height: 100 }),
        r2: B(300, -40, 0, 120, 120, { height: 100 }),
        api: B(-48, 280, 0, 96, 56),
      },
    },
  },
};

export const edge: Diagram = {
  label: "Requests served from one origin, then from edge locations near people",
  palette: "slate",
  objects: {
    origin: { look: "tower", label: "origin", description: "The one server that has everything." },
    ...Object.fromEntries(
      POPS.map((p) => [
        p,
        { look: "cylinder" as const, label: p, description: `Edge location ${p}: keeps copies close to people nearby.` },
      ]),
    ),
    ...Object.fromEntries(
      USERS.map((u, i) => [u, { look: "chip" as const, label: "people", description: `People near ${POPS[i]}.`, interactive: false }]),
    ),
  },
  links: [
    ...USERS.map((u) => ({ from: u, to: "origin", flow: true, layouts: ["Origin"] })),
    ...USERS.map((u, i) => ({ from: u, to: POPS[i]!, flow: true, layouts: ["Edge", "Map"] })),
    ...POPS.map((p) => ({ from: p, to: "origin", dashed: true, layouts: ["Edge", "Map"] })),
  ],
  layouts: {
    Origin: {
      caption: "Every request crosses the world to one origin.",
      camera: { yaw: 40, pitch: 56, zoom: 0.95 },
      objects: {
        origin: B(-70, -70, 0, 140, 140, { height: 190 }),
        ...Object.fromEntries(POPS.map((p, i) => [p, ring(i, POPS.length, 300, 90, 90, { height: 6, opacity: 0 })])),
        ...Object.fromEntries(USERS.map((u, i) => [u, ring(i, USERS.length, 480, 80, 52)])),
      },
    },
    Edge: {
      caption: "Edge locations rise near people; most requests stop there and never reach the origin.",
      camera: { yaw: 40, pitch: 56, zoom: 0.95 },
      objects: {
        origin: B(-60, -60, 0, 120, 120, { height: 90 }),
        ...Object.fromEntries(POPS.map((p, i) => [p, ring(i, POPS.length, 300, 90, 90, { height: 80 })])),
        ...Object.fromEntries(USERS.map((u, i) => [u, ring(i, USERS.length, 480, 80, 52)])),
      },
    },
    Map: {
      caption: "The same network as a flat map for the docs.",
      camera: "fit",
      objects: {
        origin: B(-60, -60, 0, 120, 120),
        ...Object.fromEntries(POPS.map((p, i) => [p, ring(i, POPS.length, 260, 90, 90)])),
        ...Object.fromEntries(USERS.map((u, i) => [u, ring(i, USERS.length, 430, 80, 52)])),
      },
    },
  },
};

export const integrations: Diagram = {
  label: "Your app and the six services it integrates with",
  palette: "teal",
  objects: {
    app: { look: "glass", label: "your app", description: "Your product, at the centre of its integrations." },
    ...Object.fromEntries(SERVICE_IDS.map((id) => [id, { look: "chip" as const, label: id, description: SERVICES[id] }])),
  },
  links: SERVICE_IDS.map((id) => ({ from: id, to: "app", flow: true })),
  layouts: {
    Hub: {
      caption: "Everything connects through your app.",
      camera: { yaw: 45, pitch: 58, zoom: 1.1 },
      objects: {
        app: B(-100, -100, 0, 200, 200, { height: 70 }),
        ...Object.fromEntries(SERVICE_IDS.map((id, i) => [id, ring(i, SERVICE_IDS.length, 360, SERVICE.width, SERVICE.depth)])),
      },
    },
    Grouped: {
      caption: "Services that send you data on one side, services you send data to on the other.",
      camera: { yaw: 30, pitch: 56, zoom: 1 },
      objects: {
        app: B(-100, -100, 0, 200, 200, { height: 70 }),
        ...Object.fromEntries(INBOUND.map((id, i) => [id, B(-480, -200 + i * 140, 0, SERVICE.width, SERVICE.depth)])),
        ...Object.fromEntries(OUTBOUND.map((id, i) => [id, B(360, -200 + i * 140, 0, SERVICE.width, SERVICE.depth)])),
      },
    },
    Flat: {
      caption: "The same picture as a flat diagram.",
      camera: "fit",
      objects: {
        app: B(-110, -90, 0, 220, 180),
        ...Object.fromEntries(INBOUND.map((id, i) => [id, B(-480, -170 + i * 120, 0, SERVICE.width, SERVICE.depth)])),
        ...Object.fromEntries(OUTBOUND.map((id, i) => [id, B(360, -170 + i * 120, 0, SERVICE.width, SERVICE.depth)])),
      },
    },
  },
};
