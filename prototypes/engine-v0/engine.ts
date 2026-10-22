/**
 * engine.ts — headless vector morphing core.
 * ---------------------------------------------------------------------------
 * Zero DOM dependencies: runs in browsers, Web Workers, Node, Deno, Bun and
 * edge runtimes. Rendering is the caller's job (SVG `d`, Canvas/Path2D, Skia,
 * a Lottie exporter, a pen plotter...).
 *
 *   createMorph(a, b)  a, b = SVG path data OR full <svg> markup
 *     ├─ toShape()        parse → absolute cubic Béziers, transforms applied
 *     ├─ fit              B mapped into A's viewBox
 *     ├─ buildPlan()      pair subpaths, pad, align direction, subdivide, rotate
 *     └─ Morph            .at(t) Float32Array · .d(t) path data · .style(t)
 *
 * Supported input
 *   Path commands  M L H V C S Q T A Z (absolute + relative, implicit repeats,
 *                  compact numbers like "1.5.5" and arc flags like "a1 1 0 011 1")
 *   SVG elements   svg g path rect(rx/ry) circle ellipse line polyline polygon
 *   Attributes     transform (matrix/translate/scale/rotate/skewX/skewY),
 *                  fill, stroke, stroke-width, stroke-linecap/-linejoin,
 *                  fill-rule, style="", display/visibility, viewBox/width/height
 *   Ignored        defs, clipPath, mask, gradients, filters, text, use, images
 * ---------------------------------------------------------------------------
 */

/* ========================================================================== */
/*  Types                                                                      */
/* ========================================================================== */

/** One cubic segment: P0x, P0y, P1x, P1y, P2x, P2y, P3x, P3y */
export type Seg = [number, number, number, number, number, number, number, number];

export interface Subpath {
  segs: Seg[];
  closed: boolean;
  /** inserted[i]: the START anchor of segs[i] was synthesised by matching (split or padding). */
  inserted: boolean[];
}

/** [minX, minY, width, height] */
export type ViewBox = [number, number, number, number];

export type LineCap = "butt" | "round" | "square";
export type LineJoin = "miter" | "round" | "bevel";

export interface ShapeStyle {
  fill: string | null;
  stroke: string | null;
  strokeWidth: number;
  lineCap: LineCap;
  lineJoin: LineJoin;
  fillRule: "nonzero" | "evenodd";
}

export interface Layer {
  subpaths: Subpath[];
  style: ShapeStyle;
}

export interface Shape {
  subpaths: Subpath[];
  style: ShapeStyle;
  viewBox: ViewBox | null;
}

export interface LayoutEntry {
  /** Float offset of this subpath inside the packed buffer. */
  offset: number;
  segs: number;
  closed: boolean;
  /** Global index of this subpath's first segment (per-anchor flags). */
  segStart: number;
}

export interface MatchStats {
  segsA: number;
  segsB: number;
  subpathsA: number;
  subpathsB: number;
  splitsA: number;
  splitsB: number;
  padded: number;
  directionFlips: number;
  rotations: number[];
  matchedSegs: number;
  floats: number;
}

export interface MorphPlan {
  a: Float32Array;
  b: Float32Array;
  layout: LayoutEntry[];
  insertedA: Uint8Array;
  insertedB: Uint8Array;
  stats: MatchStats;
}

export type Pairing = "auto" | "order";
export type Padding = "auto" | "collapse" | "merge";

export interface MorphOptions {
  /** auto: pair subpaths by position and size. order: pair by document order. */
  pairing?: Pairing;
  /** What an unmatched subpath turns into. collapse: shrink to a point (fills).
   *  merge: shrink onto the nearest point of the other shape's outline (strokes). */
  padding?: Padding;
  /** Map B into A's coordinate box (default true). */
  fit?: boolean;
  /** Rotate closed loops to the start point with least travel (default true). */
  rotate?: boolean;
  /** Align winding / open-path direction (default true). */
  orient?: boolean;
}

export interface Morph {
  plan: MorphPlan;
  viewBox: ViewBox;
  styleA: ShapeStyle;
  styleB: ShapeStyle;
  /** Interpolated coordinates. Writes into `out` (or an internal scratch buffer). */
  at(t: number, out?: Float32Array): Float32Array;
  /** Interpolated SVG path data. */
  d(t: number): string;
  /** Interpolated paint style. */
  style(t: number): ShapeStyle;
}

export const DEFAULT_STYLE: ShapeStyle = {
  fill: "#000000",
  stroke: null,
  strokeWidth: 1,
  lineCap: "butt",
  lineJoin: "miter",
  fillRule: "nonzero",
};

/* ========================================================================== */
/*  1. Path data parser                                                        */
/* ========================================================================== */

const NUM_RE = /[-+]?(?:\d+\.?\d*|\.\d+)(?:[eE][-+]?\d+)?/y;

/** Character scanner that understands SVG's compact number and flag syntax. */
class Scanner {
  i = 0;
  constructor(readonly s: string) {}
  private skip() {
    const s = this.s;
    while (this.i < s.length) {
      const c = s.charCodeAt(this.i);
      // space, tab, CR, LF, FF, comma
      if (c === 32 || c === 9 || c === 10 || c === 13 || c === 12 || c === 44) this.i++;
      else break;
    }
  }
  done(): boolean {
    this.skip();
    return this.i >= this.s.length;
  }
  command(): string | null {
    this.skip();
    const c = this.s[this.i];
    if (c !== undefined && /[A-Za-z]/.test(c)) {
      this.i++;
      return c;
    }
    return null;
  }
  number(): number {
    this.skip();
    NUM_RE.lastIndex = this.i;
    const m = NUM_RE.exec(this.s);
    if (!m) throw new Error(`Path data: expected a number at character ${this.i}`);
    this.i = NUM_RE.lastIndex;
    return parseFloat(m[0]);
  }
  /** Arc flags are a single 0/1 character and may be written without separators. */
  flag(): boolean {
    this.skip();
    const c = this.s[this.i];
    if (c === "0" || c === "1") {
      this.i++;
      return c === "1";
    }
    throw new Error(`Path data: expected an arc flag (0 or 1) at character ${this.i}`);
  }
}

/** A straight line as a cubic: control points at 1/3 and 2/3 of the chord. */
export function lineToCubic(x0: number, y0: number, x3: number, y3: number): Seg {
  const dx = x3 - x0,
    dy = y3 - y0;
  return [x0, y0, x0 + dx / 3, y0 + dy / 3, x0 + (2 * dx) / 3, y0 + (2 * dy) / 3, x3, y3];
}

/** Quadratic → cubic (exact): C1 = P0 + ⅔(Q − P0), C2 = P2 + ⅔(Q − P2). */
function quadToCubic(x0: number, y0: number, qx: number, qy: number, x: number, y: number): Seg {
  return [x0, y0, x0 + (2 / 3) * (qx - x0), y0 + (2 / 3) * (qy - y0), x + (2 / 3) * (qx - x), y + (2 / 3) * (qy - y), x, y];
}

/**
 * Elliptical arc (endpoint form) → cubic Béziers, ≤ 90° each.
 * Follows SVG 1.1 implementation notes F.6.5 (centre conversion) and F.6.6 (radius correction).
 */
