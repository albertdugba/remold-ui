/**
 * quality.ts — measure how good a morph is, and search for a better one.
 * ---------------------------------------------------------------------------
 * Three objective signals, all computed from the plan buffers (no rendering):
 *
 *   travel        mean distance each anchor moves, relative to the canvas diagonal.
 *                 Long travel reads as sliding or spinning instead of transforming.
 *   collapse      for closed shapes: the smallest area reached mid-morph, relative to
 *                 the smaller end shape. Near 0 means the shape pinches to nothing.
 *   intersections self-crossings that appear mid-morph but exist in neither end shape:
 *                 the "twisted ribbon" artefact.
 *
 * They combine into a 0–100 score. bestOfN() tries several matching strategies,
 * scores each and returns them ranked, so a pipeline can pick the winner automatically
 * (or hand the top few to a vision model for a final judgement).
 */
import { createMorph, type Morph, type MorphOptions, type ShapeStyle } from "./engine";

export interface Quality {
  travel: number; // 0..∞, lower is better (fraction of canvas diagonal)
  collapse: number; // 0..1, higher is better
  intersections: number; // extra self-crossings mid-morph, lower is better
  strays: number; // dots left in an end frame that aren't part of the target shape
  score: number; // 0..100
}

type P = [number, number];

/** Sample each subpath of a buffer into polylines (4 points per cubic). */
function polylines(m: Morph, t: number): { pts: P[]; closed: boolean }[] {
  const buf = m.at(t, new Float32Array(m.plan.a.length));
  return m.plan.layout.map((L) => {
    const pts: P[] = [[buf[L.offset], buf[L.offset + 1]]];
    let x0 = buf[L.offset],
      y0 = buf[L.offset + 1];
    for (let j = 0; j < L.segs; j++) {
      const o = L.offset + 2 + j * 6;
      for (let k = 1; k <= 4; k++) {
        const s = k / 4,
          ms = 1 - s;
        const a = ms * ms * ms,
          b = 3 * ms * ms * s,
          c = 3 * ms * s * s,
          d = s * s * s;
        pts.push([a * x0 + b * buf[o] + c * buf[o + 2] + d * buf[o + 4], a * y0 + b * buf[o + 1] + c * buf[o + 3] + d * buf[o + 5]]);
      }
      x0 = buf[o + 4];
      y0 = buf[o + 5];
    }
    return { pts, closed: L.closed };
  });
}

const area = (p: P[]) => {
  let a = 0;
  for (let i = 0; i < p.length; i++) {
    const q = p[(i + 1) % p.length];
    a += p[i][0] * q[1] - q[0] * p[i][1];
  }
  return Math.abs(a / 2);
};

function crossings(p: P[], closed: boolean): number {
  const n = p.length - (closed ? 0 : 1);
  let count = 0;
  const seg = (i: number): [P, P] => [p[i], p[(i + 1) % p.length]];
  for (let i = 0; i < n; i++) {
    const [a, b] = seg(i);
    const minX = Math.min(a[0], b[0]),
      maxX = Math.max(a[0], b[0]),
      minY = Math.min(a[1], b[1]),
      maxY = Math.max(a[1], b[1]);
    for (let j = i + 2; j < n; j++) {
      if (closed && i === 0 && j === n - 1) continue; // neighbours across the seam
      const [c, d] = seg(j);
      if (Math.max(c[0], d[0]) < minX || Math.min(c[0], d[0]) > maxX || Math.max(c[1], d[1]) < minY || Math.min(c[1], d[1]) > maxY)
        continue;
      const d1 = (d[0] - c[0]) * (a[1] - c[1]) - (d[1] - c[1]) * (a[0] - c[0]);
      const d2 = (d[0] - c[0]) * (b[1] - c[1]) - (d[1] - c[1]) * (b[0] - c[0]);
      const d3 = (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]);
      const d4 = (b[0] - a[0]) * (d[1] - a[1]) - (b[1] - a[1]) * (d[0] - a[0]);
      if (d1 * d2 < 0 && d3 * d4 < 0) count++;
    }
  }
  return count;
}

export function measureQuality(m: Morph): Quality {
  const { a, b, layout } = m.plan;
  const [, , vw, vh] = m.viewBox;
  const diag = Math.hypot(vw, vh) || 1;

  // Travel: every anchor and control point moves in a straight line, so travel is |b − a|.
  let travel = 0,
    nPts = 0;
  for (let i = 0; i < a.length; i += 2) {
    travel += Math.hypot(b[i] - a[i], b[i + 1] - a[i + 1]);
    nPts++;
  }
  travel = travel / Math.max(1, nPts) / diag;

  // Collapse and crossings at five interior frames.
  const ends = [polylines(m, 0), polylines(m, 1)];
  const baseCross = layout.map((_, k) =>
    Math.max(crossings(ends[0][k].pts, ends[0][k].closed), crossings(ends[1][k].pts, ends[1][k].closed)),
  );
  const endArea = layout.map((L, k) => (L.closed ? Math.min(area(ends[0][k].pts), area(ends[1][k].pts)) : 0));
  let collapse = 1,
    extra = 0;
  for (const t of [0.2, 0.35, 0.5, 0.65, 0.8]) {
    const mid = polylines(m, t);
    mid.forEach((sp, k) => {
      if (layout[k].closed && endArea[k] > 1e-6) collapse = Math.min(collapse, area(sp.pts) / endArea[k]);
      extra = Math.max(extra, crossings(sp.pts, sp.closed) - baseCross[k]);
    });
  }
  collapse = Math.max(0, Math.min(1, collapse));

  // Strays: a zero-length stroked subpath with round or square caps still paints a dot.
  // It's harmless when it sits on another stroke, a visible artefact when it doesn't.
  let strays = 0;
  [0, 1].forEach((t, side) => {
    const st = m.style(t);
    if (!st.stroke || st.lineCap === "butt") return;
    const sps = ends[side];
    sps.forEach((sp, k) => {
      const [x0, y0] = sp.pts[0];
      if (!sp.pts.every(([x, y]) => Math.abs(x - x0) < 1e-3 && Math.abs(y - y0) < 1e-3)) return;
      const hidden = sps.some(
        (o, j) =>
          j !== k &&
          o.pts.some((p, i) => {
            const q = o.pts[i + 1];
            if (!q) return false;
            const dx = q[0] - p[0],
              dy = q[1] - p[1],
              L2 = dx * dx + dy * dy || 1;
            const u = Math.max(0, Math.min(1, ((x0 - p[0]) * dx + (y0 - p[1]) * dy) / L2));
            return Math.hypot(x0 - (p[0] + u * dx), y0 - (p[1] + u * dy)) <= st.strokeWidth / 2;
          }),
      );
      if (!hidden) strays++;
    });
  });

  const travelScore = 1 - Math.min(1, travel * 2.5);
  const score = Math.max(0, 100 * (0.45 * travelScore + 0.35 * collapse + 0.2 / (1 + extra)) - 12 * strays);
  return { travel, collapse, intersections: Math.max(0, extra), strays, score };
}

