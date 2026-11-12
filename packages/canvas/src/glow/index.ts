
const STEPS = 3;

export interface HaloOptions {
  context: CanvasRenderingContext2D;
  color: string;
  alpha: number;
  radius: number;
  core?: number;
  steps?: number;
}

export function halo({ context, color, alpha, radius, core = 0, steps = STEPS }: HaloOptions): void {
  if (alpha <= 0.002 || radius <= 0.1) return;

  context.save();
  context.lineJoin = "round";
  context.lineCap = "round";
  context.strokeStyle = `rgba(${color}, ${alpha / steps})`;

  for (let step = steps; step >= 1; step--) {
    context.lineWidth = core + (2 * radius * step) / steps;
    context.stroke();
  }

  context.restore();
}