export function arcToCubics(
  x1: number,
  y1: number,
  rx: number,
  ry: number,
  rotationDeg: number,
  largeArc: boolean,
  sweep: boolean,
  x2: number,
  y2: number,
): Seg[] {
  if (x1 === x2 && y1 === y2) return [];
  rx = Math.abs(rx);
  ry = Math.abs(ry);
  if (rx === 0 || ry === 0) return [lineToCubic(x1, y1, x2, y2)];

  const phi = (rotationDeg * Math.PI) / 180;
  const cos = Math.cos(phi),
    sin = Math.sin(phi);
  const dx = (x1 - x2) / 2,
    dy = (y1 - y2) / 2;
  const x1p = cos * dx + sin * dy;
  const y1p = -sin * dx + cos * dy;

  // Scale radii up if the endpoints are too far apart for them.
  const lambda = (x1p * x1p) / (rx * rx) + (y1p * y1p) / (ry * ry);
  if (lambda > 1) {
    const s = Math.sqrt(lambda);
    rx *= s;
    ry *= s;
  }
  const rx2 = rx * rx,
    ry2 = ry * ry;
  const num = rx2 * ry2 - rx2 * y1p * y1p - ry2 * x1p * x1p;
  const den = rx2 * y1p * y1p + ry2 * x1p * x1p;
  const coef = (largeArc === sweep ? -1 : 1) * Math.sqrt(Math.max(0, num / den));
  const cxp = (coef * rx * y1p) / ry;
  const cyp = (coef * -ry * x1p) / rx;
  const cx = cos * cxp - sin * cyp + (x1 + x2) / 2;
  const cy = sin * cxp + cos * cyp + (y1 + y2) / 2;

  const angle = (ux: number, uy: number, vx: number, vy: number) => Math.atan2(ux * vy - uy * vx, ux * vx + uy * vy);
  const ux = (x1p - cxp) / rx,
    uy = (y1p - cyp) / ry;
  const vx = (-x1p - cxp) / rx,
    vy = (-y1p - cyp) / ry;
  const theta1 = angle(1, 0, ux, uy);
  let delta = angle(ux, uy, vx, vy);
  if (!sweep && delta > 0) delta -= 2 * Math.PI;
  else if (sweep && delta < 0) delta += 2 * Math.PI;

  const n = Math.max(1, Math.ceil(Math.abs(delta) / (Math.PI / 2) - 1e-9));
  const step = delta / n;
  const k = (4 / 3) * Math.tan(step / 4); // handle length for a unit-circle arc of `step`
  const map = (u: number, v: number): [number, number] => [cx + rx * cos * u - ry * sin * v, cy + rx * sin * u + ry * cos * v];

  const segs: Seg[] = [];
  for (let i = 0; i < n; i++) {
    const a1 = theta1 + i * step,
      a2 = a1 + step;
    const c1 = Math.cos(a1),
      s1 = Math.sin(a1),
      c2 = Math.cos(a2),
      s2 = Math.sin(a2);
    const p0 = map(c1, s1);
    const q1 = map(c1 - k * s1, s1 + k * c1);
    const q2 = map(c2 + k * s2, s2 - k * c2);
    const p3 = map(c2, s2);
    segs.push([p0[0], p0[1], q1[0], q1[1], q2[0], q2[1], p3[0], p3[1]]);
  }
  // Pin exact endpoints so subpaths stay perfectly continuous.
  segs[0][0] = x1;
  segs[0][1] = y1;
  segs[n - 1][6] = x2;
  segs[n - 1][7] = y2;
  return segs;
}

/** Parse SVG path data into subpaths made only of absolute cubic segments. */
export function parsePathData(d: string): Subpath[] {
  const sc = new Scanner(d);
  const out: Subpath[] = [];
  const st = {
    cx: 0,
    cy: 0,
    sx: 0,
    sy: 0,
    cur: null as Subpath | null,
    // Last control point, for S/T reflection.
    lastCtrl: null as null | { x: number; y: number; kind: "C" | "Q" },
  };
  const startSub = (x: number, y: number) => {
    st.cur = { segs: [], closed: false, inserted: [] };
    out.push(st.cur);
    st.sx = st.cx = x;
    st.sy = st.cy = y;
  };
  const push = (seg: Seg) => {
    if (!st.cur) startSub(st.cx, st.cy);
    const sp = st.cur as Subpath;
    sp.segs.push(seg);
    sp.inserted.push(false);
    st.cx = seg[6];
    st.cy = seg[7];
  };

  let cmd = "";
  while (!sc.done()) {
    const next = sc.command();
    if (next) cmd = next;
    else if (!cmd || cmd === "Z" || cmd === "z") throw new Error(`Path data: expected a command at character ${sc.i}`);

    const rel = cmd >= "a";
    const ox = rel ? st.cx : 0,
      oy = rel ? st.cy : 0;
    let ctrl: typeof st.lastCtrl = null;

    switch (cmd.toUpperCase()) {
      case "M":
        startSub(sc.number() + ox, sc.number() + oy);
        cmd = rel ? "l" : "L"; // following pairs are implicit LineTo
        break;
      case "L": {
        const x = sc.number() + ox,
          y = sc.number() + oy;
        push(lineToCubic(st.cx, st.cy, x, y));
        break;
      }
      case "H":
        push(lineToCubic(st.cx, st.cy, sc.number() + ox, st.cy));
        break;
      case "V":
        push(lineToCubic(st.cx, st.cy, st.cx, sc.number() + oy));
        break;
      case "C": {
        const x1 = sc.number() + ox,
          y1 = sc.number() + oy;
        const x2 = sc.number() + ox,
          y2 = sc.number() + oy;
        const x = sc.number() + ox,
          y = sc.number() + oy;
        push([st.cx, st.cy, x1, y1, x2, y2, x, y]);
        ctrl = { x: x2, y: y2, kind: "C" };
        break;
      }
      case "S": {
        const lc = st.lastCtrl;
        const x1 = lc?.kind === "C" ? 2 * st.cx - lc.x : st.cx;
        const y1 = lc?.kind === "C" ? 2 * st.cy - lc.y : st.cy;
        const x2 = sc.number() + ox,
          y2 = sc.number() + oy;
        const x = sc.number() + ox,
          y = sc.number() + oy;
        push([st.cx, st.cy, x1, y1, x2, y2, x, y]);
        ctrl = { x: x2, y: y2, kind: "C" };
        break;
      }
      case "Q": {
        const qx = sc.number() + ox,
          qy = sc.number() + oy;
        const x = sc.number() + ox,
          y = sc.number() + oy;
        push(quadToCubic(st.cx, st.cy, qx, qy, x, y));
        ctrl = { x: qx, y: qy, kind: "Q" };
        break;
      }
      case "T": {
        const lc = st.lastCtrl;
        const qx = lc?.kind === "Q" ? 2 * st.cx - lc.x : st.cx;
        const qy = lc?.kind === "Q" ? 2 * st.cy - lc.y : st.cy;
        const x = sc.number() + ox,
          y = sc.number() + oy;
        push(quadToCubic(st.cx, st.cy, qx, qy, x, y));
        ctrl = { x: qx, y: qy, kind: "Q" };
        break;
      }
      case "A": {
        const rx = sc.number(),
          ry = sc.number(),
          rot = sc.number();
        const large = sc.flag(),
          sweep = sc.flag();
        const x = sc.number() + ox,
          y = sc.number() + oy;
        const segs = arcToCubics(st.cx, st.cy, rx, ry, rot, large, sweep, x, y);
        for (const s of segs) push(s);
        break;
      }
      case "Z": {
        const sp = st.cur;
        if (sp) {
          if (Math.hypot(st.cx - st.sx, st.cy - st.sy) > 1e-6) push(lineToCubic(st.cx, st.cy, st.sx, st.sy));
          sp.closed = true;
        }
        st.cx = st.sx;
        st.cy = st.sy;
        st.cur = null;
        break;
      }
      default:
        throw new Error(`Path data: unsupported command "${cmd}"`);
    }
    st.lastCtrl = ctrl;
  }
  return out.filter((sp) => sp.segs.length > 0);
}

