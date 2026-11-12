import type { SubpathLayout } from "../morph/morph";

const VALUES_PER_SEGMENT = 6;

export interface PathSink {
  moveTo(x: number, y: number): void;
  bezierCurveTo(c1x: number, c1y: number, c2x: number, c2y: number, x: number, y: number): void;
  closePath(): void;
}

export function drawPath(buffer: ArrayLike<number>, layout: readonly SubpathLayout[], sink: PathSink): void {
  for (const { offset, segments, closed } of layout) {
    sink.moveTo(buffer[offset]!, buffer[offset + 1]!);

    for (let segment = 0; segment < segments; segment++) {
      const start = offset + 2 + segment * VALUES_PER_SEGMENT;

      sink.bezierCurveTo(
        buffer[start]!,
        buffer[start + 1]!,
        buffer[start + 2]!,
        buffer[start + 3]!,
        buffer[start + 4]!,
        buffer[start + 5]!,
      );
    }

    if (closed) sink.closePath();
  }
}
