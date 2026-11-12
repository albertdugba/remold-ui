import type { Matrix, Projector } from "../camera";
import { caption } from "../extrude";
import { halo } from "../glow";
import { ellipse, extent, projectOutline, roundedRect, silhouette, type Box3, type Outline, type ScreenPoint } from "../geometry";

export interface Palette {
  /** The top face. */
  top: string;
  /** Side shading, from the shadowed edge to the lit edge. */
  sides: readonly [string, string, string];
  /** Outlines and links, as "r, g, b". */
  line: string;
  /** Glow when hovered or focused, as "r, g, b". */
  glow: string;
  /** Label text. */
  text: string;
}

/** Built-in colour palettes for scene objects. */
export const palettes = {
  violet: { top: "#17151f", sides: ["#3a1fb2", "#7a5bff", "#c5b3ff"], line: "170, 150, 255", glow: "124, 92, 255", text: "#ffffff" },
  teal: { top: "#121a1a", sides: ["#0b4e4a", "#1fa899", "#a6f2e6"], line: "120, 230, 215", glow: "40, 190, 170", text: "#ffffff" },
  amber: { top: "#1c1610", sides: ["#6b300a", "#d97a22", "#ffd596"], line: "255, 200, 140", glow: "240, 150, 60", text: "#ffffff" },
  slate: { top: "#161a20", sides: ["#2b3442", "#5b6b80", "#b8c4d4"], line: "190, 200, 215", glow: "150, 170, 200", text: "#ffffff" },
  ink: { top: "#0b0a10", sides: ["#160f2e", "#4c22c9", "#b799ff"], line: "150, 118, 255", glow: "118, 72, 255", text: "#d9d4ee" },
  paper: { top: "#ffffff", sides: ["#b9bdc6", "#d9dce2", "#f3f4f6"], line: "63, 63, 70", glow: "37, 99, 235", text: "#18181b" },
  sketch: { top: "#ffffff", sides: ["#e7e8ec", "#f3f4f6", "#ffffff"], line: "17, 17, 20", glow: "109, 74, 255", text: "#111114" },
} as const satisfies Record<string, Palette>;

export type PaletteName = keyof typeof palettes;

export interface DrawContext {
  ctx: CanvasRenderingContext2D;
  view: Projector;
  pixelRatio: number;
}

export interface DrawState {
  box: Box3;
  label: string;
  palette: Palette;
  /** 0 to 1: how lit up (hovered or focused) the object is. */
  glow: number;
  /** The outline right now, as path data, when the layouts give the object a `shape`. */
  shape?: string;
  /** 0 to 1: how full the object is, from the layout's `fill`. */
  fill?: number;
  /** 0 to 1: how see-through the object is, from the layout's `ghost`. */
  ghost?: number;
  /** The colour of what the object holds, from the layout's `color`, as `rgb()`. */
  color?: string;
}

export interface Look {
  /** Footprint on the floor, for drawing and hit testing. */
  outline(box: Box3): Outline;
  /** Thickness used when a layout doesn't give one. */
  defaultHeight: number;
  /** Draw before links and nodes; suited to maps, grids, and other scenery. */
  background?: boolean;
  /** Not hovered, focused or reachable by keyboard unless the object asks to be: captions, decoration. */
  passive?: boolean;
  /** The look's own outline as path data, which a layout's `shape` morphs from. */
  path?: string;
  draw(context: DrawContext, state: DrawState): void;
  /** For containers (a tray, a box): draw only the parts that face the viewer. */
  drawFront?(context: DrawContext, state: DrawState): void;
}

const MONO = 'ui-monospace, "SF Mono", Menlo, monospace';
const FULL_TURN = Math.PI * 2;
const GRID_STEP = 60;

