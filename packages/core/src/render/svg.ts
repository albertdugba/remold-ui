import type { SubpathLayout } from "../morph/morph";

const VALUES_PER_SEGMENT = 6;

/** Write a packed buffer as SVG path data: `M`, then one `C` per segment, then `Z` if closed. */
export function toPathData(buffer: ArrayLike<number>, layout: readonly SubpathLayout[], precision = 2): string {
  const scale = 10 ** precision;
  const format = (index: number) => String(Math.round(buffer[index]! * scale) / scale);

  const curveAt = (start: number) =>
    `C${format(start)} ${format(start + 1)} ${format(start + 2)} ${format(start + 3)} ${format(start + 4)} ${format(start + 5)}`;

  const subpathData = ({ offset, segments, closed }: SubpathLayout) => {
    const move = `M${format(offset)} ${format(offset + 1)}`;
    const curves = Array.from({ length: segments }, (_, segment) => curveAt(offset + 2 + segment * VALUES_PER_SEGMENT));

    return move + curves.join("") + (closed ? "Z" : "");
  };

  return layout.map(subpathData).join("");
}
