/**
 * Living diagrams on canvas. Each one is plain data: objects, a few layouts and the links
 * between objects. `<Remold.Scene>` springs every object, link and the camera between
 * layouts, and lets people turn the scene, tap an object to focus it, or tab through it.
 */
import { Remold } from "@remold-ui/react";
import { useEffect, useRef, useState } from "react";
import { useAutoplay, type DemoProps, type Example } from "../examples/types";
import { useMotion } from "../motion";
import { Segmented } from "../ui/controls";

type SceneProps = Remold.Scene.Props;
type Layouts = SceneProps["layouts"];
type Box = Layouts[string]["objects"][string];

/** A box on the floor: position, footprint, and anything else (height, opacity, label). */
const B = (x: number, y: number, z: number, width: number, depth: number, extra: Partial<Box> = {}): Box => ({
  x,
  y,
  z,
  width,
  depth,
  ...extra,
});

interface Diagram<L extends string> {
  label: string;
  palette: SceneProps["palette"];
  objects: SceneProps["objects"];
  links?: SceneProps["links"];
  layouts: Layouts & Record<L, Layouts[string]>;
  /** What the preview steps through: a layout, and optionally an object to focus. */
  tour: { layout: L; focused?: string }[];
}

/** One diagram, with its place picker and caption on its page, or touring by itself as a preview. */
function SceneDemo<L extends string>({ diagram, preview, autoplay }: DemoProps & { diagram: Diagram<L> }) {
  const { loop, reducedMotion } = useMotion();
  const order = Object.keys(diagram.layouts) as L[];
  const [layout, setLayout] = useState<L>(diagram.tour[0]!.layout);
  const [focused, setFocused] = useState<string | null>(null);
  useAutoplay(autoplay, 2600, (count) => {
    const stop = diagram.tour[(count + 1) % diagram.tour.length]!;
    setLayout(stop.layout);
    setFocused(stop.focused ?? null);
  });

  const object = focused ? diagram.objects[focused] : undefined;
  const caption = object ? `${object.label}: ${object.description}` : diagram.layouts[layout].caption;
  return (
    <div className="demo-panel dark">
      <Remold.Scene
        key={reducedMotion}
        className="scene-canvas"
        label={diagram.label}
        objects={diagram.objects}
        layouts={diagram.layouts}
        links={diagram.links}
        palette={diagram.palette}
        layout={layout}
        focused={focused}
        onFocusedChange={setFocused}
        interact={preview ? { hover: false, tap: false, drag: false, keyboard: false } : undefined}
        loop={loop}
        reducedMotion={reducedMotion}
      />
      {!preview && (
        <>
          <Segmented
            label="Layout"
            tone="dark"
            options={order}
            value={layout}
            onChange={(next) => {
              setLayout(next);
              setFocused(null);
            }}
          />
          <p className="scene-caption" aria-live="polite">
            {caption}
          </p>
        </>
      )}
    </div>
  );
}

/** How much closer the isometric cameras sit than the layouts say. */
const STAGE_ZOOM = 1.3;

/** Build an Example around a diagram; the shared parts of every scene's documentation live here. */
function sceneExample<L extends string>(
  diagram: Diagram<L>,
  page: Omit<Example, "category" | "frame" | "Demo" | "uses"> & { uses?: Example["uses"] },
): Example {
  // The layouts above were drawn for a smaller stage; bring the isometric cameras in a step.
  const layouts = Object.fromEntries(
    Object.entries(diagram.layouts).map(([name, layout]) => [
      name,
      layout.camera === "fit" ? layout : { ...layout, camera: { ...layout.camera, zoom: (layout.camera?.zoom ?? 1) * STAGE_ZOOM } },
    ]),
  ) as Diagram<L>["layouts"];
  const staged = { ...diagram, layouts };
  const Demo = (props: DemoProps) => <SceneDemo diagram={staged} {...props} />;
  Demo.displayName = `SceneDemo(${page.id})`;
  return {
    ...page,
    category: "Canvas",
    frame: "panel",
    uses: page.uses ?? [
      { name: "Remold.Scene", role: "Draws the diagram and springs objects, links and the camera between layouts." },
      { name: "focused / onFocusedChange", role: "The lifted object, set by a tap, the keyboard or the tour." },
    ],
    Demo,
  };
}

/* Architecture: an app's layers, stacked, pulled apart, flattened. */