const CONTINENTS: readonly (readonly (readonly [number, number])[])[] = [
  [[0.08, 0.2], [0.2, 0.13], [0.31, 0.2], [0.28, 0.33], [0.2, 0.39], [0.12, 0.33]],
  [[0.28, 0.43], [0.38, 0.39], [0.43, 0.52], [0.39, 0.77], [0.31, 0.68]],
  [[0.45, 0.22], [0.57, 0.14], [0.64, 0.28], [0.61, 0.41], [0.52, 0.39]],
  [[0.57, 0.43], [0.68, 0.45], [0.7, 0.67], [0.61, 0.8], [0.53, 0.62]],
  [[0.67, 0.2], [0.87, 0.17], [0.93, 0.3], [0.86, 0.47], [0.73, 0.42]],
  [[0.82, 0.62], [0.91, 0.6], [0.94, 0.76], [0.86, 0.83]],
];

const scaled = (matrix: Matrix, factor: number): Matrix => [
  matrix[0] * factor,
  matrix[1] * factor,
  matrix[2] * factor,
  matrix[3] * factor,
  matrix[4] * factor,
  matrix[5] * factor,
];

const radiusFor = (box: Box3, fraction: number) => Math.min(box.width, box.depth) * fraction;

const rounded = (fraction: number) => (box: Box3) =>
  roundedRect({ x: box.x, y: box.y, width: box.width, depth: box.depth, radius: radiusFor(box, fraction) });

const oval = (box: Box3) => ellipse({ x: box.x, y: box.y, width: box.width, depth: box.depth });

const floorPlate = (box: Box3) => roundedRect({ x: box.x, y: box.y, width: box.width, depth: box.depth, radius: 24 });

const labelSize = (box: Box3, cap: number, share: number) => Math.min(cap, box.depth * share);

function polygon(ctx: CanvasRenderingContext2D, points: readonly ScreenPoint[]): void {
  ctx.beginPath();

  for (const [index, point] of points.entries()) {
    if (index === 0) ctx.moveTo(point.x, point.y);
    else ctx.lineTo(point.x, point.y);
  }

  ctx.closePath();
}

function inScreenPixels(ctx: CanvasRenderingContext2D, pixelRatio: number, draw: () => void) {
  ctx.save();
  ctx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
  draw();
  ctx.restore();
}

function onFloor(ctx: CanvasRenderingContext2D, view: Projector, pixelRatio: number, z: number, draw: () => void) {
  ctx.save();
  ctx.setTransform(...scaled(view.plane(z), pixelRatio));
  draw();
  ctx.restore();
}

function label({ ctx, view, pixelRatio }: DrawContext, state: DrawState, size: number, alpha: number): void {
  if (!state.label) return;

  const { box } = state;
  const plane = view.plane(box.z + box.height);

  ctx.save();
  ctx.setTransform(...scaled(plane, pixelRatio));
  ctx.translate(box.x + box.width / 2, box.y + box.depth / 2);

  if (plane[0] < 0) ctx.rotate(Math.PI);

  ctx.font = `600 ${size}px ${MONO}`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.globalAlpha *= alpha;
  ctx.fillStyle = state.palette.text;
  ctx.fillText(state.label, 0, 0, box.width * 0.9);
  ctx.restore();
}

function prismSides({ ctx, view }: DrawContext, { box, palette, glow }: DrawState, outline: Outline) {
  const sides = silhouette({ outline, z0: box.z, z1: box.z + box.height, view });
  const { minX, maxX } = extent(sides);
  const gradient = ctx.createLinearGradient(minX, 0, maxX, 0);

  gradient.addColorStop(0, palette.sides[0]);
  gradient.addColorStop(0.55, palette.sides[1]);
  gradient.addColorStop(1, palette.sides[2]);
  polygon(ctx, sides);
  halo({ context: ctx, color: palette.glow, alpha: 0.22 * (0.2 + 0.38 * glow), radius: 11 * (0.5 + glow) });
  ctx.fillStyle = gradient;
  ctx.fill();
}

function prism(context: DrawContext, state: DrawState, outline: Outline, size: number): void {
  const { ctx, view, pixelRatio } = context;
  const { box, palette, glow } = state;
  const top = projectOutline(outline, box.z + box.height, view);

  inScreenPixels(ctx, pixelRatio, () => {
    if (box.height > 0.5 && view.sinPitch > 0.02) prismSides(context, state, outline);

    polygon(ctx, top);
    ctx.fillStyle = palette.top;
    ctx.fill();
    ctx.strokeStyle = `rgba(${palette.line}, ${0.45 + 0.45 * glow})`;
    ctx.lineWidth = 1;
    ctx.stroke();
  });

  label(context, state, size, 0.6 + 0.4 * glow);
}

