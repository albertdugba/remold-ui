/**
 * staged.ts — a morph's in-between with two speeds: parts with no partner (their target collapses to a
 * point) travel during the first 60%, paired parts reshape over the whole run. Symmetric, so it plays
 * backwards too.
 */
import { toPathData, type Morph } from "../engine";

export function staged(m: Morph) {
  const { a, b, layout } = m.plan;
  const absorbed = layout.map((L) => {
    let x0 = Infinity,
      y0 = Infinity,
      x1 = -Infinity,
      y1 = -Infinity;
    for (let i = L.offset; i < L.offset + 2 + L.segs * 6; i += 2) {
      x0 = Math.min(x0, b[i]);
      x1 = Math.max(x1, b[i]);
      y0 = Math.min(y0, b[i + 1]);
      y1 = Math.max(y1, b[i + 1]);
    }
    return Math.max(x1 - x0, y1 - y0) < 2;
  });
  const out = new Float32Array(a.length);
  const clamp = (v: number) => Math.min(1, Math.max(0, v));
  return (t: number) => {
    layout.forEach((L, k) => {
      const u = absorbed[k] ? clamp(t / 0.6) : clamp((t - 0.08) / 0.92);
      for (let i = L.offset; i < L.offset + 2 + L.segs * 6; i++) out[i] = a[i] + (b[i] - a[i]) * u;
    });
    return toPathData(out, layout);
  };
}