export const architecture = sceneExample(
  {
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
      {
        from: "app",
        to: "api",
        fromPort: "top",
        toPort: "top",
        route: "curve",
        arrow: "end",
        flow: true,
        layouts: ["Stacked", "Exploded"],
      },
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
    tour: [{ layout: "Stacked" }, { layout: "Exploded" }, { layout: "Exploded", focused: "api" }, { layout: "Flat" }],
  },
  {
    id: "architecture",
    title: "Architecture map",
    summary: "An app's layers stacked, pulled apart to show what talks to what, and flattened for the docs.",
    headline: (
      <>
        One diagram,
        <br />
        three ways to read it.
      </>
    ),
    lead: "Seven objects in three layouts: a compact stack, an exploded view with live connections, and a flat diagram. Switching layouts springs every object, link and the camera together, so you never lose track of a piece.",
    tries: [
      "Switch to Exploded: the layers lift apart and the dashed links fade in.",
      "Switch to Flat: clients, app, api and data settle into one connected reading path.",
      "Tap a layer to lift it and read what it does. Drag sideways to turn the scene.",
    ],
    code: `
<Remold.Scene
  objects={{ api: { look: "glass", label: "api" }, … }}
  layouts={{ stacked: { … }, exploded: { … }, flat: { camera: "fit", … } }}
  links={[
    { from: "web", to: "app", fromPort: "right", toPort: "left", route: "curve", arrow: "end", flow: true },
    { from: "app", to: "api", fromPort: "right", toPort: "left", arrow: "end", flow: true },
    { from: "api", to: "data", fromPort: "right", toPort: "left", route: "curve", arrow: "both", dashed: true },
  ]}
  palette="violet"
  layout={view}
/>
`,
  },
);

/* Database: one primary that shards, then replicates. */

export const database = sceneExample(
  {
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
    tour: [{ layout: "Single" }, { layout: "Sharded" }, { layout: "Sharded", focused: "s2" }, { layout: "Replicated" }],
  },
  {
    id: "database",
    title: "Database",
    summary: "One database splits into shards by key range, then merges back with replicas copying every write.",
    headline: (
      <>
        Watch the data
        <br />
        find its place.
      </>
    ),
    lead: "Three disks of one database pull apart into three shards, each owning a range of customers, then merge back into a primary with two replicas. The api's connections follow the data, and dots show where reads and writes are going.",
    tries: [
      "Switch Single to Sharded: the stack splits into three, and the api now talks to all of them.",
      "Switch to Replicated: the shards merge and two replicas rise beside the primary.",
      "Tap a shard to see which customers it holds.",
    ],
    code: `
<Remold.Scene
  objects={{ s1: { look: "cylinder", label: "a–f" }, … }}
  links={[{ from: "api", to: "s1", flow: true, layouts: ["Sharded"] }, …]}
  layouts={{ single: { … }, sharded: { … }, replicated: { … } }}
  palette="amber"
  layout={stage}
/>
`,
  },
);

/* Deploy pipeline: from a commit to production, then a canary release. */

