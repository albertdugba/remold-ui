/**
 * Packed morph buffers straight into a drawing API, with no string in between.
 */
import type { SubpathLayout } from "../morph/morph";

/**
 * Anything with the canvas path methods: `Path2D`, `CanvasRenderingContext2D`, an
 * `OffscreenCanvas` context, skia-canvas, or your own recorder. Declared here so the core
 * needs no DOM types.
 */
export interface PathSink {
  moveTo(x: number, y: number): void;
  bezierCurveTo(c1x: number, c1y: number, c2x: number, c2y: number, x: number, y: number): void;
  closePath(): void;
}

/** Replay a packed buffer into `sink`. Begin and fill or stroke the path yourself. */
export function drawPath(buffer: ArrayLike<number>, layout: readonly SubpathLayout[], sink: PathSink): void {
  const b = buffer;
  for (const { offset, segments, closed } of layout) {
    sink.moveTo(b[offset]!, b[offset + 1]!);
    for (let s = 0, o = offset + 2; s < segments; s++, o += 6) {
      sink.bezierCurveTo(b[o]!, b[o + 1]!, b[o + 2]!, b[o + 3]!, b[o + 4]!, b[o + 5]!);
    }
    if (closed) sink.closePath();
  }
}
