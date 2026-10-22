/**
 * Packed morph buffers back to SVG path data.
 */
import type { SubpathLayout } from "../morph/morph";

/**
 * Write a packed buffer as SVG path data: `M`, then one `C` per segment, then `Z` if closed.
 * The commands are identical for every frame of a morph, so the output also works with CSS
 * `d: path()` transitions, SMIL and Lottie, which need matching command lists.
 */
export function toPathData(buffer: ArrayLike<number>, layout: readonly SubpathLayout[], precision = 2): string {
  const scale = 10 ** precision;
  const n = (i: number) => String(Math.round(buffer[i]! * scale) / scale);
  let d = "";
  for (const { offset, segments, closed } of layout) {
    d += `M${n(offset)} ${n(offset + 1)}`;
    for (let s = 0, o = offset + 2; s < segments; s++, o += 6) {
      d += `C${n(o)} ${n(o + 1)} ${n(o + 2)} ${n(o + 3)} ${n(o + 4)} ${n(o + 5)}`;
    }
    if (closed) d += "Z";
  }
  return d;
}