const STAGE = { width: 120, depth: 84 };
export const pipeline = sceneExample(
  {
    label: "A deploy pipeline from commit to production",
    palette: "teal",
    objects: {
      commit: { look: "chip", label: "commit", description: "A change is pushed." },
      build: { look: "plate", label: "build", description: "Compiles and bundles the app once." },
      unit: { look: "chip", label: "unit", description: "Unit tests, in about a minute." },
      e2e: { look: "chip", label: "e2e", description: "End-to-end tests in real browsers." },
      lint: { look: "chip", label: "lint", description: "Types and style checks." },
      staging: { look: "glass", label: "staging", description: "A copy of production for a last look." },
      prod: { look: "plate", label: "production", description: "What everyone uses." },
      canary: { look: "plate", label: "canary 5%", description: "The new version, for 5% of people first." },
    },
    links: [
      { from: "commit", to: "build", flow: true },
      { from: "build", to: "unit", flow: true },
      { from: "build", to: "e2e", flow: true, layouts: ["Parallel", "Canary"] },
      { from: "build", to: "lint", flow: true, layouts: ["Parallel", "Canary"] },
      { from: "unit", to: "staging", flow: true },
      { from: "e2e", to: "staging", flow: true, layouts: ["Parallel", "Canary"] },
      { from: "lint", to: "staging", flow: true, layouts: ["Parallel", "Canary"] },
      { from: "staging", to: "prod", flow: true, layouts: ["Pipeline", "Parallel"] },
      { from: "staging", to: "canary", flow: true, layouts: ["Canary"] },
      { from: "canary", to: "prod", dashed: true, layouts: ["Canary"] },
    ],
    layouts: {
      Pipeline: {
        caption: "One step after another: build, test, stage, ship.",
        camera: { yaw: 30, pitch: 58, zoom: 0.92 },
        objects: {
          commit: B(-560, -40, 0, 80, 60),
          build: B(-400, -42, 0, STAGE.width, STAGE.depth),
          unit: B(-210, -40, 0, 100, 70),
          e2e: B(-210, -40, 18, 100, 70),
          lint: B(-210, -40, 36, 100, 70),
          staging: B(-30, -50, 0, 140, 100),
          prod: B(200, -60, 0, 180, 120),
          canary: B(240, -40, 0, 100, 70, { opacity: 0 }),
        },
      },
      Parallel: {
        caption: "Tests fan out and run side by side, so the pipeline takes as long as the slowest one.",
        camera: { yaw: 30, pitch: 56, zoom: 0.9 },
        objects: {
          commit: B(-560, -40, 0, 80, 60),
          build: B(-400, -42, 0, STAGE.width, STAGE.depth),
          unit: B(-210, -190, 0, 100, 70),
          e2e: B(-210, -40, 0, 100, 70),
          lint: B(-210, 110, 0, 100, 70),
          staging: B(-30, -50, 0, 140, 100),
          prod: B(200, -60, 0, 180, 120),
          canary: B(240, -40, 0, 100, 70, { opacity: 0 }),
        },
      },
      Canary: {
        caption: "The release goes to 5% of people first; production follows once it looks healthy.",
        camera: { yaw: 30, pitch: 56, zoom: 0.9 },
        objects: {
          commit: B(-560, -40, 0, 80, 60),
          build: B(-400, -42, 0, STAGE.width, STAGE.depth),
          unit: B(-210, -190, 0, 100, 70),
          e2e: B(-210, -40, 0, 100, 70),
          lint: B(-210, 110, 0, 100, 70),
          staging: B(-30, -50, 0, 140, 100),
          canary: B(190, -230, 0, 120, 84, { height: 30 }),
          prod: B(200, 40, 0, 180, 120),
        },
      },
    },
    tour: [{ layout: "Pipeline" }, { layout: "Parallel" }, { layout: "Parallel", focused: "e2e" }, { layout: "Canary" }],
  },
  {
    id: "pipeline",
    title: "Deploy pipeline",
    summary: "A commit flows through build and tests to production; the tests fan out, then a canary goes first.",
    headline: (
      <>
        From commit
        <br />
        to customers.
      </>
    ),
    lead: "A delivery pipeline you can read at a glance. The three test suites start stacked in one step, fan out to run in parallel, and the release grows a canary that takes 5% of traffic before production.",
    tries: [
      "Switch Pipeline to Parallel: the stacked test step fans out into three.",
      "Switch to Canary: a canary appears between staging and production, and the links reroute.",
      "Tap e2e to read what it does.",
    ],
    code: `
<Remold.Scene
  objects={{ build: { look: "plate" }, unit: { look: "chip" }, … }}
  links={[{ from: "staging", to: "canary", flow: true, layouts: ["canary"] }, …]}
  layouts={{ pipeline: { … }, parallel: { … }, canary: { … } }}
  palette="teal"
/>
`,
  },
);

/* Edge network: requests going to one origin, then to the nearest edge. */

const POPS = ["ams", "sin", "gru", "iad", "syd"] as const;
const USERS = ["u1", "u2", "u3", "u4", "u5"] as const;
const ring = (i: number, n: number, r: number, w: number, d: number, extra: Partial<Box> = {}) => {
  const a = (i / n) * Math.PI * 2 - Math.PI / 2;
  return B(Math.cos(a) * r - w / 2, Math.sin(a) * r - d / 2, 0, w, d, extra);
};
export const edge = sceneExample(
  {
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
    tour: [{ layout: "Origin" }, { layout: "Edge" }, { layout: "Edge", focused: "sin" }, { layout: "Map" }],
  },
  {
    id: "edge",
    title: "Edge network",
    summary: "Requests crossing the world to one origin, then served by edge locations that rise near people.",
    headline: (
      <>
        Closer is
        <br />
        faster.
      </>
    ),
    lead: "Five groups of people, one origin server. At first every request travels to the origin. Switch to Edge and five locations rise between them; the flowing links reroute to the nearest one, and the origin shrinks because it's doing less.",
    tries: [
      "Switch Origin to Edge: the edge locations grow and every link reroutes.",
      "Switch to Map for a flat version of the same network.",
      "Tap an edge location to read what it does.",
    ],
    code: `
<Remold.Scene
  objects={{ origin: { look: "tower" }, ams: { look: "cylinder" }, … }}
  links={[
    { from: "u1", to: "origin", flow: true, layouts: ["origin"] },
    { from: "u1", to: "ams", flow: true, layouts: ["edge"] },
  ]}
  layouts={{ origin: { … }, edge: { … }, map: { camera: "fit", … } }}
/>
`,
  },
);

