/**
 * Shape morphing.
 *
 * All the expensive work (parsing, matching, subdividing) happens once in `createMorph`. The
 * result is two `Float32Array`s with the same layout, so each frame is a single pass of lerps
 * over flat memory, fast enough to run thousands of points at 120 frames a second.
 */
import { parsePath } from "../path/parse";
import { toCubics, type Subpath } from "../path/normalize";
import { toPathData } from "../render/svg";
import { matchShapes, type MatchOptions } from "./match";

/** Where one subpath lives in a packed buffer. */
export interface SubpathLayout {
  /** Index of the subpath's first number: its start point's x. */
  offset: number;
  /** Number of cubic segments. Each takes 6 numbers after the 2 for the start point. */
  segments: number;
  closed: boolean;
}

export interface Morph {
  /** Shape A, packed. */
  readonly from: Float32Array;
  /** Shape B, packed with the same layout as `from`. */
  readonly to: Float32Array;
  readonly layout: readonly SubpathLayout[];
  /**
   * The packed shape `t` of the way from A to B. `t` may go below 0 or above 1, so springs
   * can overshoot. Writes into `out` when given; otherwise into one internal buffer that is
   * reused by every call, so copy it if you need to keep it.
   */
  at(t: number, out?: Float32Array): Float32Array;
  /** SVG path data for `at(t)`. */
  d(t: number, precision?: number): string;
}

export type MorphOptions = MatchOptions;

function layoutOf(subpaths: readonly Subpath[]): { layout: SubpathLayout[]; length: number } {
  const layout: SubpathLayout[] = [];
  let length = 0;

  for (const subpath of subpaths) {
    layout.push({ offset: length, segments: subpath.segments.length, closed: subpath.closed });
    length += 2 + 6 * subpath.segments.length;
  }
  return { layout, length };
}

function pack(subpaths: readonly Subpath[], layout: readonly SubpathLayout[], buffer: Float32Array): void {
  subpaths.forEach((subpath, subpathIndex) => {
    let offset = layout[subpathIndex]!.offset;
    const start = subpath.segments[0]!.p0;
    buffer[offset++] = start.x;
    buffer[offset++] = start.y;
    for (const segment of subpath.segments) {
      buffer[offset++] = segment.p1.x;
      buffer[offset++] = segment.p1.y;
      buffer[offset++] = segment.p2.x;
      buffer[offset++] = segment.p2.y;
      buffer[offset++] = segment.p3.x;
      buffer[offset++] = segment.p3.y;
    }
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

/**
 * Prepare a morph between two shapes, given as SVG path data or as subpaths.
 *
 * ```ts
 * const morph = createMorph("M0 0 H10 V10 H0 Z", "M5 0 L10 10 H0 Z");
 * path.setAttribute("d", morph.d(0.5));
 * ```
 */
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
