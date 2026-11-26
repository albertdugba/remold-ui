/**
 * A name as a plain-text ASCII banner for a README or a CLI. The text is drawn into a canvas with
 * one pixel per character cell, squashed to the cell's shape, and each cell's coverage picks its
 * character, from the lightest to the densest.
 */
const MEASURE_SIZE = 100;
const CELL_ASPECT = 0.5;
const BLANK_BELOW = 0.18;

export function asciiBanner(text: string, { columns = 72, characters = ".:-=+*#%@", weight = 900 }: { columns?: number; characters?: string; weight?: number } = {}): string {
  const trimmed = text.trim();
  if (!trimmed || typeof document === "undefined") return "";

  const font = (size: number) => `${weight} ${size}px system-ui, sans-serif`;
  const measure = document.createElement("canvas").getContext("2d");
  if (!measure) return "";
  measure.font = font(MEASURE_SIZE);
  const metrics = measure.measureText(trimmed);
  const width = Math.ceil(metrics.actualBoundingBoxLeft + metrics.actualBoundingBoxRight) + 2;
  const ascent = Math.ceil(metrics.actualBoundingBoxAscent);
  const height = ascent + Math.ceil(metrics.actualBoundingBoxDescent) + 2;

  const scale = columns / width;
  const rows = Math.max(1, Math.ceil(height * scale * CELL_ASPECT));
  const canvas = document.createElement("canvas");
  canvas.width = columns;
  canvas.height = rows;
  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context) return "";
  context.setTransform(scale, 0, 0, scale * CELL_ASPECT, 0, 0);
  context.font = font(MEASURE_SIZE);
  context.fillStyle = "#000";
  context.fillText(trimmed, metrics.actualBoundingBoxLeft + 1, ascent + 1);

  const ramp = [...characters];
  const { data } = context.getImageData(0, 0, columns, rows);
  const lines: string[] = [];
  for (let row = 0; row < rows; row++) {
    let line = "";
    for (let column = 0; column < columns; column++) {
      const coverage = data[(row * columns + column) * 4 + 3]! / 255;
      line += coverage < BLANK_BELOW ? " " : ramp[Math.min(ramp.length - 1, Math.round(((coverage - BLANK_BELOW) / (1 - BLANK_BELOW)) * (ramp.length - 1)))];
    }
    lines.push(line.trimEnd());
  }
  while (lines.length && !lines[0]) lines.shift();
  while (lines.length && !lines.at(-1)) lines.pop();
  return lines.join("\n");
}

/** The banner as a line of JavaScript a CLI can print on start. */
export const cliSplash = (banner: string, tagline: string) =>
  `console.log(${JSON.stringify(tagline.trim() ? `${banner}\n\n${tagline.trim()}` : banner)});`;
