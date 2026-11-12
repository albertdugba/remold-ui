import type { CloudPoint, PointMatches } from "@remold-ui/core";
import type { ParticlePalette, ParticlePoint } from "./types";

export function paletteColors(palette: ParticlePalette): readonly string[] {
  return Array.isArray(palette) ? palette : Object.values(palette);
}

function unknownTone(tone: string, names: readonly string[] | null): RangeError {
  if (!names) {
    return new RangeError(`particles: the tone "${tone}" is a name, which needs a named palette such as { ${tone}: "#f59e0b" }`);
  }

  return new RangeError(`particles: no colour named "${tone}" in the palette (it has ${names.map((name) => `"${name}"`).join(", ")})`);
}

export function withNumericTones(points: readonly ParticlePoint[], palette: ParticlePalette | undefined): CloudPoint[] {
  const names = palette && !Array.isArray(palette) ? Object.keys(palette) : null;
  const last = Math.max((names?.length ?? 1) - 1, 1);

  return points.map((point) => {
    if (typeof point.tone !== "string") return point as CloudPoint;

    const index = names ? names.indexOf(point.tone) : -1;

    if (index < 0) throw unknownTone(point.tone, names);

    return { ...point, tone: index / last };
  });
}

function sideOf(points: readonly ParticlePoint[], axis: "x" | "y" | "z") {
  const values = points.map((point) => point[axis] ?? 0);
  const min = values.length > 0 ? values.reduce((low, value) => Math.min(low, value), Infinity) : 0;
  const max = values.length > 0 ? values.reduce((high, value) => Math.max(high, value), -Infinity) : 0;

  return { values, min, size: max - min };
}

export function flowKeys(points: readonly ParticlePoint[]): number[] {
  if (points.length > 0 && points.every((point) => typeof point.order === "number")) return points.map((point) => point.order!);

  const longest = (["x", "y", "z"] as const).map((axis) => sideOf(points, axis)).reduce((best, side) => (side.size > best.size ? side : best));

  return longest.values.map((value) => (longest.size > 0 ? (value - longest.min) / longest.size : 0));
}

const rank = (keys: readonly number[]) => keys.map((key, index) => ({ key, index })).sort((a, b) => a.key - b.key);

const rankAt = (step: number, length: number, paired: number) =>
  length === paired ? step : Math.floor(((step + 0.5) * length) / paired);

const unused = (ranked: readonly { index: number }[], used: ReadonlySet<number>) =>
  ranked.map(({ index }) => index).filter((index) => !used.has(index)).sort((a, b) => a - b);

export function matchByFlow(fromKeys: readonly number[], toKeys: readonly number[]): PointMatches {
  const from = rank(fromKeys);
  const to = rank(toKeys);
  const paired = Math.min(from.length, to.length);

  const pairs = Array.from({ length: paired }, (_, step): [number, number] => [
    from[rankAt(step, from.length, paired)]!.index,
    to[rankAt(step, to.length, paired)]!.index,
  ]).sort((a, b) => a[0] - b[0]);

  const usedFrom = new Set(pairs.map(([source]) => source));
  const usedTo = new Set(pairs.map(([, target]) => target));

  return {
    pairs,
    leaving: unused(from, usedFrom),
    arriving: unused(to, usedTo),
  };
}