/** A solid slab with rounded corners: the main building block. */
export const plate: Look = {
  defaultHeight: 14,
  outline: rounded(0.12),
  draw: (context, state) => prism(context, state, plate.outline(state.box), labelSize(state.box, 26, 0.18)),
};

/** A small, thin, rounder slab: integrations, users, buttons. */
export const chip: Look = {
  defaultHeight: 9,
  outline: rounded(0.22),
  draw: (context, state) => prism(context, state, chip.outline(state.box), labelSize(state.box, 16, 0.3)),
};

/** A standing cylinder: databases, queues, storage. */
export const cylinder: Look = {
  defaultHeight: 60,
  outline: oval,
  draw: (context, state) => prism(context, state, cylinder.outline(state.box), labelSize(state.box, 18, 0.2)),
};

/** A square-cornered column: bar charts, regions, buildings. */
export const tower: Look = {
  defaultHeight: 80,
  outline: rounded(0),
  draw: (context, state) => prism(context, state, tower.outline(state.box), labelSize(state.box, 14, 0.25)),
};

/** A translucent pane with a glowing edge: a layer you can see through. */
export const glass: Look = {
  defaultHeight: 0,
  outline: rounded(0.12),

  draw(context, state) {
    const { ctx, view, pixelRatio } = context;
    const { box, palette, glow } = state;

    inScreenPixels(ctx, pixelRatio, () => {
      polygon(ctx, projectOutline(glass.outline(box), box.z + box.height, view));
      ctx.fillStyle = `rgba(${palette.glow}, ${0.06 + 0.08 * glow})`;
      ctx.fill();
      halo({ context: ctx, color: palette.glow, alpha: 0.36, radius: 8 * (0.4 + glow), core: 1.3 });
      ctx.strokeStyle = `rgba(${palette.line}, ${0.8 + 0.2 * glow})`;
      ctx.lineWidth = 1.3;
      ctx.stroke();
    });

    label(context, state, labelSize(box, 26, 0.18), 0.6 + 0.4 * glow);
  },
};

/** Just an outline: something that's there but not yours (the app, a boundary). */
export const wire: Look = {
  defaultHeight: 0,
  outline: rounded(0.12),

  draw(context, state) {
    const { ctx, view, pixelRatio } = context;
    const { box, glow } = state;

    inScreenPixels(ctx, pixelRatio, () => {
      polygon(ctx, projectOutline(wire.outline(box), box.z + box.height, view));

      if (glow > 0.01) {
        ctx.fillStyle = `rgba(255, 255, 255, ${0.05 * glow})`;
        ctx.fill();
      }

      ctx.strokeStyle = `rgba(${state.palette.line}, ${0.4 + 0.4 * glow})`;
      ctx.lineWidth = 1.2;
      ctx.stroke();
    });

    label(context, state, labelSize(box, 26, 0.18), 0.5 + 0.4 * glow);
  },
};

function portraitFigure(ctx: CanvasRenderingContext2D, centre: ScreenPoint, radius: number, { palette, glow }: DrawState) {
  ctx.fillStyle = `rgba(${palette.glow}, ${0.12 + glow * 0.16})`;
  ctx.beginPath();
  ctx.arc(centre.x, centre.y, radius, 0, FULL_TURN);
  ctx.fill();

  ctx.fillStyle = `rgba(${palette.line}, ${0.82 + glow * 0.18})`;
  ctx.beginPath();
  ctx.arc(centre.x, centre.y - radius * 0.2, radius * 0.31, 0, FULL_TURN);
  ctx.fill();

  ctx.beginPath();
  ctx.arc(centre.x, centre.y + radius * 0.72, radius * 0.58, Math.PI, 0);
  ctx.lineTo(centre.x + radius * 0.58, centre.y + radius * 0.95);
  ctx.lineTo(centre.x - radius * 0.58, centre.y + radius * 0.95);
  ctx.closePath();
  ctx.fill();
}