/* Autoscaling: pods added as traffic grows, then a new node. */

const PODS = ["p1", "p2", "p3", "p4", "p5", "p6", "p7", "p8", "p9"] as const;
const NODE = { width: 260, depth: 200 };
const podOn = (node: number, slot: number, show: boolean) =>
  B(-430 + node * 300 + (slot % 3) * 80, -70 + Math.floor(slot / 3) * 80, 14, 60, 60, show ? { height: 40 } : { height: 4, opacity: 0 });

export const autoscaling = sceneExample(
  {
    label: "A service that adds pods and nodes as traffic grows",
    palette: "violet",
    objects: {
      lb: { look: "glass", label: "load balancer", description: "Spreads requests across every pod." },
      n1: { look: "plate", label: "node 1", description: "A machine that runs pods." },
      n2: { look: "plate", label: "node 2", description: "A second machine." },
      n3: { look: "plate", label: "node 3", description: "Added when the first two were full." },
      ...Object.fromEntries(
        PODS.map((p) => [p, { look: "chip" as const, label: "pod", description: "One copy of the service.", interactive: false }]),
      ),
    },
    links: [
      { from: "lb", to: "n1", flow: true },
      { from: "lb", to: "n2", flow: true, layouts: ["Busy", "Spike"] },
      { from: "lb", to: "n3", flow: true, layouts: ["Spike"] },
    ],
    layouts: {
      Quiet: {
        caption: "Night-time: two pods on one node are plenty.",
        camera: { yaw: 35, pitch: 58, zoom: 0.95 },
        objects: {
          lb: B(-120, -380, 0, 240, 90),
          n1: B(-450, -90, 0, NODE.width, NODE.depth),
          n2: B(-150, -90, 0, NODE.width, NODE.depth, { opacity: 0.35 }),
          n3: B(150, -90, 0, NODE.width, NODE.depth, { opacity: 0 }),
          ...Object.fromEntries(PODS.map((p, i) => [p, podOn(Math.floor(i / 3), i % 3, i < 2)])),
        },
      },
      Busy: {
        caption: "Traffic grows: pods are added on a second node.",
        camera: { yaw: 35, pitch: 58, zoom: 0.95 },
        objects: {
          lb: B(-120, -380, 0, 240, 90),
          n1: B(-450, -90, 0, NODE.width, NODE.depth),
          n2: B(-150, -90, 0, NODE.width, NODE.depth),
          n3: B(150, -90, 0, NODE.width, NODE.depth, { opacity: 0 }),
          ...Object.fromEntries(PODS.map((p, i) => [p, podOn(Math.floor(i / 3), i % 3, i < 5)])),
        },
      },
      Spike: {
        caption: "A spike: both nodes are full, so a third node joins and fills up.",
        camera: { yaw: 35, pitch: 58, zoom: 0.95 },
        objects: {
          lb: B(-120, -380, 0, 240, 90),
          n1: B(-450, -90, 0, NODE.width, NODE.depth),
          n2: B(-150, -90, 0, NODE.width, NODE.depth),
          n3: B(150, -90, 0, NODE.width, NODE.depth),
          ...Object.fromEntries(PODS.map((p, i) => [p, podOn(Math.floor(i / 3), i % 3, true)])),
        },
      },
    },
    tour: [{ layout: "Quiet" }, { layout: "Busy" }, { layout: "Spike" }, { layout: "Spike", focused: "n3" }],
  },
  {
    id: "autoscaling",
    title: "Autoscaling",
    summary: "Pods appear as traffic grows, and a third node joins when the first two are full.",
    headline: (
      <>
        More traffic,
        <br />
        more room.
      </>
    ),
    lead: "A service scaling with demand. Each pod is an object that's hidden or shown per layout, so pods grow out of the node when they start and shrink away when they stop, and the load balancer's links follow the nodes that are in use.",
    tries: [
      "Switch Quiet, Busy and Spike: pods grow out of their nodes and a third node fades in.",
      "Switch back to Quiet: the extra pods shrink away.",
      "Tap a node to read what it does.",
    ],
    code: `
// Hidden in one layout, shown in the next: it grows in.
layouts={{
  quiet: { objects: { p5: { …, opacity: 0, height: 4 } } },
  busy:  { objects: { p5: { …, height: 40 } } },
}}
`,
  },
);

