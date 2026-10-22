/**
 * glyphs.ts — letters as geometry. Lays out text from glyph outlines (extracted at build time),
 * densifies them so they can bend smoothly, and deforms them with a cursor field each frame.
 */
import GLYPHS from "../generated/glyphs";
import { parsePathData, subdivideTo, subpathsToD, type Subpath } from "../engine";

const G = GLYPHS as unknown as {
  upm: number;
  asc: number;
  desc: number;
  glyphs: Record<string, { d: string; adv: number }>;
  kern: Record<string, number>;
};

export interface TextShape {
  subpaths: Subpath[];
  width: number;
  ascent: number;
  descent: number;
}

/** Outline subpaths for `text` at `size` px, baseline at y = 0, starting at x = 0. */
export function textShape(text: string, size: number, tracking = 0): TextShape {
  const k = size / G.upm;
  const out: Subpath[] = [];
  let x = 0;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    const g = G.glyphs[ch] ?? G.glyphs["?"];
    if (g.d)
      for (const sp of parsePathData(g.d))
        out.push({ ...sp, segs: sp.segs.map((s) => s.map((v, j) => (j % 2 ? v * k : v * k + x)) as typeof s) });
    x += g.adv * k + tracking;
    if (i < text.length - 1) x += (G.kern[ch + text[i + 1]] ?? 0) * k;
  }
  return { subpaths: out, width: x - tracking, ascent: G.asc * k, descent: -G.desc * k };
}

export const shapeD = (s: TextShape) => subpathsToD(s.subpaths, 2);

const segLen = (s: number[]) => Math.hypot(s[6] - s[0], s[7] - s[1]) + 1e-6;

/** Densify so each segment is about `step` px long: enough control points to bend without kinks. */
export function densify(s: TextShape, step = 6): Float32Array[] {
  return s.subpaths.map((sp) => {
    const len = sp.segs.reduce((a, g) => a + segLen(g), 0);
    const d = subdivideTo(sp, Math.max(sp.segs.length, Math.round(len / step)));
    const buf = new Float32Array(d.segs.length * 6 + 2);
    buf[0] = d.segs[0][0];
    buf[1] = d.segs[0][1];
    d.segs.forEach((g, i) => buf.set([g[2], g[3], g[4], g[5], g[6], g[7]], 2 + i * 6));
    return buf;
  });
}

export type Field = "push" | "lens" | "melt";

/** Write deformed copies of `base` into `out`. (cx, cy) is the cursor, r the radius, amt 0..1. */
export function deform(base: Float32Array[], out: Float32Array[], cx: number, cy: number, r: number, amt: number, mode: Field, time = 0) {
  const r2 = r * r;
  for (let p = 0; p < base.length; p++) {
    const b = base[p],
      o = out[p];
    for (let i = 0; i < b.length; i += 2) {
      const x = b[i],
        y = b[i + 1];
      const dx = x - cx,
        dy = y - cy;
      const f = Math.exp(-(dx * dx + dy * dy) / r2) * amt;
      if (mode === "push") {
        const d = Math.hypot(dx, dy) + 1e-3;
        o[i] = x + (dx / d) * f * r * 0.36;
        o[i + 1] = y + (dy / d) * f * r * 0.36;
      } else if (mode === "lens") {
        o[i] = x + dx * f * 0.6;
        o[i + 1] = y + dy * f * 0.6;
      } else {
        o[i] = x + Math.sin(y * 0.06 + time * 3) * f * 10;
        o[i + 1] = y + f * r * 0.5 * (1 + Math.sin(x * 0.05 + time * 2) * 0.3);
      }
    }
  }
}

export function drawBuffers(ctx: CanvasRenderingContext2D, bufs: Float32Array[]) {
  ctx.beginPath();
  for (const b of bufs) {
    ctx.moveTo(b[0], b[1]);
    for (let i = 2; i < b.length; i += 6) ctx.bezierCurveTo(b[i], b[i + 1], b[i + 2], b[i + 3], b[i + 4], b[i + 5]);
    ctx.closePath();
  }
  ctx.fill("nonzero");
}