/* ========================================================================== */
/*  2. Affine transforms                                                       */
/* ========================================================================== */

/** [a, b, c, d, e, f] as in SVG's matrix(): x' = a·x + c·y + e, y' = b·x + d·y + f */
export type Mat = [number, number, number, number, number, number];
export const IDENTITY: Mat = [1, 0, 0, 1, 0, 0];

export function multiply(m: Mat, n: Mat): Mat {
  return [
    m[0] * n[0] + m[2] * n[1],
    m[1] * n[0] + m[3] * n[1],
    m[0] * n[2] + m[2] * n[3],
    m[1] * n[2] + m[3] * n[3],
    m[0] * n[4] + m[2] * n[5] + m[4],
    m[1] * n[4] + m[3] * n[5] + m[5],
  ];
}

export function parseTransform(src: string | undefined): Mat {
  let m: Mat = IDENTITY;
  if (!src) return m;
  const re = /(matrix|translate|scale|rotate|skewX|skewY)\s*\(([^)]*)\)/g;
  let hit: RegExpExecArray | null;
  while ((hit = re.exec(src))) {
    const v = hit[2]
      .split(/[\s,]+/)
      .filter(Boolean)
      .map(Number);
    const rad = (deg: number) => (deg * Math.PI) / 180;
    let t: Mat = IDENTITY;
    switch (hit[1]) {
      case "matrix":
        if (v.length === 6) t = v as Mat;
        break;
      case "translate":
        t = [1, 0, 0, 1, v[0] ?? 0, v[1] ?? 0];
        break;
      case "scale":
        t = [v[0] ?? 1, 0, 0, v[1] ?? v[0] ?? 1, 0, 0];
        break;
      case "rotate": {
        const a = rad(v[0] ?? 0),
          c = Math.cos(a),
          s = Math.sin(a);
        t = [c, s, -s, c, 0, 0];
        if (v.length >= 3) t = multiply(multiply([1, 0, 0, 1, v[1], v[2]], t), [1, 0, 0, 1, -v[1], -v[2]]);
        break;
      }
      case "skewX":
        t = [1, 0, Math.tan(rad(v[0] ?? 0)), 1, 0, 0];
        break;
      case "skewY":
        t = [1, Math.tan(rad(v[0] ?? 0)), 0, 1, 0, 0];
        break;
    }
    m = multiply(m, t);
  }
  return m;
}

/** Béziers are affine-invariant: transforming the control points transforms the curve exactly. */
export function transformSubpaths(sps: Subpath[], m: Mat): Subpath[] {
  if (m === IDENTITY) return sps;
  const p = (x: number, y: number): [number, number] => [m[0] * x + m[2] * y + m[4], m[1] * x + m[3] * y + m[5]];
  return sps.map((sp) => ({
    closed: sp.closed,
    inserted: sp.inserted.slice(),
    segs: sp.segs.map((s) => [...p(s[0], s[1]), ...p(s[2], s[3]), ...p(s[4], s[5]), ...p(s[6], s[7])] as Seg),
  }));
}

/* ========================================================================== */
/*  3. SVG markup parser (no DOM required)                                     */
/* ========================================================================== */

type Attrs = Record<string, string>;

const SKIP_TAGS = new Set([
  "defs",
  "clippath",
  "mask",
  "symbol",
  "title",
  "desc",
  "metadata",
  "style",
  "script",
  "lineargradient",
  "radialgradient",
  "pattern",
  "filter",
  "marker",
  "text",
  "foreignobject",
]);

function parseAttrs(src: string): Attrs {
  const out: Attrs = {};
  const re = /([\w:.-]+)\s*=\s*(?:"([^"]*)"|'([^']*)')/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(src))) out[m[1]] = m[2] ?? m[3] ?? "";
  // Inline style declarations override presentation attributes.
  if (out.style) {
    for (const decl of out.style.split(";")) {
      const i = decl.indexOf(":");
      if (i > 0) out[decl.slice(0, i).trim()] = decl.slice(i + 1).trim();
    }
  }
  return out;
}

const num = (v: string | undefined, fallback = 0) => {
  const n = v === undefined ? NaN : parseFloat(v);
  return Number.isFinite(n) ? n : fallback;
};

function paint(v: string | undefined, inherited: string | null): string | null {
  if (v === undefined || v === "inherit") return inherited;
  if (v === "none" || v === "transparent") return null;
  if (v.startsWith("url(")) return "currentColor"; // gradients/patterns: fall back to a flat colour
  return v;
}

function resolveStyle(a: Attrs, parent: ShapeStyle): ShapeStyle {
  const cap = a["stroke-linecap"],
    join = a["stroke-linejoin"],
    rule = a["fill-rule"];
  return {
    fill: paint(a.fill, parent.fill),
    stroke: paint(a.stroke, parent.stroke),
    strokeWidth: a["stroke-width"] !== undefined ? num(a["stroke-width"], parent.strokeWidth) : parent.strokeWidth,
    lineCap: cap === "round" || cap === "square" || cap === "butt" ? cap : parent.lineCap,
    lineJoin: join === "round" || join === "bevel" || join === "miter" ? join : parent.lineJoin,
    fillRule: rule === "evenodd" || rule === "nonzero" ? rule : parent.fillRule,
  };
}

const f = (n: number) => +n.toFixed(4);

/** Basic shapes → equivalent path data. */
function elementPathData(tag: string, a: Attrs): string | null {
  switch (tag) {
    case "path":
      return a.d ?? null;
    case "rect": {
      const x = num(a.x),
        y = num(a.y),
        w = num(a.width),
        h = num(a.height);
      if (w <= 0 || h <= 0) return null;
      let rx = a.rx !== undefined ? num(a.rx) : a.ry !== undefined ? num(a.ry) : 0;
      let ry = a.ry !== undefined ? num(a.ry) : rx;
      rx = Math.min(Math.max(rx, 0), w / 2);
      ry = Math.min(Math.max(ry, 0), h / 2);
      if (!rx || !ry) return `M${x} ${y}H${x + w}V${y + h}H${x}Z`;
      return (
        `M${f(x + rx)} ${y}H${f(x + w - rx)}A${rx} ${ry} 0 0 1 ${x + w} ${f(y + ry)}` +
        `V${f(y + h - ry)}A${rx} ${ry} 0 0 1 ${f(x + w - rx)} ${y + h}` +
        `H${f(x + rx)}A${rx} ${ry} 0 0 1 ${x} ${f(y + h - ry)}` +
        `V${f(y + ry)}A${rx} ${ry} 0 0 1 ${f(x + rx)} ${y}Z`
      );
    }
    case "circle":
    case "ellipse": {
      const cx = num(a.cx),
        cy = num(a.cy);
      const rx = tag === "circle" ? num(a.r) : num(a.rx),
        ry = tag === "circle" ? num(a.r) : num(a.ry);
      if (rx <= 0 || ry <= 0) return null;
      return `M${cx} ${cy - ry}A${rx} ${ry} 0 0 1 ${cx} ${cy + ry}A${rx} ${ry} 0 0 1 ${cx} ${cy - ry}Z`;
    }
    case "line":
      return `M${num(a.x1)} ${num(a.y1)}L${num(a.x2)} ${num(a.y2)}`;
    case "polyline":
    case "polygon": {
      const pts = (a.points ?? "")
        .trim()
        .split(/[\s,]+/)
        .filter(Boolean)
        .map(Number);
      if (pts.length < 4) return null;
      let d = `M${pts[0]} ${pts[1]}`;
      for (let i = 2; i + 1 < pts.length; i += 2) d += `L${pts[i]} ${pts[i + 1]}`;
      return tag === "polygon" ? d + "Z" : d;
    }
  }
  return null;
}

