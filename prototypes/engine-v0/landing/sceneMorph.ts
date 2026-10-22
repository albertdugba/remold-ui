/**
 * sceneMorph.ts — two static illustrations in, one animation out.
 *
 * Each frame is parsed into drawn parts. Parts are paired with the SVG shape matcher (no ids needed),
 * each pair becomes its own morph (geometry and paint), unpaired parts shrink away or grow in, and the
 * whole scene can be exported as a multi-layer Lottie file with animated colours.
 */
import { createMorph, bounds, parseColor, toShape, type Morph } from "../engine";
import { lottieColor, lottieShapes } from "../exporters";
import { tokenize, type VNode } from "../correspond";
import { matchShapes } from "./svgDiff";

export interface Part {
  kind: "pair" | "out" | "in";
  morph: Morph;
  delay: number;
  span: number;
  label: string;
  z: number;
}
export interface TextPart {
  a?: { x: number; y: number; text: string; attrs: string };
  b?: { x: number; y: number; text: string; attrs: string };
}
export interface SceneMorph {
  viewBox: [number, number, number, number];
  parts: Part[];
  texts: TextPart[];
  pairs: number;
  added: number;
  removed: number;
}

interface Drawn {
  tag: string;
  svg: string;
  node: VNode;
  text?: { x: number; y: number; text: string; attrs: string };
}

const SHAPES = "path,rect,circle,ellipse,line,polyline,polygon,text";

