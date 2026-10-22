/**
 * canvasSemantics.ts — make a 2D canvas legible to the browser without changing the app that draws it.
 *
 * `recordCanvas(canvas)` wraps the context's drawing calls and keeps a scene per frame: text runs with
 * their on-screen boxes, and filled/stroked shapes with bounds and paint. `readChart(scene)` then
 * rebuilds a bar chart from that scene alone: title, legend, categories, value axis and each bar's value.
 */

export interface TextRun {
  text: string;
  x: number;
  y: number;
  w: number;
  h: number;
  size: number;
  angle: number;
  color: string;
  font: string;
}
export interface ShapeRun {
  x: number;
  y: number;
  w: number;
  h: number;
  paint: string;
  op: "fill" | "stroke";
}
export interface Scene {
  texts: TextRun[];
  shapes: ShapeRun[];
  width: number;
  height: number;
  calls: number;
}

type Ctx = CanvasRenderingContext2D;

export function recordCanvas(canvas: HTMLCanvasElement, onFrame: (s: Scene) => void) {
  const ctx = canvas.getContext("2d")! as Ctx & Record<string, unknown>;
  let frame: Scene = { texts: [], shapes: [], width: 0, height: 0, calls: 0 };
  let path: [number, number][] = [];
  let pending = 0;
  const css = () => canvas.getBoundingClientRect().width / canvas.width || 1;
  const tp = (x: number, y: number): [number, number] => {
    const m = ctx.getTransform();
    return [m.a * x + m.c * y + m.e, m.b * x + m.d * y + m.f];
  };
  const flush = () => {
    pending = 0;
    const r = canvas.getBoundingClientRect();
    onFrame({ ...frame, width: r.width, height: r.height });
  };
  const touch = () => {
    frame.calls++;
    if (!pending) pending = requestAnimationFrame(flush);
  };
  const bboxOf = (pts: [number, number][]) => {
    const k = css();
    const xs = pts.map((p) => p[0]),
      ys = pts.map((p) => p[1]);
    const x0 = Math.min(...xs),
      y0 = Math.min(...ys);
    return { x: x0 * k, y: y0 * k, w: (Math.max(...xs) - x0) * k, h: (Math.max(...ys) - y0) * k };
  };
  const paint = (p: unknown) => (typeof p === "string" ? p : "pattern");

  const orig: Record<string, (...a: never[]) => unknown> = {};
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const wrap = (name: string, fn: (...a: any[]) => void) => {
    const o = (ctx as unknown as Record<string, (...a: unknown[]) => unknown>)[name].bind(ctx);
    orig[name] = o as never;
    (ctx as Record<string, unknown>)[name] = (...a: unknown[]) => {
      fn(...(a as never[]));
      return o(...a);
    };
  };

  wrap("clearRect", (x, y, w, h) => {
    const [x0, y0] = tp(x as number, y as number),
      [x1, y1] = tp((x as number) + (w as number), (y as number) + (h as number));
    if (Math.abs(x1 - x0) >= canvas.width - 1 && Math.abs(y1 - y0) >= canvas.height - 1)
      frame = { texts: [], shapes: [], width: 0, height: 0, calls: 0 };
    touch();
  });
  wrap("beginPath", () => {
    path = [];
  });
  wrap("moveTo", (x, y) => {
    path.push(tp(x as number, y as number));
  });
  wrap("lineTo", (x, y) => {
    path.push(tp(x as number, y as number));
  });
  wrap("bezierCurveTo", (a, b, c, d, x, y) => {
    path.push(tp(a as number, b as number), tp(c as number, d as number), tp(x as number, y as number));
  });
  wrap("quadraticCurveTo", (a, b, x, y) => {
    path.push(tp(a as number, b as number), tp(x as number, y as number));
  });
  wrap("rect", (x, y, w, h) => {
    const X = x as number,
      Y = y as number,
      W = w as number,
      H = h as number;
    path.push(tp(X, Y), tp(X + W, Y), tp(X + W, Y + H), tp(X, Y + H));
  });
  if (typeof ctx.roundRect === "function")
    wrap("roundRect", (x, y, w, h) => {
      const X = x as number,
        Y = y as number,
        W = w as number,
        H = h as number;
      path.push(tp(X, Y), tp(X + W, Y + H));
    });
  wrap("arc", (x, y, r) => {
    const X = x as number,
      Y = y as number,
      R = r as number;
    path.push(tp(X - R, Y - R), tp(X + R, Y + R));
  });
  wrap("fill", () => {
    if (path.length) frame.shapes.push({ ...bboxOf(path), paint: paint(ctx.fillStyle), op: "fill" });
    touch();
  });
  wrap("stroke", () => {
    if (path.length) frame.shapes.push({ ...bboxOf(path), paint: paint(ctx.strokeStyle), op: "stroke" });
    touch();
  });
  wrap("fillRect", (x, y, w, h) => {
    const X = x as number,
      Y = y as number,
      W = w as number,
      H = h as number;
    frame.shapes.push({ ...bboxOf([tp(X, Y), tp(X + W, Y + H)]), paint: paint(ctx.fillStyle), op: "fill" });
    touch();
  });
  wrap("strokeRect", (x, y, w, h) => {
    const X = x as number,
      Y = y as number,
      W = w as number,
      H = h as number;
    frame.shapes.push({ ...bboxOf([tp(X, Y), tp(X + W, Y + H)]), paint: paint(ctx.strokeStyle), op: "stroke" });
    touch();
  });
  wrap("fillText", (t, x, y) => {
    const text = String(t);
    if (!text.trim()) return;
    const X = x as number,
      Y = y as number;
    const m = (orig.measureText as unknown as (s: string) => TextMetrics)(text);
    const L = m.actualBoundingBoxLeft,
      R = m.actualBoundingBoxRight,
      A = m.actualBoundingBoxAscent,
      D = m.actualBoundingBoxDescent;
    const corners = [tp(X - L, Y - A), tp(X + R, Y - A), tp(X + R, Y + D), tp(X - L, Y + D)];
    const T = ctx.getTransform();
    const px = parseFloat(ctx.font.match(/([\d.]+)px/)?.[1] ?? "12");
    frame.texts.push({
      text,
      ...bboxOf(corners),
      size: px * Math.hypot(T.a, T.b) * css(),
      angle: Math.atan2(T.b, T.a),
      color: paint(ctx.fillStyle),
      font: ctx.font,
    });
    touch();
  });
  orig.measureText = ctx.measureText.bind(ctx) as never;

  return {
    detach() {
      for (const k of Object.keys(orig)) delete (ctx as Record<string, unknown>)[k];
      cancelAnimationFrame(pending);
    },
  };
}