/** Parse SVG markup into drawable layers (one per element), with transforms applied. */
export function parseSVG(markup: string): { viewBox: ViewBox | null; layers: Layer[] } {
  const src = markup
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/<\?[\s\S]*?\?>/g, "")
    .replace(/<!DOCTYPE[^>]*>/gi, "")
    .replace(/<!\[CDATA\[[\s\S]*?\]\]>/g, "");

  interface Ctx {
    tag: string;
    m: Mat;
    style: ShapeStyle;
    hidden: boolean;
  }
  const rootStyle: ShapeStyle = { ...DEFAULT_STYLE };
  const stack: Ctx[] = [{ tag: "#root", m: IDENTITY, style: rootStyle, hidden: false }];
  const layers: Layer[] = [];
  let viewBox: ViewBox | null = null;
  let sawRoot = false;

  const tagRe = /<(\/?)([a-zA-Z][\w:.-]*)([^>]*?)(\/?)>/g;
  let m: RegExpExecArray | null;
  while ((m = tagRe.exec(src))) {
    const [, closing, rawTag, attrSrc, selfClosing] = m;
    const tag = rawTag.toLowerCase().replace(/^svg:/, "");
    if (closing) {
      // Pop to the matching open tag (tolerates sloppy nesting).
      for (let i = stack.length - 1; i > 0; i--) {
        if (stack[i].tag === tag) {
          stack.length = i;
          break;
        }
      }
      continue;
    }
    const parent = stack[stack.length - 1];
    const a = parseAttrs(attrSrc);
    const hidden = parent.hidden || SKIP_TAGS.has(tag) || a.display === "none" || a.visibility === "hidden";
    const style = resolveStyle(a, parent.style);
    let mat = multiply(parent.m, parseTransform(a.transform));

    if (tag === "svg" && !sawRoot) {
      sawRoot = true;
      const vb = (a.viewBox ?? "")
        .split(/[\s,]+/)
        .filter(Boolean)
        .map(Number);
      if (vb.length === 4 && vb[2] > 0 && vb[3] > 0) viewBox = [vb[0], vb[1], vb[2], vb[3]];
      else if (a.width && a.height) viewBox = [0, 0, num(a.width), num(a.height)];
      mat = parent.m; // root svg transform is ignored, like browsers do
    }

    if (!hidden) {
      const d = elementPathData(tag, a);
      if (d) {
        const subpaths = transformSubpaths(parsePathData(d), mat);
        const scale = Math.sqrt(Math.abs(mat[0] * mat[3] - mat[1] * mat[2])) || 1;
        if (subpaths.length) layers.push({ subpaths, style: { ...style, strokeWidth: style.strokeWidth * scale } });
      }
    }
    if (!selfClosing) stack.push({ tag, m: mat, style, hidden });
  }
  return { viewBox, layers };
}

/** Parse path data or SVG markup into one shape. Layers are merged; the first layer's paint wins. */
export function toShape(input: string): Shape {
  if (/^\s*</.test(input)) {
    const doc = parseSVG(input);
    const subpaths = doc.layers.flatMap((l) => l.subpaths);
    if (!subpaths.length) throw new Error("No drawable geometry found in the SVG");
    return { subpaths, style: doc.layers[0].style, viewBox: doc.viewBox };
  }
  const subpaths = parsePathData(input);
  if (!subpaths.length) throw new Error("Path data contains no segments");
  return { subpaths, style: { ...DEFAULT_STYLE, fill: "currentColor" }, viewBox: null };
}

/* ========================================================================== */
/*  4. Geometry helpers                                                        */
/* ========================================================================== */

/** De Casteljau split at t. Both halves trace exactly the original curve. */
export function splitCubic(s: Seg, t = 0.5): [Seg, Seg] {
  const [x0, y0, x1, y1, x2, y2, x3, y3] = s;
  const l = (a: number, b: number) => a + (b - a) * t;
  const x01 = l(x0, x1),
    y01 = l(y0, y1),
    x12 = l(x1, x2),
    y12 = l(y1, y2),
    x23 = l(x2, x3),
    y23 = l(y2, y3);
  const x012 = l(x01, x12),
    y012 = l(y01, y12),
    x123 = l(x12, x23),
    y123 = l(y12, y23);
  const x = l(x012, x123),
    y = l(y012, y123);
  return [
    [x0, y0, x01, y01, x012, y012, x, y],
    [x, y, x123, y123, x23, y23, x3, y3],
  ];
}

export function cubicPoint(s: Seg, t: number): [number, number] {
  const mt = 1 - t;
  const a = mt * mt * mt,
    b = 3 * mt * mt * t,
    c = 3 * mt * t * t,
    e = t * t * t;
  return [a * s[0] + b * s[2] + c * s[4] + e * s[6], a * s[1] + b * s[3] + c * s[5] + e * s[7]];
}

/** Control-polygon length: a cheap upper bound on arc length, used to rank segments. */
function segWeight(s: Seg): number {
  return Math.hypot(s[2] - s[0], s[3] - s[1]) + Math.hypot(s[4] - s[2], s[5] - s[3]) + Math.hypot(s[6] - s[4], s[7] - s[5]);
}

function samples(sp: Subpath): [number, number][] {
  const pts: [number, number][] = [];
  for (const s of sp.segs) for (let k = 0; k < 4; k++) pts.push(cubicPoint(s, k / 4));
  if (!sp.closed) {
    const l = sp.segs[sp.segs.length - 1];
    pts.push([l[6], l[7]]);
  }
  return pts;
}

/** Signed area (shoelace). Positive = clockwise in SVG's y-down space. */
export function signedArea(sp: Subpath): number {
  const p = samples(sp);
  let a = 0;
  for (let i = 0; i < p.length; i++) {
    const q = p[(i + 1) % p.length];
    a += p[i][0] * q[1] - q[0] * p[i][1];
  }
  return a / 2;
}

export function centroid(sp: Subpath): [number, number] {
  const p = samples(sp);
  let x = 0,
    y = 0;
  for (const q of p) {
    x += q[0];
    y += q[1];
  }
  return [x / p.length, y / p.length];
}

