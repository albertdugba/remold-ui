import { roundedRect } from "../geometry";
import type { Look } from "../object-looks";

export interface CalloutOptions {
  /** Which way the line runs from the point it marks. */
  side?: "left" | "right";
  /** The line's length in CSS pixels. */
  length?: number;
}

const MONO = 'ui-monospace, "SF Mono", Menlo, monospace';
const SANS = '-apple-system, BlinkMacSystemFont, "SF Pro Text", system-ui, sans-serif';
const DEFAULT_LENGTH = 96;

const flatOutline: Look["outline"] = (box) => roundedRect({ x: box.x, y: box.y, width: box.width, depth: box.depth, radius: 0 });

/** A caption that always faces the screen, like a note on a diagram: mono, upper case and spaced out. */
export const caption: Look = {
  defaultHeight: 0,
  passive: true,
  outline: flatOutline,

  draw({ ctx, view, pixelRatio }, { box, label, palette, glow }) {
    if (!label) return;

    const at = view.project(box.x + box.width / 2, box.y + box.depth / 2, box.z + box.height);

    ctx.save();
    ctx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    ctx.font = `500 ${Math.max(10, Math.min(15, 13 * view.scale * 1.6))}px ${MONO}`;

    if ("letterSpacing" in ctx) (ctx as CanvasRenderingContext2D & { letterSpacing: string }).letterSpacing = "0.14em";

    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = palette.text;
    ctx.globalAlpha *= 0.72 + 0.28 * glow;
    ctx.fillText(label.toUpperCase(), at.x, at.y);
    ctx.restore();
  },
};

/** A label on a leader line, like a technical drawing. */
export function callout(options: CalloutOptions = {}): Look {
  const side = options.side ?? "right";
  const length = options.length ?? DEFAULT_LENGTH;

  return {
    defaultHeight: 0,
    passive: true,
    outline: flatOutline,

    draw({ ctx, view, pixelRatio }, { box, label, palette, glow }) {
      if (!label) return;

      const at = view.project(box.x + box.width / 2, box.y + box.depth / 2, box.z + box.height);
      const end = at.x + (side === "right" ? 1 : -1) * length;
      const [title, subtitle] = label.split("\n");

      ctx.save();
      ctx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
      ctx.strokeStyle = `rgba(${palette.line}, ${0.75 + 0.25 * glow})`;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(at.x, at.y);
      ctx.lineTo(end, at.y);
      ctx.stroke();
      ctx.textAlign = side === "right" ? "right" : "left";
      ctx.fillStyle = palette.text;

      if (title) {
        ctx.font = `600 13px ${SANS}`;
        ctx.textBaseline = "bottom";
        ctx.fillText(title, end, at.y - 6);
      }

      if (subtitle) {
        ctx.font = `400 12px ${MONO}`;
        ctx.textBaseline = "top";
        ctx.globalAlpha *= 0.62;
        ctx.fillText(subtitle, end, at.y + 6);
      }

      ctx.restore();
    },
  };
}