function portraitName(ctx: CanvasRenderingContext2D, centre: ScreenPoint, radius: number, state: DrawState) {
  if (!state.label) return;

  ctx.fillStyle = state.palette.text;
  ctx.font = `600 ${Math.max(10, Math.min(14, radius * 0.52))}px ${MONO}`;
  ctx.textAlign = "center";
  ctx.textBaseline = "top";
  ctx.fillText(state.label, centre.x, centre.y + radius * 1.22, radius * 3.6);
}

/** An upright, vector portrait token for people and other named actors. */
export const portrait: Look = {
  defaultHeight: 0,
  outline: oval,

  draw({ ctx, view, pixelRatio }, state) {
    const { box, palette, glow } = state;

    inScreenPixels(ctx, pixelRatio, () => {
      polygon(ctx, projectOutline(portrait.outline(box), box.z + box.height, view));
      ctx.fillStyle = palette.top;
      ctx.fill();
      halo({ context: ctx, color: palette.glow, alpha: 0.6 * (0.35 + glow * 0.35), radius: 11 * (0.4 + glow), core: 1.4 });
      ctx.strokeStyle = `rgba(${palette.line}, ${0.55 + glow * 0.4})`;
      ctx.lineWidth = 1.4;
      ctx.stroke();
    });

    const centre = view.project(box.x + box.width / 2, box.y + box.depth / 2, box.z + box.height + 0.5);
    const radius = Math.max(7, Math.min(box.width, box.depth) * view.scale * 0.32);

    inScreenPixels(ctx, pixelRatio, () => {
      portraitFigure(ctx, centre, radius, state);
      portraitName(ctx, centre, radius, state);
    });
  },
};

function continentPath(ctx: CanvasRenderingContext2D, box: Box3, continent: readonly (readonly [number, number])[]) {
  ctx.beginPath();

  continent.forEach(([x, y], index) => {
    const px = box.x + x * box.width;
    const py = box.y + y * box.depth;

    if (index === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  });

  ctx.closePath();
}

/** A floor plate with simple continents, drawn under other objects. */
export const atlas: Look = {
  defaultHeight: 0,
  background: true,
  outline: floorPlate,

  draw({ ctx, view, pixelRatio }, { box, palette }) {
    onFloor(ctx, view, pixelRatio, box.z, () => {
      polygon(ctx, atlas.outline(box));
      ctx.fillStyle = "rgba(255, 255, 255, 0.025)";
      ctx.fill();
      ctx.strokeStyle = `rgba(${palette.line}, 0.12)`;
      ctx.lineWidth = 1 / (view.scale || 1);
      ctx.stroke();
      ctx.fillStyle = `rgba(${palette.glow}, 0.075)`;
      ctx.strokeStyle = `rgba(${palette.line}, 0.13)`;

      for (const continent of CONTINENTS) {
        continentPath(ctx, box, continent);
        ctx.fill();
        ctx.stroke();
      }
    });
  },
};

function gridLines(ctx: CanvasRenderingContext2D, box: Box3) {
  ctx.beginPath();

  for (let x = box.x + GRID_STEP; x < box.x + box.width; x += GRID_STEP) {
    ctx.moveTo(x, box.y);
    ctx.lineTo(x, box.y + box.depth);
  }

  for (let y = box.y + GRID_STEP; y < box.y + box.depth; y += GRID_STEP) {
    ctx.moveTo(box.x, y);
    ctx.lineTo(box.x + box.width, y);
  }
}

/** A floor with grid lines, for maps and charts. */
export const grid: Look = {
  defaultHeight: 0,
  background: true,
  outline: floorPlate,

  draw({ ctx, view, pixelRatio }, { box, palette }) {
    onFloor(ctx, view, pixelRatio, box.z, () => {
      gridLines(ctx, box);
      ctx.lineWidth = 1 / (view.scale || 1);
      ctx.strokeStyle = `rgba(${palette.line}, 0.12)`;
      ctx.stroke();
    });
  },
};

/** The built-in looks, by name. */
export const looks = { plate, chip, cylinder, tower, glass, wire, portrait, atlas, grid, caption } as const;
export type LookName = keyof typeof looks;