/** Bounding box of all control points (a conservative bound on the curve). */
export function bounds(sps: Subpath[]): ViewBox {
  let x0 = Infinity,
    y0 = Infinity,
    x1 = -Infinity,
    y1 = -Infinity;
  for (const sp of sps)
    for (const s of sp.segs)
      for (let i = 0; i < 8; i += 2) {
        x0 = Math.min(x0, s[i]);
        x1 = Math.max(x1, s[i]);
        y0 = Math.min(y0, s[i + 1]);
        y1 = Math.max(y1, s[i + 1]);
      }
  if (!Number.isFinite(x0)) return [0, 0, 1, 1];
  return [x0, y0, Math.max(x1 - x0, 1e-6), Math.max(y1 - y0, 1e-6)];
}

/** Grow a box to a padded square. */
function squareBox([x, y, w, h]: ViewBox, pad = 0.1): ViewBox {
  const size = Math.max(w, h) * (1 + 2 * pad);
  return [x + w / 2 - size / 2, y + h / 2 - size / 2, size, size];
}

/** Map subpaths from one box into another (uniform scale, centred — like xMidYMid meet). */
export function fitSubpaths(sps: Subpath[], from: ViewBox, to: ViewBox): { subpaths: Subpath[]; scale: number } {
  const s = Math.min(to[2] / from[2], to[3] / from[3]);
  const tx = to[0] + (to[2] - from[2] * s) / 2 - from[0] * s;
  const ty = to[1] + (to[3] - from[3] * s) / 2 - from[1] * s;
  return { subpaths: transformSubpaths(sps, [s, 0, 0, s, tx, ty]), scale: s };
}

/* ========================================================================== */
/*  5. Point matching                                                          */
/* ========================================================================== */

/** Split the longest segment at t = 0.5 until the subpath has `target` segments. Exact: no shape change. */
export function subdivideTo(sp: Subpath, target: number): Subpath {
  const segs = sp.segs.slice(),
    inserted = sp.inserted.slice(),
    w = segs.map(segWeight);
  while (segs.length < target) {
    let idx = 0;
    for (let i = 1; i < w.length; i++) if (w[i] > w[idx]) idx = i;
    const [l, r] = splitCubic(segs[idx], 0.5);
    segs.splice(idx, 1, l, r);
    inserted.splice(idx + 1, 0, true);
    w.splice(idx, 1, segWeight(l), segWeight(r));
  }
  return { segs, closed: sp.closed, inserted };
}

export function reverseSub(sp: Subpath): Subpath {
  const n = sp.segs.length;
  const segs = sp.segs
    .slice()
    .reverse()
    .map((s) => [s[6], s[7], s[4], s[5], s[2], s[3], s[0], s[1]] as Seg);
  // New segment j starts where old segment n−1−j ended, i.e. at the old start of segment n−j.
  const inserted = segs.map((_, j) => (sp.closed ? sp.inserted[(n - j) % n] : j === 0 ? false : sp.inserted[n - j]) ?? false);
  return { segs, closed: sp.closed, inserted };
}

function rotateSub(sp: Subpath, k: number): Subpath {
  if (k === 0) return sp;
  return {
    segs: sp.segs.slice(k).concat(sp.segs.slice(0, k)),
    inserted: sp.inserted.slice(k).concat(sp.inserted.slice(0, k)),
    closed: sp.closed,
  };
}

/** Start offset for closed loop B that minimises Σ|A.anchor[i] − B.anchor[i+k]|². */
function bestRotation(a: Subpath, b: Subpath): number {
  const n = a.segs.length;
  let best = 0,
    bestCost = Infinity;
  for (let k = 0; k < n; k++) {
    let cost = 0;
    for (let i = 0; i < n && cost < bestCost; i++) {
      const sa = a.segs[i],
        sb = b.segs[(i + k) % n];
      cost += (sa[0] - sb[0]) ** 2 + (sa[1] - sb[1]) ** 2;
    }
    if (cost < bestCost) {
      bestCost = cost;
      best = k;
    }
  }
  return best;
}

/** A zero-size subpath at the partner's centroid, so it grows into (or shrinks out of) the partner. */
function collapsedLike(partner: Subpath): Subpath {
  const [x, y] = centroid(partner);
  return { segs: partner.segs.map(() => [x, y, x, y, x, y, x, y] as Seg), closed: partner.closed, inserted: partner.segs.map(() => true) };
}

/** Pair subpaths of A and B. Unmatched entries get `null` on the other side. */
function pairSubpaths(A: Subpath[], B: Subpath[], mode: Pairing): [Subpath | null, Subpath | null][] {
  if (mode === "order") {
    return Array.from({ length: Math.max(A.length, B.length) }, (_, i) => [A[i] ?? null, B[i] ?? null]);
  }
  const feat = (sp: Subpath) => {
    const [x, y, w, h] = bounds([sp]);
    return { c: centroid(sp), size: Math.hypot(w, h) };
  };
  const fa = A.map(feat),
    fb = B.map(feat);
  const cand: { i: number; j: number; cost: number }[] = [];
  for (let i = 0; i < A.length; i++)
    for (let j = 0; j < B.length; j++) {
      const d = Math.hypot(fa[i].c[0] - fb[j].c[0], fa[i].c[1] - fb[j].c[1]);
      cand.push({ i, j, cost: d + 0.5 * Math.abs(fa[i].size - fb[j].size) });
    }
  cand.sort((p, q) => p.cost - q.cost);
  const usedA = new Set<number>(),
    usedB = new Set<number>(),
    pairs = new Map<number, number>();
  for (const { i, j } of cand) {
    if (usedA.has(i) || usedB.has(j)) continue;
    usedA.add(i);
    usedB.add(j);
    pairs.set(i, j);
  }
  const out: [Subpath | null, Subpath | null][] = A.map((a, i) => [a, pairs.has(i) ? B[pairs.get(i)!] : null]);
  B.forEach((b, j) => {
    if (!usedB.has(j)) out.push([null, b]);
  });
  return out;
}

/**
 * A zero-size subpath parked on the closest point of the other shape's outline.
 * An unmatched stroke shrinks onto (or grows out of) a line that is already drawn, so it
 * disappears into it instead of leaving a stray dot or ballooning into a copy.
 */
function absorbedInto(unmatched: Subpath, pool: Subpath[]): Subpath {
  const [tx, ty] = centroid(unmatched);
  let bx = pool[0].segs[0][0],
    by = pool[0].segs[0][1],
    bestD = Infinity;
  for (const sp of pool)
    for (const s of sp.segs)
      for (let k = 0; k <= 8; k++) {
        const [x, y] = cubicPoint(s, k / 8);
        const d = (x - tx) ** 2 + (y - ty) ** 2;
        if (d < bestD) {
          bestD = d;
          bx = x;
          by = y;
        }
      }
  return {
    segs: unmatched.segs.map(() => [bx, by, bx, by, bx, by, bx, by] as Seg),
    closed: unmatched.closed,
    inserted: unmatched.segs.map(() => true),
  };
}

function writeSub(buf: Float32Array, o: number, sp: Subpath) {
  buf[o] = sp.segs[0][0];
  buf[o + 1] = sp.segs[0][1];
  let p = o + 2;
  for (const s of sp.segs) {
    buf[p] = s[2];
    buf[p + 1] = s[3];
    buf[p + 2] = s[4];
    buf[p + 3] = s[5];
    buf[p + 4] = s[6];
    buf[p + 5] = s[7];
    p += 6;
  }
}