export interface Candidate {
  id: string;
  label: string;
  opts: MorphOptions;
  morph: Morph;
  q: Quality;
  /** Other strategies that produced exactly this plan. */ aka: string[];
}

export const STRATEGIES: { id: string; label: string; opts: MorphOptions }[] = [
  { id: "default", label: "Default", opts: {} },
  { id: "order", label: "Document order", opts: { pairing: "order" } },
  { id: "norotate", label: "No start rotation", opts: { rotate: false } },
  { id: "noorient", label: "No direction fix", opts: { orient: false } },
  { id: "collapse", label: "Collapse extras", opts: { padding: "collapse" } },
  { id: "merge", label: "Absorb extras", opts: { padding: "merge" } },
];

/** Try every strategy, score each, and return them best first. */
export function bestOfN(a: string, b: string): Candidate[] {
  const out: Candidate[] = [];
  const byKey = new Map<string, Candidate>();
  for (const s of STRATEGIES) {
    try {
      const morph = createMorph(a, b, s.opts);
      const key = `${morph.plan.a.length}|${Array.from(morph.plan.a).join(",")}|${Array.from(morph.plan.b).join(",")}`;
      const same = byKey.get(key);
      if (same) {
        same.aka.push(s.label);
        continue;
      } // identical plan: merge instead of listing twice
      const c: Candidate = { id: s.id, label: s.label, opts: s.opts, morph, q: measureQuality(morph), aka: [] };
      byKey.set(key, c);
      out.push(c);
    } catch {
      /* strategy not applicable */
    }
  }
  return out.sort((x, y) => y.q.score - x.q.score);
}

/* -------------------------------------------------------------------------- */
/*  Rasterisation (browser): give the agent eyes                               */
/* -------------------------------------------------------------------------- */

/** Draw `frames` evenly spaced frames of a morph side by side onto a canvas. */
export function renderFilmstrip(
  m: Morph,
  opts: { frames?: number; size?: number; ink?: string; paper?: string; label?: string } = {},
): HTMLCanvasElement {
  const frames = opts.frames ?? 6,
    size = opts.size ?? 96,
    pad = 8,
    top = opts.label ? 22 : 0;
  const c = document.createElement("canvas");
  c.width = frames * (size + pad) + pad;
  c.height = size + 2 * pad + top;
  const ctx = c.getContext("2d")!;
  ctx.fillStyle = opts.paper ?? "#ffffff";
  ctx.fillRect(0, 0, c.width, c.height);
  if (opts.label) {
    ctx.fillStyle = "#333";
    ctx.font = "600 14px system-ui, sans-serif";
    ctx.fillText(opts.label, pad, 16);
  }
  const [vx, vy, vw, vh] = m.viewBox;
  const s = (size - 8) / Math.max(vw, vh);
  for (let f = 0; f < frames; f++) {
    const t = frames === 1 ? 0 : f / (frames - 1);
    const st: ShapeStyle = m.style(t);
    const x0 = pad + f * (size + pad),
      y0 = pad + top;
    ctx.save();
    ctx.strokeStyle = "rgba(0,0,0,.08)";
    ctx.strokeRect(x0 + 0.5, y0 + 0.5, size - 1, size - 1);
    ctx.translate(x0 + (size - vw * s) / 2 - vx * s, y0 + (size - vh * s) / 2 - vy * s);
    ctx.scale(s, s);
    const path = new Path2D(m.d(t));
    const color = (v: string | null) => (v === "currentColor" || !v ? opts.ink ?? "#111" : v);
    if (st.fill) {
      ctx.fillStyle = color(st.fill);
      ctx.fill(path, st.fillRule);
    }
    if (st.stroke) {
      ctx.strokeStyle = color(st.stroke);
      ctx.lineWidth = st.strokeWidth;
      ctx.lineCap = st.lineCap;
      ctx.lineJoin = st.lineJoin;
      ctx.stroke(path);
    }
    ctx.restore();
  }
  return c;
}

export const canvasToBlob = (c: HTMLCanvasElement) =>
  new Promise<Blob>((res, rej) => c.toBlob((b) => (b ? res(b) : rej(new Error("Canvas export failed"))), "image/png"));
