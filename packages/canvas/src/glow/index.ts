/**
 * A cheap stand-in for `shadowBlur`. A real canvas blur runs over the whole shape every time it's
 * drawn, and scenes redraw every frame while anything moves, so a few blurred solids were enough to
 * drop frames while scrolling. Here the current path is stroked a few times instead, widest and
 * faintest first: where the strokes overlap the colour builds up, so it fades out over `radius`
 * like a blur would, for the price of a few ordinary strokes.
 */

/** How many strokes make one halo by default: smooth enough for glows on dark scenes. */
const STEPS = 3;

export interface HaloOptions {
  context: CanvasRenderingContext2D;
  color: string;
  alpha: number;
  radius: number;
  core?: number;
  steps?: number;
}

/**
 * Strokes a soft glow of `radius` CSS pixels around the current path, in `rgb` ("r, g, b") at
 * `alpha` where it's strongest. `core` is the width of the line being glowed (0 for a filled
 * shape, whose fill covers the middle). Wide, soft shadows on light scenes want more `steps`, or
 * the bands show. Leaves the path in place and restores the context.
 */
export function halo({ context, color, alpha, radius, core = 0, steps = STEPS }: HaloOptions): void {
  if (alpha <= 0.002 || radius <= 0.1) return;

  context.save();
  context.lineJoin = "round";
  context.lineCap = "round";
  context.strokeStyle = `rgba(${color}, ${alpha / steps})`;
  for (let i = steps; i >= 1; i--) {
    context.lineWidth = core + (2 * radius * i) / steps;
    context.stroke();
  }
  context.restore();
}