/** Build two Float32Arrays with identical layout, ready for a straight per-frame lerp. */
export function emptyStats(A0: Subpath[], B0: Subpath[]): MatchStats {
  const count = (s: Subpath[]) => s.reduce((n, sp) => n + sp.segs.length, 0);
  return {
    segsA: count(A0),
    segsB: count(B0),
    subpathsA: A0.length,
    subpathsB: B0.length,
    splitsA: 0,
    splitsB: 0,
    padded: 0,
    directionFlips: 0,
    rotations: [],
    matchedSegs: 0,
    floats: 0,
  };
}

export function buildPlan(
  A0: Subpath[],
  B0: Subpath[],
  opts: { pairing?: Pairing; padding?: "collapse" | "merge"; rotate?: boolean; orient?: boolean } = {},
): MorphPlan {
  const padding = opts.padding ?? "collapse";
  const doRotate = opts.rotate !== false,
    doOrient = opts.orient !== false;
  const stats = emptyStats(A0, B0);
  if (!A0.length || !B0.length) throw new Error("Both shapes need at least one segment");

  const A: Subpath[] = [],
    B: Subpath[] = [];
  for (const [pa, pb] of pairSubpaths(A0, B0, opts.pairing ?? "auto")) {
    let a = pa,
      b = pb;
    if (!a) {
      a = padding === "merge" ? absorbedInto(b!, A0) : collapsedLike(b!);
      stats.padded++;
    }
    if (!b) {
      b = padding === "merge" ? absorbedInto(a, B0) : collapsedLike(a);
      stats.padded++;
    }

    const bothClosed = a.closed && b.closed;
    if (!doOrient) {
      /* keep source direction */
    } else if (bothClosed) {
      // Same winding, so points travel round the same way.
      const aa = signedArea(a),
        ab = signedArea(b);
      if (Math.abs(aa) > 1e-6 && Math.abs(ab) > 1e-6 && Math.sign(aa) !== Math.sign(ab)) {
        b = reverseSub(b);
        stats.directionFlips++;
      }
    } else {
      // Open paths: run B in whichever direction keeps endpoints closest.
      const as = a.segs[0],
        ae = a.segs[a.segs.length - 1],
        bs = b.segs[0],
        be = b.segs[b.segs.length - 1];
      const same = Math.hypot(as[0] - bs[0], as[1] - bs[1]) + Math.hypot(ae[6] - be[6], ae[7] - be[7]);
      const flipped = Math.hypot(as[0] - be[6], as[1] - be[7]) + Math.hypot(ae[6] - bs[0], ae[7] - bs[1]);
      if (flipped < same - 1e-9) {
        b = reverseSub(b);
        stats.directionFlips++;
      }
    }

    if (a.segs.length < b.segs.length) {
      stats.splitsA += b.segs.length - a.segs.length;
      a = subdivideTo(a, b.segs.length);
    } else if (b.segs.length < a.segs.length) {
      stats.splitsB += a.segs.length - b.segs.length;
      b = subdivideTo(b, a.segs.length);
    }

    let k = 0;
    if (bothClosed && doRotate) {
      k = bestRotation(a, b);
      b = rotateSub(b, k);
    }
    stats.rotations.push(k);

    A.push({ ...a, closed: bothClosed });
    B.push({ ...b, closed: bothClosed });
  }
  return packPlan(A, B, stats);
}

/** Write matched subpath lists (same count, same segment counts per pair) into twin Float32Arrays. */
export function packPlan(A: Subpath[], B: Subpath[], stats: MatchStats): MorphPlan {
  const layout: LayoutEntry[] = [];
  let floats = 0,
    segCursor = 0;
  for (const a of A) {
    layout.push({ offset: floats, segs: a.segs.length, closed: a.closed, segStart: segCursor });
    floats += 2 + 6 * a.segs.length;
    segCursor += a.segs.length;
  }
  const a = new Float32Array(floats),
    b = new Float32Array(floats);
  const insertedA = new Uint8Array(segCursor),
    insertedB = new Uint8Array(segCursor);
  layout.forEach((L, i) => {
    writeSub(a, L.offset, A[i]);
    writeSub(b, L.offset, B[i]);
    A[i].inserted.forEach((v, j) => (insertedA[L.segStart + j] = v ? 1 : 0));
    B[i].inserted.forEach((v, j) => (insertedB[L.segStart + j] = v ? 1 : 0));
  });
  stats.matchedSegs = segCursor;
  stats.floats = floats;
  return { a, b, layout, insertedA, insertedB, stats };
}

/* ========================================================================== */
/*  6. Hot path                                                                */
/* ========================================================================== */

/** The whole morph, per frame: one linear pass over a flat typed array. */
export function lerpBuffers(a: Float32Array, b: Float32Array, t: number, out: Float32Array) {
  for (let i = 0, n = out.length; i < n; i++) out[i] = a[i] + (b[i] - a[i]) * t;
}

const fmt = (n: number) => (Math.round(n * 100) / 100).toString();

/** Buffer → SVG path data. Same command structure for every t (required by SMIL, CSS and Lottie). */
export function toPathData(buf: Float32Array, layout: LayoutEntry[]): string {
  const parts: string[] = [];
  for (const L of layout) {
    let o = L.offset;
    parts.push(`M${fmt(buf[o])} ${fmt(buf[o + 1])}`);
    o += 2;
    for (let j = 0; j < L.segs; j++, o += 6) {
      parts.push(`C${fmt(buf[o])} ${fmt(buf[o + 1])} ${fmt(buf[o + 2])} ${fmt(buf[o + 3])} ${fmt(buf[o + 4])} ${fmt(buf[o + 5])}`);
    }
    if (L.closed) parts.push("Z");
  }
  return parts.join("");
}

/** Anything with the CanvasPath drawing methods: Path2D, CanvasRenderingContext2D, skia-canvas, a plotter driver… */
export interface PathSink {
  moveTo(x: number, y: number): void;
  bezierCurveTo(c1x: number, c1y: number, c2x: number, c2y: number, x: number, y: number): void;
  closePath(): void;
}

/** Buffer → any path sink, with no string round-trip. */
export function drawToSink(buf: Float32Array, layout: LayoutEntry[], sink: PathSink) {
  for (const L of layout) {
    let o = L.offset;
    sink.moveTo(buf[o], buf[o + 1]);
    o += 2;
    for (let j = 0; j < L.segs; j++, o += 6) sink.bezierCurveTo(buf[o], buf[o + 1], buf[o + 2], buf[o + 3], buf[o + 4], buf[o + 5]);
    if (L.closed) sink.closePath();
  }
}

export const easeInOutCubic = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

/* ========================================================================== */
/*  7. Style interpolation                                                     */
/* ========================================================================== */

export function parseColor(c: string | null): [number, number, number, number] | null {
  if (!c) return null;
  let m = /^#([0-9a-f]{3,8})$/i.exec(c.trim());
  if (m) {
    let h = m[1];
    if (h.length === 3 || h.length === 4)
      h = h
        .split("")
        .map((x) => x + x)
        .join("");
    const n = parseInt(h.slice(0, 6), 16);
    const alpha = h.length === 8 ? parseInt(h.slice(6, 8), 16) / 255 : 1;
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255, alpha];
  }
  m = /^rgba?\(([^)]+)\)$/i.exec(c.trim());
  if (m) {
    const v = m[1]
      .split(/[\s,/]+/)
      .filter(Boolean)
      .map(parseFloat);
    if (v.length >= 3) return [v[0], v[1], v[2], v[3] ?? 1];
  }
  return null;
}