function parse(markup: string): { vb: [number, number, number, number]; drawn: Drawn[] } {
  const doc = new DOMParser().parseFromString(markup, "image/svg+xml");
  const svg = doc.documentElement;
  const vb = (svg.getAttribute("viewBox") ?? "0 0 100 100").split(/[\s,]+/).map(Number) as [number, number, number, number];
  const unit = vb[2];
  const drawn = Array.from(svg.querySelectorAll(SHAPES)).map((el, i): Drawn => {
    const tag = el.tagName.toLowerCase();
    const paint = (n: string) => {
      const c = parseColor(el.getAttribute(n) ?? (n === "fill" ? "#000" : "none"));
      return c ? [c[0], c[1], c[2], c[3]] : [0, 0, 0, 0];
    };
    const base = {
      i,
      tag: tag.toUpperCase(),
      fg: paint("stroke"),
      bg: paint("fill"),
      fs: 14,
      fw: 400,
      radius: 0,
      parent: -1,
      depth: 0,
      children: [],
      path: tag + i,
      media: "",
    };
    if (tag === "text") {
      const x = +(el.getAttribute("x") ?? 0),
        y = +(el.getAttribute("y") ?? 0),
        fs = +(el.getAttribute("font-size") ?? 14);
      const text = (el.textContent ?? "").trim();
      const w = text.length * fs * 0.6;
      const attrs = Array.from(el.attributes)
        .filter((a) => a.name !== "x" && a.name !== "y")
        .map((a) => `${a.name}="${a.value}"`)
        .join(" ");
      return {
        tag,
        svg: "",
        text: { x, y, text, attrs },
        node: {
          ...base,
          kind: "text",
          text: text.toLowerCase(),
          raw: text,
          tokens: tokenize(text),
          sub: tokenize(text),
          x: (x - w / 2) / unit,
          y: (y - fs) / unit,
          w: w / unit,
          h: fs / unit,
        },
      };
    }
    const one = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${vb.join(" ")}">${el.outerHTML.replace(/ xmlns="[^"]*"/, "")}</svg>`;
    const [bx, by, bw, bh] = bounds(toShape(one).subpaths);
    return {
      tag,
      svg: one,
      node: {
        ...base,
        kind: "box",
        text: "",
        raw: "",
        tokens: [],
        sub: [],
        x: (bx - vb[0]) / unit,
        y: (by - vb[1]) / unit,
        w: bw / unit,
        h: bh / unit,
      },
    };
  });
  return { vb, drawn };
}

/** The same part collapsed to a point at its centre, in the same paint, so it can shrink away or grow in. */
function pointOf(d: Drawn, vb: number[]) {
  const n = d.node,
    cx = (n.x + n.w / 2) * vb[2] + vb[0],
    cy = (n.y + n.h / 2) * vb[2] + vb[1];
  const doc = new DOMParser().parseFromString(d.svg, "image/svg+xml");
  const el = doc.documentElement.firstElementChild!;
  // Same paint, zero stroke width: a stroke shrunk to a point would otherwise leave a round-capped dot.
  const keep =
    ["fill", "stroke", "stroke-linecap", "stroke-linejoin"]
      .map((k) => (el.getAttribute(k) ? `${k}="${el.getAttribute(k)}"` : ""))
      .join(" ") + (el.getAttribute("stroke") ? ' stroke-width="0"' : "");
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${vb.join(" ")}"><path d="M${cx} ${cy} h0.01 v0.01 h-0.01 z" ${keep}/></svg>`;
}

export function buildSceneMorph(a: string, b: string): SceneMorph {
  const A = parse(a),
    B = parse(b);
  const vb = A.vb;
  const r = matchShapes(
    A.drawn.map((d) => d.node),
    B.drawn.map((d) => d.node),
  );
  const parts: Part[] = [];
  const texts: TextPart[] = [];
  const order = (y: number) => Math.min(0.3, Math.max(0, y) * 0.35); // top of the picture moves first
  for (const p of r.pairs) {
    const da = A.drawn[p.a],
      db = B.drawn[p.b];
    if (da.text || db.text) {
      texts.push({ a: da.text, b: db.text });
      continue;
    }
    parts.push({
      kind: "pair",
      morph: createMorph(da.svg, db.svg, { fit: false }),
      delay: order(da.node.y) * 0.6,
      span: 0.75,
      label: da.tag,
      z: p.b,
    });
  }
  for (const i of r.removed) {
    const d = A.drawn[i];
    if (d.text) {
      texts.push({ a: d.text });
      continue;
    }
    // Paint order: just below whatever this part sat under in the first frame.
    const above = r.pairs.filter((q) => q.a > i).map((q) => q.b);
    parts.push({
      kind: "out",
      morph: createMorph(d.svg, pointOf(d, vb), { fit: false }),
      delay: 0,
      span: 0.5,
      label: d.tag,
      z: (above.length ? Math.min(...above) : 1e6) - 0.5,
    });
  }
  for (const j of r.added) {
    const d = B.drawn[j];
    if (d.text) {
      texts.push({ b: d.text });
      continue;
    }
    parts.push({ kind: "in", morph: createMorph(pointOf(d, vb), d.svg, { fit: false }), delay: 0.45, span: 0.55, label: d.tag, z: j });
  }
  parts.sort((x, y) => x.z - y.z);
  return { viewBox: vb, parts, texts, pairs: r.pairs.length, added: r.added.length, removed: r.removed.length };
}

/** Local progress of a part at global time t. */
export const local = (p: Part, t: number) => Math.min(1, Math.max(0, (t - p.delay) / p.span));

/** Multi-layer Lottie: one layer per part, with animated path and paint. Text is not included. */
export function sceneToLottie(s: SceneMorph, o: { fps?: number; duration?: number; hold?: number; size?: number } = {}) {
  const fps = o.fps ?? 60,
    dur = o.duration ?? 1.2,
    hold = o.hold ?? 0.8;
  const [, , vw, vh] = s.viewBox;
  const scale = (o.size ?? 640) / Math.max(vw, vh);
  const op = Math.round((2 * dur + 2 * hold) * fps);
  const ease = { o: { x: 0.65, y: 0 }, i: { x: 0.35, y: 1 } };
  const eased = (_k: number) => ({ o: { x: [0.65], y: [0] }, i: { x: [0.35], y: [1] } });
  const layers = s.parts.map((p, idx) => {
    const fIn = Math.round(p.delay * dur * fps),
      fOut = Math.round((p.delay + p.span) * dur * fps);
    const back = Math.round((dur + hold) * fps);
    const k = (f: number) => f; // frame helper kept for readability of the keyframe list
    const A = lottieShapes(p.morph, 0),
      B = lottieShapes(p.morph, 1);
    const shapeKs = (i: number) => ({
      a: 1,
      k: [
        { t: 0, s: [A[i]], ...ease },
        { t: k(fIn), s: [A[i]], ...ease },
        { t: k(fOut), s: [B[i]], ...ease },
        { t: back + fIn, s: [B[i]], ...ease },
        { t: back + fOut, s: [A[i]], ...ease },
        { t: op, s: [A[i]] },
      ],
    });
    const sa = p.morph.style(0),
      sb = p.morph.style(1);
    const colKs = (ca: string | null, cb: string | null) => {
      const x = lottieColor(ca, "#000"),
        y = lottieColor(cb, "#000");
      return x.join() === y.join()
        ? { a: 0, k: x }
        : {
            a: 1,
            k: [
              { t: fIn, s: x, ...eased(0) },
              { t: fOut, s: y, ...eased(0) },
              { t: back + fIn, s: y, ...eased(0) },
              { t: back + fOut, s: x },
            ],
          };
    };
    const paints: object[] = [];
    if (sa.fill || sb.fill)
      paints.push({ ty: "fl", nm: "Fill", c: colKs(sa.fill ?? sb.fill, sb.fill ?? sa.fill), o: { a: 0, k: 100 }, r: 1, bm: 0 });
    if (sa.stroke || sb.stroke)
      paints.push({
        ty: "st",
        nm: "Stroke",
        c: colKs(sa.stroke ?? sb.stroke, sb.stroke ?? sa.stroke),
        o: { a: 0, k: 100 },
        w:
          sa.strokeWidth === sb.strokeWidth
            ? { a: 0, k: sa.strokeWidth }
            : {
                a: 1,
                k: [
                  { t: fIn, s: [sa.strokeWidth], ...eased(0) },
                  { t: fOut, s: [sb.strokeWidth], ...eased(0) },
                  { t: back + fIn, s: [sb.strokeWidth], ...eased(0) },
                  { t: back + fOut, s: [sa.strokeWidth] },
                ],
              },
        lc: 2,
        lj: 2,
        ml: 4,
        bm: 0,
      });
    return {
      ddd: 0,
      ind: idx + 1,
      ty: 4,
      nm: `${p.kind} ${p.label.toLowerCase()} ${idx + 1}`,
      sr: 1,
      ao: 0,
      ip: 0,
      op,
      st: 0,
      bm: 0,
      ks: {
        o: { a: 0, k: 100 },
        r: { a: 0, k: 0 },
        p: { a: 0, k: [0, 0, 0] },
        a: { a: 0, k: [0, 0, 0] },
        s: { a: 0, k: [scale * 100, scale * 100, 100] },
      },
      shapes: [
        {
          ty: "gr",
          nm: "Part",
          np: A.length + paints.length,
          bm: 0,
          it: [
            ...A.map((_, i) => ({ ty: "sh", ind: i, nm: `Path ${i + 1}`, ks: shapeKs(i) })),
            ...paints,
            {
              ty: "tr",
              p: { a: 0, k: [0, 0] },
              a: { a: 0, k: [0, 0] },
              s: { a: 0, k: [100, 100] },
              r: { a: 0, k: 0 },
              o: { a: 0, k: 100 },
              sk: { a: 0, k: 0 },
              sa: { a: 0, k: 0 },
            },
          ],
        },
      ],
    };
  });
  // Lottie draws the first layer on top; parts are in paint order, so reverse.
  return {
    v: "5.7.4",
    fr: fps,
    ip: 0,
    op,
    w: Math.round(vw * scale),
    h: Math.round(vh * scale),
    nm: "scene",
    ddd: 0,
    assets: [],
    markers: [],
    layers: layers.reverse(),
  };
}
