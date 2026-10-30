import type { NodeMatches, SpringConfig } from "@remold-ui/core";
import type { PageSnapshot, PixelBox } from "../snapshot";
import { createChannel, depthOf, parseOrigin, parseShadow, type MotionChannels, type MotionMode, type MotionRecord } from "./utils";

const PIXEL_PRECISION = 0.1;

export function buildMotionRecords({
  root,
  before,
  after,
  matches,
  previousRecords,
  zoom,
  reduced,
  spring,
  fade,
}: {
  root: HTMLElement;
  before: PageSnapshot;
  after: PageSnapshot;
  matches: NodeMatches;
  previousRecords: ReadonlyMap<HTMLElement, MotionRecord> | undefined;
  zoom: number;
  reduced: boolean;
  spring: SpringConfig;
  fade: SpringConfig;
}): Map<HTMLElement, MotionRecord> {
  const records = new Map<HTMLElement, MotionRecord>();
  const addRecord = ({
    element,
    layout,
    mode,
    channels,
    marks,
  }: {
    element: HTMLElement;
    layout: PixelBox;
    mode: MotionMode;
    channels: MotionChannels;
    marks: string[];
  }): void => {
    for (const mark of marks) element.setAttribute(mark, "");
    records.set(element, {
      el: element,
      mode,
      layout,
      visual: layout,
      channels,
      origin: parseOrigin({ element, box: layout }),
      zoom,
      anchor: null,
      depth: depthOf({ element, root }),
      saved: {
        translate: element.style.translate,
        scale: element.style.scale,
        opacity: element.style.opacity,
        borderRadius: element.style.borderRadius,
        boxShadow: element.style.boxShadow,
      },
      shadow: mode === "box" ? parseShadow(getComputedStyle(element).boxShadow) : null,
      marks,
    });
  };
  const boxChannels = ({
    from,
    to,
    fromRadius,
    toRadius,
    carried,
  }: {
    from: PixelBox;
    to: PixelBox;
    fromRadius: number;
    toRadius: number;
    carried?: MotionRecord;
  }): MotionChannels => {
    const carriedVelocity = (key: "x" | "y" | "width" | "height") => (carried?.mode === "box" ? carried.channels[key]?.velocity ?? 0 : 0);

    if (reduced) {
      return {
        x: createChannel({
          from: to.x,
          to: to.x,
          spring,
          precision: PIXEL_PRECISION,
        }),
        y: createChannel({
          from: to.y,
          to: to.y,
          spring,
          precision: PIXEL_PRECISION,
        }),
        width: createChannel({
          from: to.width,
          to: to.width,
          spring,
          precision: PIXEL_PRECISION,
        }),
        height: createChannel({
          from: to.height,
          to: to.height,
          spring,
          precision: PIXEL_PRECISION,
        }),
      };
    }
    const channels: MotionChannels = {
      x: createChannel({
        from: from.x,
        to: to.x,
        spring,
        precision: PIXEL_PRECISION,
        velocity: carriedVelocity("x"),
      }),
      y: createChannel({
        from: from.y,
        to: to.y,
        spring,
        precision: PIXEL_PRECISION,
        velocity: carriedVelocity("y"),
      }),
      width: createChannel({
        from: from.width,
        to: to.width,
        spring,
        precision: PIXEL_PRECISION,
        velocity: carriedVelocity("width"),
      }),
      height: createChannel({
        from: from.height,
        to: to.height,
        spring,
        precision: PIXEL_PRECISION,
        velocity: carriedVelocity("height"),
      }),
    };
    if (fromRadius > 0 || toRadius > 0)
      channels.radius = createChannel({
        from: fromRadius,
        to: toRadius,
        spring,
        precision: PIXEL_PRECISION,
      });
    return channels;
  };

  for (const pair of matches.pairs) {
    const element = after.elements[pair.to]!;
    const from = before.boxes[pair.from]!;
    const to = after.boxes[pair.to]!;
    const beforeNode = before.nodes[pair.from]!;
    const afterNode = after.nodes[pair.to]!;
    const carried = previousRecords?.get(before.elements[pair.from]!);
    const textChanged = beforeNode.text !== afterNode.text;
    const marks = textChanged ? ["data-rm-matched", "data-rm-changed"] : ["data-rm-matched"];

    if (afterNode.text !== "" && afterNode.kind !== "box" && afterNode.kind !== "media") {
      const fontScale =
        ((beforeNode.fontSize ?? 16) * (carried?.mode === "text" ? carried.channels.scale!.current : 1)) / (afterNode.fontSize ?? 16);
      const channels: MotionChannels = reduced
        ? {
            x: createChannel({
              from: to.x,
              to: to.x,
              spring,
              precision: PIXEL_PRECISION,
            }),
            y: createChannel({
              from: to.y,
              to: to.y,
              spring,
              precision: PIXEL_PRECISION,
            }),
            scale: createChannel({ from: 1, to: 1, spring, precision: 0.001 }),
          }
        : {
            x: createChannel({
              from: from.x,
              to: to.x,
              spring,
              precision: PIXEL_PRECISION,
              velocity: carried?.channels.x?.velocity ?? 0,
            }),
            y: createChannel({
              from: from.y,
              to: to.y,
              spring,
              precision: PIXEL_PRECISION,
              velocity: carried?.channels.y?.velocity ?? 0,
            }),
            scale: createChannel({
              from: fontScale,
              to: 1,
              spring,
              precision: 0.001,
              velocity: carried?.channels.scale?.velocity ?? 0,
            }),
          };
      if (reduced && textChanged)
        channels.opacity = createChannel({
          from: 0,
          to: 1,
          spring: fade,
          precision: 0.004,
        });
      addRecord({ element, layout: to, mode: "text", channels, marks });
    } else {
      const channels = boxChannels({
        from,
        to,
        fromRadius: beforeNode.radius ?? 0,
        toRadius: afterNode.radius ?? 0,
        carried,
      });
      if (reduced && textChanged)
        channels.opacity = createChannel({
          from: 0,
          to: 1,
          spring: fade,
          precision: 0.004,
        });
      addRecord({ element, layout: to, mode: "box", channels, marks });
    }
  }

  const fadeIn = ({ element, from, to }: { element: HTMLElement; from: PixelBox; to: PixelBox }): void => {
    const channels = boxChannels({ from, to, fromRadius: 0, toRadius: 0 });

    channels.opacity = createChannel({
      from: 0,
      to: 1,
      spring: fade,
      precision: 0.004,
    });
    addRecord({
      element,
      layout: to,
      mode: "box",
      channels,
      marks: ["data-rm-changed"],
    });
  };
  for (const split of matches.splits)
    for (const targetIndex of split.to)
      fadeIn({
        element: after.elements[targetIndex]!,
        from: before.boxes[split.from]!,
        to: after.boxes[targetIndex]!,
      });
  for (const merge of matches.merges)
    fadeIn({
      element: after.elements[merge.to]!,
      from: unionBoxes(merge.from.map((index) => before.boxes[index]!)),
      to: after.boxes[merge.to]!,
    });

  const added = new Set(matches.added);

  for (const index of matches.added) {
    if (added.has(after.nodes[index]!.parent)) continue;

    const channels: MotionChannels = {
      opacity: createChannel({
        from: 0,
        to: 1,
        spring: fade,
        precision: 0.004,
      }),
    };
    if (!reduced)
      channels.rise = createChannel({
        from: 10,
        to: 0,
        spring,
        precision: PIXEL_PRECISION,
      });
    addRecord({
      element: after.elements[index]!,
      layout: after.boxes[index]!,
      mode: "enter",
      channels,
      marks: ["data-rm-entering"],
    });
  }
  return records;
}

function unionBoxes(boxes: readonly PixelBox[]): PixelBox {
  const x = Math.min(...boxes.map((box) => box.x));
  const y = Math.min(...boxes.map((box) => box.y));

  return {
    x,
    y,
    width: Math.max(...boxes.map((box) => box.x + box.width)) - x,
    height: Math.max(...boxes.map((box) => box.y + box.height)) - y,
  };
}
