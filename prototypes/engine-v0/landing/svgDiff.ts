/**
 * svgDiff.ts — name the visual changes between two versions of an SVG, using the keyless matcher on
 * the drawn elements (no ids needed): moved, resized, recoloured, reshaped, text edited, added, removed.
 */
import { hungarian, tokenize, type VNode } from "../correspond";

export interface SvgChange {
  kind: "moved" | "resized" | "recoloured" | "reshaped" | "text" | "added" | "removed";
  a?: number;
  b?: number;
  detail: string;
}

const SHAPES = "path,rect,circle,ellipse,line,polyline,polygon,text";
/** Paint from the SVG's own attributes (inherited from ancestors), not from page CSS, which may restyle it for display. */
function paintOf(el: Element, name: "fill" | "stroke"): number[] {
  let e: Element | null = el;
  while (e && e.tagName.toLowerCase() !== "svg") {
    const v = e.getAttribute(name);
    if (v) return parsePaint(v);
    e = e.parentElement;
  }
  const root = e?.getAttribute(name);
  return root ? parsePaint(root) : name === "fill" ? [0, 0, 0, 1] : [0, 0, 0, 0];
}
function parsePaint(v: string): number[] {
  v = v.trim();
  if (v === "none" || v === "transparent") return [0, 0, 0, 0];
  const h = v.match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i);
  if (h) {
    const x =
      h[1].length === 3
        ? h[1]
            .split("")
            .map((c) => c + c)
            .join("")
        : h[1];
    return [parseInt(x.slice(0, 2), 16), parseInt(x.slice(2, 4), 16), parseInt(x.slice(4, 6), 16), 1];
  }
  return rgba(v);
}
const rgba = (c: string) => {
  const m = c.match(/rgba?\(([^)]+)\)/);
  if (!m) return [0, 0, 0, 0];
  const p = m[1]
    .split(/[ ,/]+/)
    .filter(Boolean)
    .map(Number);
  return [p[0], p[1], p[2], p.length > 3 ? p[3] : 1];
};
const NAMES: Record<string, string> = {
  path: "shape",
  rect: "rectangle",
  circle: "circle",
  ellipse: "ellipse",
  line: "line",
  polyline: "line",
  polygon: "polygon",
  text: "text",
};

export interface SvgScene {
  nodes: VNode[];
  els: SVGGraphicsElement[];
  geo: string[];
}

export function readSvg(svg: SVGSVGElement): SvgScene {
  const sr = svg.getBoundingClientRect();
  const unit = sr.width || 1;
  const els = Array.from(svg.querySelectorAll<SVGGraphicsElement>(SHAPES));
  const nodes: VNode[] = els.map((el, i) => {
    const r = el.getBoundingClientRect();
    const cs = getComputedStyle(el);
    const tag = el.tagName.toLowerCase();
    const raw = tag === "text" ? (el.textContent ?? "").trim() : "";
    return {
      i,
      tag: tag.toUpperCase(),
      kind: tag === "text" ? "text" : "box",
      text: raw.toLowerCase(),
      raw,
      tokens: tokenize(raw),
      sub: tokenize(raw),
      media: "",
      x: (r.left - sr.left) / unit,
      y: (r.top - sr.top) / unit,
      w: r.width / unit,
      h: r.height / unit,
      fg: paintOf(el, "stroke"),
      bg: paintOf(el, "fill"),
      fs: parseFloat(cs.fontSize) || 14,
      fw: 400,
      radius: 0,
      parent: -1,
      depth: 0,
      children: [],
      path: tag + ":" + i,
    };
  });
  const geo = els.map((el) =>
    Array.from(el.attributes)
      .filter((a) => !/^(fill|stroke|style|class|opacity)$/.test(a.name))
      .map((a) => `${a.name}=${a.value}`)
      .sort()
      .join(" "),
  );
  return { nodes, els, geo };
}

const hex = (c: number[]) =>
  c[3] < 0.05
    ? "none"
    : "#" +
      c
        .slice(0, 3)
        .map((v) => Math.round(v).toString(16).padStart(2, "0"))
        .join("");
const colourDist = (p: number[], q: number[]) => Math.hypot(p[0] - q[0], p[1] - q[1], p[2] - q[2], (p[3] - q[3]) * 255);

const FAMILY: Record<string, string> = {
  PATH: "p",
  POLYGON: "p",
  POLYLINE: "l",
  LINE: "l",
  RECT: "r",
  CIRCLE: "c",
  ELLIPSE: "c",
  TEXT: "t",
};
function paintSim(p: number[], q: number[]) {
  if (p[3] < 0.05 && q[3] < 0.05) return 0.5; // both unpainted: no evidence either way
  return 1 - Math.min(1, colourDist(p, q) / 220);
}
/** Similarity of two drawn shapes: same kind, same geometry after a move, paint, position, size. */
function shapeSim(a: VNode, b: VNode) {
  const kind = a.tag === b.tag ? 1 : FAMILY[a.tag] === FAMILY[b.tag] ? 0.8 : 0.2;
  const rw = Math.abs(Math.log((b.w + 1e-4) / (a.w + 1e-4))),
    rh = Math.abs(Math.log((b.h + 1e-4) / (a.h + 1e-4)));
  const same = a.tag === b.tag && rw < 0.02 && rh < 0.02 ? 1 : 0;
  const pos = Math.exp(-Math.hypot(a.x + a.w / 2 - b.x - b.w / 2, a.y + a.h / 2 - b.y - b.h / 2) / 0.15);
  const size = Math.exp(-(rw + rh));
  const text = a.raw || b.raw ? (a.raw === b.raw ? 1 : 0.85) : 1; // an edited label in place is still the label
  return kind * text * (0.25 * paintSim(a.bg, b.bg) + 0.1 * paintSim(a.fg, b.fg) + 0.3 * pos + 0.1 * size + 0.25 * same);
}

