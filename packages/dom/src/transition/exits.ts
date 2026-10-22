import type { AnimatedValue, NodeMatches } from "@remold-ui/core";
import { IGNORE_ATTRIBUTE, type PageSnapshot } from "../snapshot";
import { createChannel } from "./utils";

export interface ExitRecord {
  clone: HTMLElement;
  opacity: AnimatedValue;
  scale: AnimatedValue;
}

export function buildExitRecords({
  root,
  before,
  matches,
  clones,
  opacities,
  zoom,
  reduced,
}: {
  root: HTMLElement;
  before: PageSnapshot;
  matches: NodeMatches;
  clones: ReadonlyMap<Element, Element>;
  opacities: readonly number[];
  zoom: number;
  reduced: boolean;
}): { exits: ExitRecord[]; layer: HTMLElement | null } {
  const exits: ExitRecord[] = [];
  let layer: HTMLElement | null = null;
  const removed = removedIndexes(matches);
  for (const index of removed) {
    if (removed.has(before.nodes[index]!.parent)) continue;
    const source = clones.get(before.elements[index]!);
    const box = before.boxes[index]!;
    if (!source || box.width === 0) continue;
    layer ??= createExitLayer(root);
    const clone = createExitClone({
      source,
      box,
      origin: layer.getBoundingClientRect(),
      zoom,
    });
    layer.append(clone);
    exits.push({
      clone,
      opacity: createChannel({
        from: opacities[index]!,
        to: 0,
        spring: { duration: 0.28, bounce: 0 },
        precision: 0.004,
      }),
      scale: createChannel({
        from: 1,
        to: reduced ? 1 : 0.96,
        spring: { duration: 0.28, bounce: 0 },
        precision: 0.001,
      }),
    });
  }
  return { exits, layer };
}

function removedIndexes(matches: NodeMatches): Set<number> {
  return new Set([...matches.removed, ...matches.merges.flatMap((merge) => merge.from), ...matches.splits.map((split) => split.from)]);
}

function createExitLayer(root: HTMLElement): HTMLElement {
  const layer = document.createElement("div");
  layer.setAttribute(IGNORE_ATTRIBUTE, "");
  layer.setAttribute("aria-hidden", "true");
  layer.inert = true;
  Object.assign(layer.style, {
    position: "absolute",
    left: "0",
    top: "0",
    width: "0",
    height: "0",
    pointerEvents: "none",
  });
  root.append(layer);
  return layer;
}

function createExitClone({
  source,
  box,
  origin,
  zoom,
}: {
  source: Element;
  box: { x: number; y: number; width: number; height: number };
  origin: DOMRect;
  zoom: number;
}): HTMLElement {
  const clone = source.cloneNode(true) as HTMLElement;
  clone.setAttribute("data-rm-exiting", "");
  for (const element of [clone, ...clone.querySelectorAll<HTMLElement>("*")]) {
    element.style.removeProperty("translate");
    element.style.removeProperty("scale");
    element.removeAttribute("id");
  }
  Object.assign(clone.style, {
    position: "absolute",
    left: `${(box.x - origin.left) / zoom}px`,
    top: `${(box.y - origin.top) / zoom}px`,
    width: `${box.width / zoom}px`,
    height: `${box.height / zoom}px`,
    maxWidth: "none",
    maxHeight: "none",
    margin: "0",
    boxSizing: "border-box",
    pointerEvents: "none",
  });
  return clone;
}