/* Integrations: one app at the centre of the services it uses. */

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

export const integrations = sceneExample(
  {
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
    tour: [{ layout: "Hub" }, { layout: "Hub", focused: "payments" }, { layout: "Grouped" }, { layout: "Flat" }],
  },
  {
    id: "integrations",
    title: "Integrations",
    summary: "Your app at the centre with data flowing in from six services: as a hub, grouped by direction, or flat.",
    headline: (
      <>
        Everything it talks to,
        <br />
        at a glance.
      </>
    ),
    lead: "An integrations page usually shows a grid of logos. This shows the shape instead: your app in the middle, data flowing along every connection. Regroup the services by direction or flatten it for the docs, and focus one to read what it does.",
    tries: [
      "Switch Hub, Grouped and Flat. The links follow their services; the dots keep flowing.",
      "Tap payments to lift it and read what it's for.",
      "Turn on Reduce motion: layouts change instantly and the flow stops, but the connections stay.",
    ],
    code: `
<Remold.Scene
  objects={{ app: { look: "glass" }, payments: { look: "chip" }, … }}
  links={services.map((id) => ({ from: id, to: "app", flow: true }))}
  layouts={{ hub: { … }, grouped: { … }, flat: { camera: "fit", … } }}
  focused={focused}
  onFocusedChange={setFocused}
/>
`,
  },
);

/* Live traffic: one tower per region, as tall as its traffic. */

const REGIONS = ["SFO", "IAD", "GRU", "LHR", "FRA", "ACC", "BOM", "NRT", "SYD"] as const;
const TRAFFIC: Record<"Night" | "Morning" | "Peak", number[]> = {
  Night: [30, 40, 20, 18, 22, 14, 60, 140, 110],
  Morning: [60, 90, 50, 150, 130, 90, 120, 80, 40],
  Peak: [170, 190, 110, 210, 180, 120, 150, 130, 70],
};
const cell = (i: number) => ({ x: -255 + (i % 3) * 190, y: -255 + Math.floor(i / 3) * 190 });
const city = (heights: number[], camera: { yaw: number; pitch: number; zoom: number }, caption: string) => ({
  caption,
  camera,
  objects: {
    floor: B(-300, -300, -1, 600, 600),
    ...Object.fromEntries(REGIONS.map((r, i) => [r, { ...cell(i), z: 0, width: 130, depth: 130, height: heights[i]! }])),
  },
});

export const traffic = sceneExample(
  {
    label: "Live traffic by region, as an isometric bar chart",
    palette: "violet",
    objects: {
      floor: { look: "grid" },
      ...Object.fromEntries(
        REGIONS.map((r) => [r, { look: "tower" as const, label: r, description: `Requests from the ${r} region right now.` }]),
      ),
    },
    layouts: {
      Night: city(TRAFFIC.Night, { yaw: 38, pitch: 56, zoom: 1.12 }, "Night in the Americas and Europe: Asia and Australia are busiest."),
      Morning: city(TRAFFIC.Morning, { yaw: 45, pitch: 56, zoom: 1.12 }, "Morning in Europe: London and Frankfurt wake up."),
      Peak: city(TRAFFIC.Peak, { yaw: 52, pitch: 54, zoom: 1.04 }, "The daily peak, when most regions overlap."),
      "Top down": {
        caption: "The same towers as a flat chart.",
        camera: "fit",
        objects: {
          floor: B(-300, -300, -1, 600, 600),
          ...Object.fromEntries(REGIONS.map((r, i) => [r, { ...cell(i), z: 0, width: 130, depth: 130, height: 8 }])),
        },
      },
    },
    tour: [{ layout: "Morning" }, { layout: "Peak" }, { layout: "Peak", focused: "LHR" }, { layout: "Night" }, { layout: "Top down" }],
  },
  {
    id: "traffic",
    title: "Live traffic city",
    summary: "An isometric chart of nine regions whose towers grow with traffic, then flatten into a top-down view.",
    headline: (
      <>
        A chart you can
        <br />
        walk around.
      </>
    ),
    lead: "Nine regions, one tower each, drawn live on canvas from a few numbers. Change the time of day and every tower springs to its new height; drag the city to turn it, or flatten it into a plain chart.",
    tries: [
      "Switch Night, Morning and Peak: each region's tower grows to its traffic.",
      "Drag sideways and flick: the city keeps turning and settles where the flick would coast.",
      "Choose Top down and the same towers settle into a flat chart. Tab in and use the arrow keys.",
    ],
    code: `
<Remold.Scene
  objects={{ LHR: { look: "tower", label: "LHR" }, … }}
  layouts={{ peak: { objects: { LHR: { …, height: 210 } } } }}
  layout={timeOfDay}
/>
`,
  },
);