/** Pair drawn shapes between two versions: optimal assignment over shapeSim, below `threshold` = unmatched. */
export function matchShapes(An: VNode[], Bn: VNode[], threshold = 0.55) {
  const t0 = performance.now();
  const S = An.map((a) => Bn.map((b) => shapeSim(a, b)));
  const flip = An.length > Bn.length;
  const rows = flip ? Bn.length : An.length,
    cols = flip ? An.length : Bn.length;
  const cost = Array.from({ length: rows }, (_, r) =>
    Array.from({ length: cols }, (_, c) => 1 - Math.max(flip ? S[c][r] : S[r][c], threshold)),
  );
  const to = rows && cols ? hungarian(cost) : [];
  const pairs: { a: number; b: number; score: number }[] = [];
  to.forEach((c, r) => {
    if (c < 0) return;
    const a = flip ? c : r,
      b = flip ? r : c;
    if (S[a][b] >= threshold) pairs.push({ a, b, score: S[a][b] });
  });
  pairs.sort((x, y) => x.b - y.b);
  const ua = new Set(pairs.map((p) => p.a)),
    ub = new Set(pairs.map((p) => p.b));
  return {
    pairs,
    removed: An.map((_, i) => i).filter((i) => !ua.has(i)),
    added: Bn.map((_, j) => j).filter((j) => !ub.has(j)),
    ms: performance.now() - t0,
  };
}

export function diffSvg(A: SvgScene, B: SvgScene, threshold = 0.55) {
  const r = matchShapes(A.nodes, B.nodes, threshold);
  const out: SvgChange[] = [];
  const name = (n: VNode) =>
    n.raw ? `text “${n.raw}”` : `${hex(n.bg) !== "none" ? hex(n.bg) + " " : ""}${NAMES[n.tag.toLowerCase()] ?? "shape"}`;
  for (const p of r.pairs) {
    const a = A.nodes[p.a],
      b = B.nodes[p.b];
    const dx = b.x + b.w / 2 - (a.x + a.w / 2),
      dy = b.y + b.h / 2 - (a.y + a.h / 2);
    const sizeRatio = Math.abs(Math.log((b.w + 1e-3) / (a.w + 1e-3))) + Math.abs(Math.log((b.h + 1e-3) / (a.h + 1e-3)));
    if (a.raw !== b.raw) out.push({ kind: "text", a: p.a, b: p.b, detail: `Text “${a.raw}” → “${b.raw}”` });
    if (colourDist(a.bg, b.bg) > 18 || colourDist(a.fg, b.fg) > 18)
      out.push({
        kind: "recoloured",
        a: p.a,
        b: p.b,
        detail: `${name(a)} recoloured to ${hex(b.bg) !== hex(a.bg) ? hex(b.bg) : hex(b.fg)}`,
      });
    if (sizeRatio > 0.08)
      out.push({
        kind: "resized",
        a: p.a,
        b: p.b,
        detail: `${name(b)} resized ${Math.round(a.w * 320)}×${Math.round(a.h * 320)} → ${Math.round(b.w * 320)}×${Math.round(b.h * 320)}`,
      });
    else if (Math.hypot(dx, dy) > 0.012)
      out.push({ kind: "moved", a: p.a, b: p.b, detail: `${name(b)} moved ${Math.round(Math.hypot(dx, dy) * 320)} units` });
    else if (A.geo[p.a] !== B.geo[p.b] && a.tag !== "TEXT")
      out.push({ kind: "reshaped", a: p.a, b: p.b, detail: `${name(b)} reshaped in place` });
  }
  for (const i of r.removed) out.push({ kind: "removed", a: i, detail: `${name(A.nodes[i])} removed` });
  for (const j of r.added) out.push({ kind: "added", b: j, detail: `${name(B.nodes[j])} added` });
  return { changes: out, result: r };
}

/** Lines that differ between two markups (a plain LCS line diff), i.e. what a code review shows. */
export function textDiffLines(a: string, b: string) {
  const A = a
      .split("\n")
      .map((s) => s.trim())
      .filter(Boolean),
    B = b
      .split("\n")
      .map((s) => s.trim())
      .filter(Boolean);
  const dp = Array.from({ length: A.length + 1 }, () => new Array<number>(B.length + 1).fill(0));
  for (let i = A.length - 1; i >= 0; i--)
    for (let j = B.length - 1; j >= 0; j--) dp[i][j] = A[i] === B[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
  const common = dp[0][0];
  return { removed: A.length - common, added: B.length - common };
}
