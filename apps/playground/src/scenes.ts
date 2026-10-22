/**
 * "Illustrations that are alive": canvas scenes whose layouts spring between each other, plus a
 * voxel shape that rebuilds keylessly.
 */
import { scene, type LayoutBox, type Scene, type SceneOptions } from "@remold-ui/canvas";
import type { Point3 } from "@remold-ui/core";

const B = (x: number, y: number, z: number, width: number, depth: number, extra: Partial<LayoutBox> = {}): LayoutBox => ({
  x,
  y,
  z,
  width,
  depth,
  ...extra,
});

const SCENES: Record<string, SceneOptions> = {
  Architecture: {
    label: "How Remold's packages fit together",
    palette: "violet",
    objects: {
      core: { look: "plate", label: "core", description: "Matching, morphing and springs as pure maths. No DOM, so it runs anywhere." },
      dom: { look: "glass", label: "dom", description: "Reads the page, works out what became what, and plays the motion." },
      app: { look: "wire", label: "app", description: "Any framework, any component library." },
      canvas: { look: "glass", label: "canvas", description: "Live scenes like this one, on the same springs and matching." },
      react: { look: "chip", label: "react", description: "A thin adapter over dom." },
      vue: { look: "chip", label: "vue", description: "The same contract as directives." },
      angular: { look: "chip", label: "angular", description: "Standalone directives." },
    },
    links: [
      { from: "react", to: "dom", flow: true },
      { from: "vue", to: "dom", flow: true },
      { from: "angular", to: "dom", flow: true },
      { from: "dom", to: "core", dashed: true, layouts: ["Exploded", "Diagram"] },
      { from: "canvas", to: "core", dashed: true, layouts: ["Exploded", "Diagram"] },
    ],
    layouts: {
      Stacked: {
        caption: "Three layers, one stack. The core does the maths; everything above it is thin.",
        camera: { yaw: 45, pitch: 60, zoom: 1 },
        objects: {
          core: B(-150, -150, 0, 300, 300),
          dom: B(-150, -150, 95, 300, 300),
          app: B(-150, -150, 190, 300, 300),
          canvas: B(10, 10, 190, 120, 120),
          react: B(-390, -20, 0, 76, 76),
          vue: B(-40, 260, 0, 76, 76),
          angular: B(260, -40, 0, 76, 76),
        },
      },
      Exploded: {
        caption: "Pulled apart, you can see what talks to what.",
        camera: { yaw: 45, pitch: 57, zoom: 0.78 },
        objects: {
          core: B(-150, -150, 0, 300, 300),
          dom: B(-150, -150, 200, 300, 300),
          app: B(-150, -150, 400, 300, 300),
          canvas: B(200, -380, 200, 140, 140),
          react: B(-500, -20, 0, 76, 76),
          vue: B(-40, 380, 0, 76, 76),
          angular: B(380, -40, 0, 76, 76),
        },
      },
      Diagram: {
        caption: "The same objects flattened into a diagram you could put in the docs.",
        camera: "fit",
        objects: {
          app: B(-640, -130, 0, 300, 220),
          dom: B(-150, -130, 0, 300, 220),
          core: B(340, -130, 0, 300, 220),
          canvas: B(-150, 150, 0, 300, 120),
          react: B(-640, 150, 0, 90, 56),
          vue: B(-535, 150, 0, 90, 56),
          angular: B(-430, 150, 0, 90, 56),
        },
      },
    },
  },
  Database: {
    label: "A database that shards and replicates",
    palette: "amber",
    objects: {
      s1: { look: "cylinder", label: "a–f", description: "Shard a–f: customers whose names start with A to F." },
      s2: { look: "cylinder", label: "g–p", description: "Shard g–p." },
      s3: { look: "cylinder", label: "q–z", description: "Shard q–z, and the primary when merged." },
      r1: { look: "cylinder", label: "replica", description: "A read replica that copies every write." },
      r2: { look: "cylinder", label: "replica", description: "A second read replica in another zone." },
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
  },
};

/** Voxel shapes on a 9×9 grid, from little pictures: "#" is a cube. */
const PICTURES: Record<string, string[]> = {
  Heart: [".##...##.", "####.####", "#########", "#########", ".#######.", "..#####..", "...###...", "....#....", "........."],
  Star: ["....#....", "....#....", "...###...", "#########", ".#######.", "..#####..", ".###.###.", ".##...##.", "#.......#"],
  Check: [".........", "........#", ".......##", "......##.", "#....##..", "##..##...", ".####....", "..##.....", "........."],
};
const CELL = 34;
const toPoints = (picture: string[]): Point3[] =>
  picture.flatMap((row, r) => [...row].flatMap((c, k) => (c === "#" ? [{ x: (k - 4) * CELL, y: (r - 4) * CELL, z: 0 }] : [])));

export function setUpScenes() {
  const canvas = document.getElementById("scene") as HTMLCanvasElement;
  const sceneButtons = document.getElementById("scene-kinds")!;
  const layoutButtons = document.getElementById("scene-layouts")!;
  const info = document.getElementById("scene-info")!;
  let current: Scene | null = null;

  const press = (group: HTMLElement, active: string) => {
    for (const b of group.querySelectorAll("button")) b.setAttribute("aria-pressed", String(b.textContent === active));
  };

  const load = (name: string) => {
    current?.destroy();
    const options = SCENES[name]!;
    current = scene(canvas, {
      ...options,
      onFocusChange: (id) => {
        info.textContent = id ? options.objects[id]?.description ?? "" : options.layouts[current!.layout]?.caption ?? "";
      },
    });
    layoutButtons.replaceChildren(
      ...Object.keys(options.layouts).map((layout) => {
        const button = document.createElement("button");
        button.type = "button";
        button.textContent = layout;
        button.addEventListener("click", () => {
          current!.to(layout);
          press(layoutButtons, layout);
          info.textContent = options.layouts[layout]!.caption ?? "";
        });
        return button;
      }),
    );
    press(sceneButtons, name);
    press(layoutButtons, current.layout);
    info.textContent = options.layouts[current.layout]!.caption ?? "";
  };

  for (const name of Object.keys(SCENES)) {
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = name;
    button.addEventListener("click", () => load(name));
    sceneButtons.append(button);
  }
  load("Architecture");

  // Voxels
  const voxelCanvas = document.getElementById("voxels") as HTMLCanvasElement;
  const voxels = scene(voxelCanvas, {
    label: "A shape made of cubes that rebuilds into other shapes",
    palette: "teal",
    objects: {},
    layouts: { view: { camera: { yaw: 35, pitch: 55, zoom: 1.1 }, objects: {} } },
    interact: { hover: false, tap: false, keyboard: false },
  });
  const shapeButtons = document.getElementById("voxel-shapes")!;
  const show = (name: string) => {
    voxels.points(toPoints(PICTURES[name]!), { size: 28 });
    press(shapeButtons, name);
  };
  for (const name of Object.keys(PICTURES)) {
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = name;
    button.addEventListener("click", () => show(name));
    shapeButtons.append(button);
  }
  show("Heart");
}
