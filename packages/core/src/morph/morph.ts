import { parsePath } from "../path/parse";
import { toCubics, type Subpath } from "../path/normalize";
import { toPathData } from "../render/svg";
import { matchShapes, type MatchOptions } from "./match";

export interface SubpathLayout {
  offset: number;
  segments: number;
  closed: boolean;
}

export interface Morph {
  readonly from: Float32Array;
  readonly to: Float32Array;
  readonly layout: readonly SubpathLayout[];
  at(t: number, out?: Float32Array): Float32Array;
  d(t: number, precision?: number): string;
}

export type MorphOptions = MatchOptions;

const START_VALUES = 2;
const VALUES_PER_SEGMENT = 6;

const sizeOf = (subpath: Subpath) => START_VALUES + VALUES_PER_SEGMENT * subpath.segments.length;

function layoutOf(subpaths: readonly Subpath[]): { layout: SubpathLayout[]; length: number } {
  const offsets = [0];

  for (const subpath of subpaths) offsets.push(offsets.at(-1)! + sizeOf(subpath));

  return {
    layout: subpaths.map((subpath, index) => ({ offset: offsets[index]!, segments: subpath.segments.length, closed: subpath.closed })),
    length: offsets.at(-1)!,
  };
}

const flatten = (subpath: Subpath) => [
  subpath.segments[0]!.p0,
  ...subpath.segments.flatMap((segment) => [segment.p1, segment.p2, segment.p3]),
];

function pack(subpaths: readonly Subpath[], layout: readonly SubpathLayout[], buffer: Float32Array): void {
  subpaths.forEach((subpath, index) => {
    const values = flatten(subpath).flatMap((point) => [point.x, point.y]);

    buffer.set(values, layout[index]!.offset);
  });
}

export function lerpBuffers({
  from,
  to,
  progress,
  output,
}: {
  from: Float32Array;
  to: Float32Array;
  progress: number;
  output: Float32Array;
}): Float32Array {
  for (let index = 0; index < output.length; index++) output[index] = from[index]! + (to[index]! - from[index]!) * progress;

  return output;
}

const toSubpaths = (shape: string | readonly Subpath[]): readonly Subpath[] =>
  typeof shape === "string" ? toCubics(parsePath(shape)) : shape;

export function createMorph(
  fromShape: string | readonly Subpath[],
  toShape: string | readonly Subpath[],
  options: MorphOptions = {},
): Morph {
  const matched = matchShapes(toSubpaths(fromShape), toSubpaths(toShape), options);
  const { layout, length } = layoutOf(matched.from);
  const from = new Float32Array(length);
  const to = new Float32Array(length);

  pack(matched.from, layout, from);
  pack(matched.to, layout, to);

  const scratch = new Float32Array(length);

  const at = (progress: number, output: Float32Array = scratch): Float32Array => {
    if (output.length !== length) {
      throw new RangeError(`morph.at: out must have length ${length}, got ${output.length}`);
    }

    return lerpBuffers({ from, to, progress, output });
  };

  return {
    from,
    to,
    layout,
    at,
    d: (progress, precision) => toPathData(at(progress), layout, precision),
  };
}