function lerpColor(a: string | null, b: string | null, t: number): string | null {
  const ca = parseColor(a),
    cb = parseColor(b);
  if (ca && cb) {
    const v = ca.map((x, i) => x + (cb[i] - x) * t);
    return `rgba(${Math.round(v[0])},${Math.round(v[1])},${Math.round(v[2])},${+v[3].toFixed(3)})`;
  }
  return t < 0.5 ? a : b;
}

export function lerpStyle(a: ShapeStyle, b: ShapeStyle, t: number): ShapeStyle {
  const near = t < 0.5 ? a : b;
  return {
    fill: lerpColor(a.fill, b.fill, t),
    stroke: lerpColor(a.stroke, b.stroke, t),
    strokeWidth: a.strokeWidth + (b.strokeWidth - a.strokeWidth) * t,
    lineCap: near.lineCap,
    lineJoin: near.lineJoin,
    fillRule: near.fillRule,
  };
}

/* ========================================================================== */
/*  8. Public API                                                              */
/* ========================================================================== */

/**
 * Prepare a morph between two shapes. Expensive work happens here, once.
 *
 *   const m = createMorph(svgA, svgB);
 *   path.setAttribute("d", m.d(0.5));
 */
export function createMorph(a: string | Shape, b: string | Shape, opts: MorphOptions = {}): Morph {
  const A = typeof a === "string" ? toShape(a) : a;
  const B = typeof b === "string" ? toShape(b) : b;
  let sa = A.subpaths,
    sb = B.subpaths;
  const styleA = { ...A.style },
    styleB = { ...B.style };
  let viewBox: ViewBox;

  if (opts.fit === false) {
    viewBox = A.viewBox ?? B.viewBox ?? squareBox(bounds([...sa, ...sb]));
  } else if (A.viewBox && B.viewBox) {
    const r = fitSubpaths(sb, B.viewBox, A.viewBox);
    sb = r.subpaths;
    styleB.strokeWidth *= r.scale;
    viewBox = A.viewBox;
  } else if (A.viewBox) {
    const r = fitSubpaths(sb, squareBox(bounds(sb)), A.viewBox);
    sb = r.subpaths;
    styleB.strokeWidth *= r.scale;
    viewBox = A.viewBox;
  } else if (B.viewBox) {
    const r = fitSubpaths(sa, squareBox(bounds(sa)), B.viewBox);
    sa = r.subpaths;
    styleA.strokeWidth *= r.scale;
    viewBox = B.viewBox;
  } else {
    viewBox = squareBox(bounds([...sa, ...sb]));
  }

  const strokeOnly = !!styleA.stroke && !styleA.fill;
  const padding = !opts.padding || opts.padding === "auto" ? (strokeOnly ? "merge" : "collapse") : opts.padding;
  const plan = buildPlan(sa, sb, { pairing: opts.pairing, padding, rotate: opts.rotate, orient: opts.orient });
  return morphFromPlan(plan, viewBox, styleA, styleB);
}

/** Wrap any plan (from buildPlan, a landmark plan, or your own) in the Morph interface. */
export function morphFromPlan(plan: MorphPlan, viewBox: ViewBox, styleA: ShapeStyle, styleB: ShapeStyle): Morph {
  const scratch = new Float32Array(plan.a.length);
  const morph: Morph = {
    plan,
    viewBox,
    styleA,
    styleB,
    at(t, out = scratch) {
      lerpBuffers(plan.a, plan.b, t, out);
      return out;
    },
    d(t) {
      return toPathData(morph.at(t), plan.layout);
    },
    style(t) {
      return lerpStyle(styleA, styleB, t);
    },
  };
  return morph;
}

/** "M×1 · C×4 · Z×1" summary of the raw source commands (for diagnostics). */
export function commandSummary(input: string): string {
  if (/^\s*</.test(input)) {
    const counts = new Map<string, number>();
    for (const m of input.matchAll(/<([a-zA-Z][\w:-]*)/g)) {
      const t = m[1].toLowerCase();
      if (t !== "svg" && t !== "g") counts.set(`<${t}>`, (counts.get(`<${t}>`) ?? 0) + 1);
    }
    return [...counts].map(([k, v]) => `${k}×${v}`).join(" · ");
  }
  const counts = new Map<string, number>();
  for (const c of input.match(/[MLHVCSQTAZmlhvcsqtaz]/g) ?? []) counts.set(c, (counts.get(c) ?? 0) + 1);
  return [...counts].map(([k, v]) => `${k}×${v}`).join(" · ");
}

/* ========================================================================== */
/*  9. Serialisation & point queries                                           */
/* ========================================================================== */

/** True when a cubic's control points lie on its chord (it draws a straight line). */
export function isStraight(s: Seg, eps = 1e-3): boolean {
  const dx = s[6] - s[0],
    dy = s[7] - s[1],
    L = Math.hypot(dx, dy);
  if (L < 1e-9) return Math.hypot(s[2] - s[0], s[3] - s[1]) < eps && Math.hypot(s[4] - s[0], s[5] - s[1]) < eps;
  const off = (x: number, y: number) => Math.abs((x - s[0]) * dy - (y - s[1]) * dx) / L;
  return off(s[2], s[3]) < eps && off(s[4], s[5]) < eps;
}

/** Compact, human-readable path data: straight cubics become L, curves stay C. */
export function subpathsToD(sps: Subpath[], precision = 2): string {
  const k = 10 ** precision;
  const r = (n: number) => (Math.round(n * k) / k).toString();
  return sps
    .map((sp) => {
      let d = `M${r(sp.segs[0][0])} ${r(sp.segs[0][1])}`;
      sp.segs.forEach((s, i) => {
        const last = i === sp.segs.length - 1;
        if (last && sp.closed && isStraight(s)) return; // Z draws the closing line
        d += isStraight(s) ? `L${r(s[6])} ${r(s[7])}` : `C${r(s[2])} ${r(s[3])} ${r(s[4])} ${r(s[5])} ${r(s[6])} ${r(s[7])}`;
      });
      return sp.closed ? d + "Z" : d;
    })
    .join("");
}

/** Closest point on a subpath: segment index, curve parameter and distance. */
export function nearestOnSubpath(sp: Subpath, x: number, y: number): { seg: number; t: number; x: number; y: number; d: number } {
  let best = { seg: 0, t: 0, x: sp.segs[0][0], y: sp.segs[0][1], d: Infinity };
  sp.segs.forEach((s, i) => {
    for (let k = 0; k <= 24; k++) {
      const [px, py] = cubicPoint(s, k / 24),
        d = Math.hypot(px - x, py - y);
      if (d < best.d) best = { seg: i, t: k / 24, x: px, y: py, d };
    }
  });
  // Refine the parameter by bisection-style narrowing around the best sample.
  let lo = Math.max(0, best.t - 1 / 24),
    hi = Math.min(1, best.t + 1 / 24);
  const s = sp.segs[best.seg];
  for (let it = 0; it < 20; it++) {
    const m1 = lo + (hi - lo) / 3,
      m2 = hi - (hi - lo) / 3;
    const p1 = cubicPoint(s, m1),
      p2 = cubicPoint(s, m2);
    if (Math.hypot(p1[0] - x, p1[1] - y) < Math.hypot(p2[0] - x, p2[1] - y)) hi = m2;
    else lo = m1;
  }
  const t = (lo + hi) / 2,
    p = cubicPoint(s, t);
  return { seg: best.seg, t, x: p[0], y: p[1], d: Math.hypot(p[0] - x, p[1] - y) };
}