/* Point clouds: an intentionally object-less scene.  The renderer matches the points itself,
 * so data does not need stable ids in order to keep its visual continuity. */

type CloudShape = "Grid" | "Wave" | "Burst";
const CLOUD_SHAPES: readonly CloudShape[] = ["Grid", "Wave", "Burst"];
const CLOUDS: Record<CloudShape, { x: number; y: number; z: number }[]> = {
  Grid: Array.from({ length: 25 }, (_, i) => ({ x: -200 + (i % 5) * 100, y: -200 + Math.floor(i / 5) * 100, z: 0 })),
  Wave: Array.from({ length: 25 }, (_, i) => {
    const x = -240 + i * 20;
    return { x, y: Math.sin(i * 0.58) * 150, z: 18 + Math.cos(i * 0.58) * 70 };
  }),
  Burst: Array.from({ length: 37 }, (_, i) => {
    const a = (i / 37) * Math.PI * 2;
    const r = 70 + (i % 4) * 48;
    return { x: Math.cos(a) * r, y: Math.sin(a) * r, z: (i % 3) * 32 };
  }),
};

function PointCloudDemo({ preview, autoplay }: DemoProps) {
  const { loop, reducedMotion } = useMotion();
  const actions = useRef<Remold.Scene.Actions | null>(null);
  const [shape, setShape] = useState<CloudShape>("Grid");
  useEffect(() => {
    actions.current?.points(CLOUDS[shape], { size: 24, palette: "teal" });
  }, [shape]);
  useAutoplay(autoplay, 2600, (count) => setShape(CLOUD_SHAPES[(count + 1) % CLOUD_SHAPES.length]!));

  return (
    <div className="demo-panel dark">
      <Remold.Scene
        className="scene-canvas"
        label="A cloud of data points changing between a grid, a wave and a burst"
        objects={{}}
        layouts={{ only: { camera: { yaw: 42, pitch: 59, zoom: 1.02 }, objects: {} } }}
        actionsRef={actions}
        loop={loop}
        reducedMotion={reducedMotion}
        interact={{ hover: false, tap: false, drag: false, keyboard: false }}
      />
      {!preview && (
        <>
          <Segmented label="Point cloud shape" tone="dark" options={CLOUD_SHAPES} value={shape} onChange={setShape} />
          <p className="scene-caption">
            Points have no keys. Remold pairs the closest old and new points, grows arrivals and shrinks departures.
          </p>
        </>
      )}
    </div>
  );
}

export const pointCloud: Example = {
  id: "point-cloud",
  category: "Canvas",
  title: "Point cloud",
  summary: "A keyless cloud shifts from grid to wave to burst; points find the closest next position by themselves.",
  headline: (
    <>
      Data moves,
      <br />
      without an identity crisis.
    </>
  ),
  lead: "A point cloud is for data, not a hand-authored diagram. Give Scene the next set of coordinates and it pairs the closest points, moves them there, then gently adds and removes the rest. This is useful for spatial data, particles and product visualizations where individual marks have no meaningful id.",
  tries: [
    "Switch Grid, Wave and Burst. The same points travel to their closest new places.",
    "Move from Wave to Burst: the extra points grow in rather than popping onto the canvas.",
    "Turn on Reduce motion: the data updates immediately, retaining the complete visual result.",
  ],
  code: `
const actions = useRef<Remold.Scene.Actions>(null);

<Remold.Scene actionsRef={actions} objects={{}} layouts={{ only: { objects: {} } }} />

// No ids needed. Existing points are paired by distance.
actions.current?.points(nextCoordinates, { size: 24, palette: "teal" });
`,
  uses: [
    { name: "Remold.Scene", role: "Owns the canvas and its animation loop, even when there are no named objects." },
    { name: "actionsRef.points", role: "Replaces a point set; nearest neighbours are matched, arrivals grow and departures shrink." },
  ],
  frame: "panel",
  Demo: PointCloudDemo,
};
