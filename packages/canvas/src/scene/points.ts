import { matchPoints, type Point3, type SpringConfig } from "@remold-ui/core";
import { channel } from "./objects";
import type { Channel, PointState, PointsOptions } from "./types";

interface PointMotion {
  go: (target: Channel, to: number) => void;
  spring: SpringConfig;
  reduced: boolean;
}

const DEFAULT_POINT_SIZE = 20;

function arrivingPoint(target: Point3, edge: number, { go, spring }: PointMotion): PointState {
  const point: PointState = {
    x: channel(target.x, spring),
    y: channel(target.y, spring),
    z: channel(target.z ?? 0, spring),
    size: channel(0, spring, 0.05),
    leaving: false,
  };

  go(point.size, edge);

  return point;
}

export function updatePoints(points: PointState[], list: readonly Point3[], options: PointsOptions, motion: PointMotion): PointState[] {
  const { go } = motion;
  const edge = options.size ?? DEFAULT_POINT_SIZE;
  const live = points.filter((point) => !point.leaving);
  const heading = live.map((point) => ({ x: point.x.target, y: point.y.target, z: point.z.target }));
  const matches = matchPoints(heading, list, options.match);

  for (const [from, to] of matches.pairs) {
    const point = live[from]!;
    const target = list[to]!;

    go(point.x, target.x);
    go(point.y, target.y);
    go(point.z, target.z ?? 0);
    go(point.size, edge);
  }

  for (const from of matches.leaving) {
    const point = live[from]!;

    point.leaving = true;
    go(point.size, 0);
  }

  const next = [...points, ...matches.arriving.map((to) => arrivingPoint(list[to]!, edge, motion))];

  return motion.reduced ? next.filter((point) => !point.leaving) : next;
}