/** Insert an anchor at (seg, t). Returns the new subpath and the anchor's index. */
export function splitSubpathAt(sp: Subpath, seg: number, t: number): { sp: Subpath; index: number } {
  const n = sp.segs.length;
  if (t < 1e-3) return { sp, index: seg };
  if (t > 1 - 1e-3) return { sp, index: sp.closed ? (seg + 1) % n : seg + 1 };
  const [l, r] = splitCubic(sp.segs[seg], t);
  const segs = sp.segs.slice(),
    inserted = sp.inserted.slice();
  segs.splice(seg, 1, l, r);
  inserted.splice(seg + 1, 0, true);
  return { sp: { segs, closed: sp.closed, inserted }, index: seg + 1 };
}

/* ========================================================================== */
/*  10. Semantic correspondence: landmark-constrained matching                 */
/* ========================================================================== */

export interface Landmark {
  a: [number, number];
  b: [number, number];
  label?: string;
}

/**
 * Morph two closed outlines so that each landmark on A lands on its partner on B
 * (head → head, tail → tail). Both outlines are split at the landmarks, rotated so the first
 * landmark is the start point, and each section between consecutive landmarks is matched
 * on its own.
 *
 * Direction comes from the landmarks, not from winding: both orientations of B are tried and
 * the one that keeps more pins in a consistent order wins. A mirrored correspondence (a fish
 * facing left becoming a bird facing right) therefore turns over instead of sliding through
 * itself. Pins that still disagree with the order are dropped and reported.
 */
export function buildLandmarkPlan(
  a0: Subpath,
  b0: Subpath,
  pins: Landmark[],
): { plan: MorphPlan; used: Landmark[]; dropped: Landmark[]; mirrored: boolean } {
  if (!a0.closed || !b0.closed) throw new Error("Landmarks need closed outlines");
  if (!pins.length) throw new Error("Add at least one landmark pair");
  const sameWinding = Math.sign(signedArea(a0)) === Math.sign(signedArea(b0));
  const tries = [attempt(a0, b0, pins), attempt(a0, reverseSub(b0), pins)];
  // Prefer more pins kept; on a tie prefer the orientation that matches winding.
  const pick = tries[0].used.length !== tries[1].used.length ? (tries[0].used.length > tries[1].used.length ? 0 : 1) : sameWinding ? 0 : 1;
  const r = tries[pick];
  if (pick === 1) r.plan.stats.directionFlips++;
  return { ...r, mirrored: pick === 1 ? sameWinding : !sameWinding };
}

function attempt(a0: Subpath, b0: Subpath, pins: Landmark[]): { plan: MorphPlan; used: Landmark[]; dropped: Landmark[] } {
  let a = a0,
    b = b0;
  const stats = emptyStats([a0], [b0]);

  // Insert anchors at each landmark (on both shapes), remembering their coordinates.
  const anchorA: [number, number][] = [],
    anchorB: [number, number][] = [];
  for (const p of pins) {
    const na = nearestOnSubpath(a, p.a[0], p.a[1]);
    let r = splitSubpathAt(a, na.seg, na.t);
    a = r.sp;
    anchorA.push([a.segs[r.index % a.segs.length][0], a.segs[r.index % a.segs.length][1]]);
    const nb = nearestOnSubpath(b, p.b[0], p.b[1]);
    r = splitSubpathAt(b, nb.seg, nb.t);
    b = r.sp;
    anchorB.push([b.segs[r.index % b.segs.length][0], b.segs[r.index % b.segs.length][1]]);
  }
  const indexOf = (sp: Subpath, pt: [number, number]) => {
    let best = 0,
      bd = Infinity;
    sp.segs.forEach((s, i) => {
      const d = Math.hypot(s[0] - pt[0], s[1] - pt[1]);
      if (d < bd) {
        bd = d;
        best = i;
      }
    });
    return best;
  };
  let entries = pins.map((p, i) => ({ p, ia: indexOf(a, anchorA[i]), ib: indexOf(b, anchorB[i]) }));
  entries.sort((x, y) => x.ia - y.ia);
  // Two pins on the same anchor can't both be honoured.
  entries = entries.filter((e, i) => i === 0 || (e.ia !== entries[i - 1].ia && !entries.slice(0, i).some((q) => q.ib === e.ib)));

  // Keep the largest set of pins whose order around B is cyclically increasing.
  const nb = b.segs.length;
  let keep: typeof entries = entries.slice(0, 1);
  for (let s = 0; s < entries.length; s++) {
    const rot = [...entries.slice(s), ...entries.slice(0, s)],
      base = rot[0].ib,
      k = [rot[0]];
    for (const e of rot.slice(1)) {
      if ((e.ib - base + nb) % nb > (k[k.length - 1].ib - base + nb) % nb) k.push(e);
    }
    if (k.length > keep.length) keep = k;
  }
  const dropped = pins.filter((p) => !keep.some((e) => e.p === p));
  keep.sort((x, y) => x.ia - y.ia);

  // Rotate both so the first landmark is index 0.
  const rot = (sp: Subpath, k: number): Subpath => ({
    segs: sp.segs.slice(k).concat(sp.segs.slice(0, k)),
    inserted: sp.inserted.slice(k).concat(sp.inserted.slice(0, k)),
    closed: true,
  });
  const na = a.segs.length,
    ka = keep[0].ia,
    kb = keep[0].ib;
  a = rot(a, ka);
  b = rot(b, kb);
  const ia = keep.map((e) => (e.ia - ka + na) % na).concat(na);
  const ib = keep.map((e) => (e.ib - kb + nb) % nb).concat(nb);

  // Match each section between landmarks independently, subdividing the shorter side.
  const segsA: Seg[] = [],
    segsB: Seg[] = [],
    insA: boolean[] = [],
    insB: boolean[] = [];
  for (let s = 0; s < keep.length; s++) {
    let secA: Subpath = { segs: a.segs.slice(ia[s], ia[s + 1]), inserted: a.inserted.slice(ia[s], ia[s + 1]), closed: false };
    let secB: Subpath = { segs: b.segs.slice(ib[s], ib[s + 1]), inserted: b.inserted.slice(ib[s], ib[s + 1]), closed: false };
    if (!secA.segs.length || !secB.segs.length) continue;
    if (secA.segs.length < secB.segs.length) {
      stats.splitsA += secB.segs.length - secA.segs.length;
      secA = subdivideTo(secA, secB.segs.length);
    } else if (secB.segs.length < secA.segs.length) {
      stats.splitsB += secA.segs.length - secB.segs.length;
      secB = subdivideTo(secB, secA.segs.length);
    }
    segsA.push(...secA.segs);
    segsB.push(...secB.segs);
    insA.push(...secA.inserted);
    insB.push(...secB.inserted);
  }
  stats.rotations.push(0);
  const plan = packPlan([{ segs: segsA, inserted: insA, closed: true }], [{ segs: segsB, inserted: insB, closed: true }], stats);
  return { plan, used: keep.map((e) => e.p), dropped };
}
