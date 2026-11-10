import type { CloudPoint, PointMatches } from "@remold-ui/core";
import type { ParticlePalette, ParticlePoint } from "./types";

/** A palette's colours, in order: a list as it is, or a named palette's values. */
export function paletteColors(palette: ParticlePalette): readonly string[] {
  return Array.isArray(palette) ? palette : Object.values(palette);
}

/**
 * Points as the cloud takes them: a named tone becomes its colour's place along the palette (0 to
 * 1), so it springs like any other tone.
 */
export function withNumericTones(points: readonly ParticlePoint[], palette: ParticlePalette | undefined): CloudPoint[] {
  const names = palette && !Array.isArray(palette) ? Object.keys(palette) : null;
  const last = Math.max((names?.length ?? 1) - 1, 1);
  return points.map((point) => {
    if (typeof point.tone !== "string") return point as CloudPoint;
    const index = names ? names.indexOf(point.tone) : -1;
    if (index < 0) {
      throw new RangeError(
        names
          ? `particles: no colour named "${point.tone}" in the palette (it has ${names.map((name) => `"${name}"`).join(", ")})`
          : `particles: the tone "${point.tone}" is a name, which needs a named palette such as { ${point.tone}: "#f59e0b" }`,
      );
    }
    return { ...point, tone: index / last };
  });
}

/**
 * Where each point sits along its shape, from 0 to 1: its own `order` if every point has one,
 * otherwise how far it is along the shape's longest side.
 */
export function flowKeys(points: readonly ParticlePoint[]): number[] {
  if (points.length > 0 && points.every((point) => typeof point.order === "number")) return points.map((point) => point.order!);

  const sides = (["x", "y", "z"] as const).map((axis) => {
    const values = points.map((point) => point[axis] ?? 0);
    const min = values.length > 0 ? Math.min(...values) : 0;
    const max = values.length > 0 ? Math.max(...values) : 0;
    return { values, min, size: max - min };
  });
  const longest = sides.reduce((best, side) => (side.size > best.size ? side : best));
  return longest.values.map((value) => (longest.size > 0 ? (value - longest.min) / longest.size : 0));
}

/**
 * Pairs two shapes by where their points sit along them: the first of one with the first of the
 * other, and so on, so a change sweeps through the shape instead of swarming. With different
 * counts, each point of the smaller shape pairs with the point at the same place in the larger.
 */
export function matchByFlow(fromKeys: readonly number[], toKeys: readonly number[]): PointMatches {
  const rank = (keys: readonly number[]) => keys.map((key, index) => ({ key, index })).sort((a, b) => a.key - b.key);
  const from = rank(fromKeys);
  const to = rank(toKeys);
  const paired = Math.min(from.length, to.length);
  const usedFrom = new Uint8Array(from.length);
  const usedTo = new Uint8Array(to.length);
  const pairs: [number, number][] = [];
  for (let step = 0; step < paired; step++) {
    const fromRank = from.length === paired ? step : Math.floor(((step + 0.5) * from.length) / paired);
    const toRank = to.length === paired ? step : Math.floor(((step + 0.5) * to.length) / paired);
    const source = from[fromRank]!.index;
    const target = to[toRank]!.index;
    pairs.push([source, target]);
    usedFrom[source] = 1;
    usedTo[target] = 1;
  }
  pairs.sort((a, b) => a[0] - b[0]);
  return {
    pairs,
    leaving: from.map(({ index }) => index).filter((index) => !usedFrom[index]).sort((a, b) => a - b),
    arriving: to.map(({ index }) => index).filter((index) => !usedTo[index]).sort((a, b) => a - b),
  };
}
