import type { Projector } from "../camera";
import { paintOrder, type Box3 } from "../geometry";
import { looks, type DrawContext, type Palette } from "../object-looks";
import { alphaOf, boxOf, drawStateOf } from "./objects";
import type { ObjectState, PointState } from "./types";

export type Layer = "under" | "over";

interface Item extends Box3 {
  paint: () => void;
  front?: () => void;
}

interface LayerScene {
  objects: readonly ObjectState[];
  points: readonly PointState[];
  pointPalette: Palette;
}

const MIN_ALPHA = 0.01;
const MIN_POINT_SIZE = 0.5;
const HOLD_MARGIN = 0.5;

function paintBackgrounds(target: CanvasRenderingContext2D, context: DrawContext, visible: readonly ObjectState[]) {
  for (const object of visible.filter((candidate) => candidate.look.background)) {
    target.globalAlpha = alphaOf(object);
    object.look.draw(context, drawStateOf(object, boxOf(object)));
  }

  target.globalAlpha = 1;
}

function objectItem(target: CanvasRenderingContext2D, context: DrawContext, object: ObjectState): Item {
  const box = boxOf(object);
  const front = object.look.drawFront?.bind(object.look);

  return {
    ...box,

    paint: () => {
      target.globalAlpha = alphaOf(object);
      object.look.draw(context, drawStateOf(object, box));
    },

    front: front
      ? () => {
          target.globalAlpha = alphaOf(object);
          front(context, drawStateOf(object, box));
        }
      : undefined,
  };
}

function pointItems(target: CanvasRenderingContext2D, context: DrawContext, points: readonly PointState[], palette: Palette): Item[] {
  return points.flatMap((point): Item[] => {
    const size = Math.max(0, point.size.current);

    if (size < MIN_POINT_SIZE) return [];

    const box: Box3 = { x: point.x.current - size / 2, y: point.y.current - size / 2, z: point.z.current, width: size, depth: size, height: size };

    const paint = () => {
      target.globalAlpha = 1;
      looks.tower.draw(context, { box, label: "", palette, glow: 0 });
    };

    return [{ ...box, paint }];
  });
}

function isInside(item: Item, container: Item): boolean {
  const cx = item.x + item.width / 2;
  const cy = item.y + item.depth / 2;
  const withinFloor = cx > container.x && cx < container.x + container.width && cy > container.y && cy < container.y + container.depth;

  return withinFloor && item.z >= container.z - HOLD_MARGIN && item.z < container.z + container.height - HOLD_MARGIN;
}

function holderOf(item: Item, containers: readonly Item[]): Item | null {
  return containers.reduce<Item | null>((best, container) => {
    const smaller = !best || container.width * container.depth < best.width * best.depth;

    return isInside(item, container) && smaller ? container : best;
  }, null);
}

function groupByHolder(items: readonly Item[]): { holder: Map<Item, Item>; held: Map<Item, Item[]> } {
  const containers = items.filter((item) => item.front);
  const holder = new Map<Item, Item>();
  const held = new Map<Item, Item[]>();

  for (const item of items) {
    if (item.front) continue;

    const container = holderOf(item, containers);

    if (container) holder.set(item, container);
  }

  for (const [item, container] of holder) held.set(container, [...(held.get(container) ?? []), item]);

  return { holder, held };
}

function paintInOrder(items: readonly Item[], view: Projector) {
  const { holder, held } = groupByHolder(items);

  for (const item of paintOrder(items.filter((candidate) => !holder.has(candidate)), view)) {
    item.paint();

    const inside = held.get(item);

    if (!inside) continue;

    for (const thing of paintOrder(inside, view)) thing.paint();

    if (item.front) item.front();
  }
}

export function paintLayer(target: CanvasRenderingContext2D, which: Layer, view: Projector, pixelRatio: number, scene: LayerScene): void {
  target.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);

  const context: DrawContext = { ctx: target, view, pixelRatio };
  const visible = scene.objects.filter((object) => alphaOf(object) > MIN_ALPHA);

  if (which === "under") {
    paintBackgrounds(target, context, visible);
    return;
  }

  const items = [
    ...visible.filter((object) => !object.look.background).map((object) => objectItem(target, context, object)),
    ...pointItems(target, context, scene.points, scene.pointPalette),
  ];

  paintInOrder(items, view);
  target.globalAlpha = 1;
}