/* ───────── reading a bar chart back from the scene ───────── */

export interface ChartRead {
  title: string;
  axisTitle: string;
  series: { name: string; color: string }[];
  categories: string[];
  bars: { category: string; series: string; value: number; x: number; y: number; w: number; h: number }[];
  ticks: number;
  fit: { a: number; b: number; r2: number } | null;
}

const num = (s: string) => {
  const m = s.replace(/[,\s]/g, "").match(/^[$€£]?(-?\d+(\.\d+)?)([kKmM%])?$/);
  if (!m) return null;
  return parseFloat(m[1]) * (m[3] === "k" || m[3] === "K" ? 1 : m[3] === "m" || m[3] === "M" ? 1000 : 1);
};
const cx = (r: { x: number; w: number }) => r.x + r.w / 2;
const cy = (r: { y: number; h: number }) => r.y + r.h / 2;

export function readChart(s: Scene): ChartRead | null {
  const texts = s.texts.filter((t) => t.w > 0);
  if (!texts.length) return null;
  // Value axis: numeric labels sharing a right edge, stacked vertically.
  const numeric = texts.filter((t) => num(t.text) !== null && Math.abs(t.angle) < 0.01);
  const groups = new Map<number, TextRun[]>();
  for (const t of numeric) {
    const k = Math.round((t.x + t.w) / 6);
    groups.set(k, [...(groups.get(k) ?? []), t]);
  }
  const axis = [...groups.values()].sort((a, b) => b.length - a.length)[0] ?? [];
  let fit: ChartRead["fit"] = null;
  // Prefer the gridline or tick mark drawn level with each label: it marks the exact value position.
  const levelOf = (t: TextRun) => {
    const line = s.shapes.find((r) => r.op === "stroke" && r.h < 1.5 && r.w > 4 && r.x >= t.x + t.w - 2 && Math.abs(r.y - cy(t)) < 6);
    return line ? line.y : cy(t);
  };
  if (axis.length >= 2) {
    const xs = axis.map(levelOf),
      ys = axis.map((t) => num(t.text)!);
    const mx = xs.reduce((a, b) => a + b, 0) / xs.length,
      my = ys.reduce((a, b) => a + b, 0) / ys.length;
    let sxy = 0,
      sxx = 0,
      syy = 0;
    xs.forEach((x, i) => {
      sxy += (x - mx) * (ys[i] - my);
      sxx += (x - mx) ** 2;
      syy += (ys[i] - my) ** 2;
    });
    const a = sxy / sxx,
      b = my - a * mx;
    fit = { a, b, r2: syy ? (sxy * sxy) / (sxx * syy) : 1 };
  }
  const zeroY = fit ? -fit.b / fit.a : null;
  const axisRight = axis.length ? Math.max(...axis.map((t) => t.x + t.w)) : 0;
  // Bars: filled shapes standing on the zero line, right of the value axis.
  const bars0 = s.shapes.filter(
    (r) =>
      r.op === "fill" &&
      r.w > 2 &&
      r.h > 0.5 &&
      r.x > axisRight &&
      zeroY !== null &&
      Math.abs(r.y + r.h - zeroY) < 2.5 &&
      r.w < s.width * 0.25,
  );
  const seen = new Set<string>();
  const bars1 = bars0.filter((r) => {
    const k = `${Math.round(r.x)}:${Math.round(r.y)}:${Math.round(r.w)}`;
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
  // Category labels: non-numeric texts below the zero line.
  const below = zeroY === null ? [] : texts.filter((t) => t.y > zeroY - 1 && num(t.text) === null && t.y < zeroY + 60);
  const rowY = below.length ? Math.min(...below.map((t) => t.y)) : 0;
  const cats = below.filter((t) => Math.abs(t.y - rowY) < 8).sort((a, b) => a.x - b.x);
  // Legend: a small filled swatch immediately left of a text above the plot.
  const top = bars1.length ? Math.min(...bars1.map((b) => b.y)) : s.height;
  const series: ChartRead["series"] = [];
  for (const t of texts) {
    if (t.y > top || axis.includes(t)) continue;
    const sw = s.shapes.find(
      (r) => r.w < 60 && r.h < 20 && r.w > 4 && Math.abs(cy(r) - cy(t)) < 6 && r.x + r.w <= t.x + 2 && t.x - (r.x + r.w) < 16,
    );
    if (sw && !series.some((x) => x.name === t.text)) series.push({ name: t.text, color: sw.paint });
  }
  const title =
    [...texts].filter((t) => t.y < top && !series.some((x) => x.name === t.text)).sort((a, b) => b.size - a.size)[0]?.text ?? "";
  const axisTitle = texts.find((t) => Math.abs(Math.abs(t.angle) - Math.PI / 2) < 0.1)?.text ?? "";
  const nearestCat = (x: number) => cats.reduce((best, c) => (Math.abs(cx(c) - x) < Math.abs(cx(best) - x) ? c : best), cats[0]);
  const bars = bars1
    .map((r) => ({
      category: cats.length ? nearestCat(cx(r)).text : "?",
      series: series.find((x) => x.color === r.paint)?.name ?? r.paint,
      value: fit ? Math.round((fit.a * r.y + fit.b) * 10) / 10 : NaN,
      x: r.x,
      y: r.y,
      w: r.w,
      h: r.h,
    }))
    .sort((a, b) => a.x - b.x);
  return { title, axisTitle, series, categories: cats.map((c) => c.text), bars, ticks: axis.length, fit };
}

export function describeChart(c: ChartRead) {
  if (!c.bars.length) return "Empty chart.";
  const max = c.bars.reduce((a, b) => (b.value > a.value ? b : a));
  const min = c.bars.reduce((a, b) => (b.value < a.value ? b : a));
  const unit = c.axisTitle ? ` (${c.axisTitle})` : "";
  return `Bar chart: ${c.title || "untitled"}${unit}. ${c.series.length} series (${c.series.map((s) => s.name).join(", ")}) across ${
    c.categories.length
  } categories, ${c.categories[0]} to ${c.categories[c.categories.length - 1]}. Highest: ${max.category} ${max.series}, ${
    max.value
  }. Lowest: ${min.category} ${min.series}, ${min.value}.`;
}
