/**
 * correspond.ts — keyless correspondence between two UI states: which old element became which new one.
 *
 * No ids, keys or hand-written names. Each rendered element is reduced to features (kind, own text,
 * subtree text, media hash, geometry, paint, tree position). Pairwise similarity feeds an optimal
 * assignment (Hungarian); a structure pass then rewards pairs whose ancestors and descendants agree,
 * and the assignment is solved again. Leftovers are checked for splits (one became several) and
 * merges (several became one).
 *
 * The matcher itself (`matchNodes`) is DOM-free and works on plain feature lists, so it runs in a
 * worker or on a server against serialised trees. `extractNodes` builds those lists from a live DOM.
 */

export type Kind = "heading" | "text" | "control" | "media" | "box";

export interface VNode {
  i: number;
  tag: string;
  kind: Kind;
  text: string; // own text, lower-cased, whitespace collapsed
  raw: string; // own text as displayed
  tokens: string[]; // own text tokens
  sub: string[]; // tokens of the whole subtree (text and media hashes)
  media: string; // hash for img / svg / background-image, "" if none
  x: number;
  y: number;
  w: number;
  h: number; // in units of root width
  fg: number[];
  bg: number[];
  fs: number;
  fw: number;
  radius: number;
  parent: number; // nearest extracted ancestor, -1 for none
  depth: number;
  children: number[];
  path: string; // tag:index chain from the root, used by the tree-position baseline only
}

export interface MatchOptions {
  threshold?: number;
  kind?: boolean;
  geometry?: boolean;
  style?: boolean;
  structure?: boolean;
  splits?: boolean;
}

export interface MatchPair {
  a: number;
  b: number;
  score: number;
}
export interface MatchResult {
  pairs: MatchPair[];
  splits: { a: number; bs: number[] }[];
  merges: { as: number[]; b: number }[];
  removed: number[];
  added: number[];
  ms: number;
}

/* ───────────────────────────── features ───────────────────────────── */

const norm = (s: string) => s.replace(/\s+/g, " ").trim();
export const tokenize = (s: string) => s.toLowerCase().match(/[\p{L}\p{N}]+/gu) ?? [];

function hash(s: string) {
  let h = 2166136261;
  for (let k = 0; k < s.length; k++) {
    h ^= s.charCodeAt(k);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0).toString(36);
}

function rgba(c: string): number[] {
  const m = c.match(/rgba?\(([^)]+)\)/);
  if (!m) return [0, 0, 0, 0];
  const p = m[1]
    .split(/[ ,/]+/)
    .filter(Boolean)
    .map(Number);
  return [p[0] || 0, p[1] || 0, p[2] || 0, p.length > 3 ? p[3] : 1];
}

const PHRASING = new Set([
  "B",
  "STRONG",
  "I",
  "EM",
  "SMALL",
  "CODE",
  "A",
  "SPAN",
  "MARK",
  "ABBR",
  "TIME",
  "SUB",
  "SUP",
  "BR",
  "KBD",
  "S",
  "U",
]);
const CONTROL = new Set(["BUTTON", "A", "INPUT", "SELECT", "TEXTAREA", "SUMMARY"]);
const MEDIA = new Set(["IMG", "SVG", "CANVAS", "VIDEO", "PICTURE", "IFRAME"]);

export interface ExtractOptions {
  /** Called for each extracted element, e.g. to keep a reference. The matcher never sees what it returns. */
  onNode?: (el: Element, i: number) => void;
}

/** Walk a rendered subtree and return the elements a person would perceive, with their features. */
export function extractNodes(root: Element, opts: ExtractOptions = {}): VNode[] {
  const out: VNode[] = [];
  const rr = root.getBoundingClientRect();
  const unit = rr.width || 1;

  const visit = (el: Element, parent: number, depth: number, path: string) => {
    const cs = getComputedStyle(el);
    if (cs.display === "none" || cs.visibility === "hidden" || +cs.opacity === 0) return;
    const r = el.getBoundingClientRect();
    const tag = el.tagName.toUpperCase();
    const isMedia = MEDIA.has(tag) || (cs.backgroundImage !== "none" && cs.backgroundImage.includes("url("));
    const bg = rgba(cs.backgroundColor);
    const bw =
      parseFloat(cs.borderTopWidth) + parseFloat(cs.borderLeftWidth) + parseFloat(cs.borderBottomWidth) + parseFloat(cs.borderRightWidth);
    const border = bw > 0 && rgba(cs.borderTopColor)[3] + rgba(cs.borderLeftColor)[3] + rgba(cs.borderBottomColor)[3] > 0.05;
    const isBox = bg[3] > 0.04 || border || cs.boxShadow !== "none";

    // Own text: direct text nodes, or the whole text when every child is inline phrasing.
    let own = "";
    let consumed = false;
    const kids = Array.from(el.children);
    if (!isMedia) {
      for (const n of Array.from(el.childNodes)) if (n.nodeType === 3) own += n.textContent;
      const phrasingOnly =
        kids.length > 0 &&
        kids.every(
          (k) =>
            PHRASING.has(k.tagName.toUpperCase()) &&
            rgba(getComputedStyle(k).backgroundColor)[3] < 0.04 &&
            getComputedStyle(k).display.startsWith("inline"),
        );
      if (phrasingOnly && norm(own)) {
        own = (el as HTMLElement).innerText ?? el.textContent ?? "";
        consumed = true;
      }
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT")
        own = (el as HTMLInputElement).value || (el as HTMLInputElement).placeholder || "";
    }
    own = norm(own);
    const label = el.getAttribute("aria-label") || el.getAttribute("alt") || "";
    const role = el.getAttribute("role") || "";
    const control = CONTROL.has(tag) || role === "button" || role === "switch" || role === "tab" || role === "link";
    const visible = r.width * r.height >= 4;
    const keep = visible && (own !== "" || isMedia || control || isBox);

    let me = parent;
    if (keep) {
      let media = "";
      if (tag === "IMG") media = hash((el as HTMLImageElement).currentSrc || (el as HTMLImageElement).src);
      else if (tag === "SVG") media = hash(el.innerHTML.replace(/\s+/g, " "));
      else if (isMedia) media = hash(cs.backgroundImage);
      const fs = parseFloat(cs.fontSize) || 14;
      const fw = parseFloat(cs.fontWeight) || 400;
      const heading = /^H[1-6]$/.test(tag) || role === "heading";
      const kind: Kind = isMedia ? "media" : heading ? "heading" : control ? "control" : own || label ? "text" : "box";
      const raw = own || label;
      me = out.length;
      out.push({
        i: me,
        tag,
        kind,
        raw,
        text: raw.toLowerCase(),
        tokens: tokenize(raw),
        sub: [],
        media,
        x: (r.left - rr.left) / unit,
        y: (r.top - rr.top) / unit,
        w: r.width / unit,
        h: r.height / unit,
        fg: rgba(cs.color),
        bg,
        fs,
        fw,
        radius: parseFloat(cs.borderTopLeftRadius) || 0,
        parent,
        depth,
        children: [],
        path,
      });
      if (parent >= 0) out[parent].children.push(me);
      opts.onNode?.(el, me);
    }
    if (isMedia || consumed) return;
    kids.forEach((k, idx) => visit(k, me, keep ? depth + 1 : depth, `${path}/${k.tagName.toLowerCase()}:${idx}`));
  };
  Array.from(root.children).forEach((k, idx) => visit(k, -1, 0, `${k.tagName.toLowerCase()}:${idx}`));

  // Subtree tokens, bottom-up (children always come after parents in document order).
  for (let k = out.length - 1; k >= 0; k--) {
    const n = out[k];
    const s = new Set<string>(n.tokens);
    if (n.media) s.add("#" + n.media);
    for (const c of n.children) for (const t of out[c].sub) s.add(t);
    n.sub = Array.from(s);
  }
  return out;
}

/* ───────────────────────────── similarity ───────────────────────────── */

function setStats(a: string[], b: string[]) {
  if (!a.length || !b.length) return { inter: 0, dice: 0, contain: 0 };
  const sb = new Set(b);
  let inter = 0;
  for (const t of new Set(a)) if (sb.has(t)) inter++;
  const na = new Set(a).size,
    nb = sb.size;
  return { inter, dice: (2 * inter) / (na + nb), contain: inter / Math.min(na, nb) };
}

function bigrams(s: string) {
  const out: string[] = [];
  for (let k = 0; k < s.length - 1; k++) out.push(s.slice(k, k + 2));
  return out;
}
function bigramDice(a: string, b: string) {
  if (a.length < 2 || b.length < 2) return a === b ? 1 : 0;
  const A = bigrams(a),
    B = bigrams(b);
  const m = new Map<string, number>();
  for (const g of A) m.set(g, (m.get(g) ?? 0) + 1);
  let inter = 0;
  for (const g of B) {
    const c = m.get(g) ?? 0;
    if (c > 0) {
      inter++;
      m.set(g, c - 1);
    }
  }
  return (2 * inter) / (A.length + B.length);
}

const hasDigit = (s: string) => /\d/.test(s);
const mask = (s: string) => s.replace(/\d+([.,]\d+)*/g, "#");

const STOP = new Set([
  "a",
  "an",
  "the",
  "to",
  "of",
  "and",
  "or",
  "in",
  "on",
  "for",
  "at",
  "by",
  "with",
  "is",
  "it",
  "be",
  "you",
  "your",
  "me",
  "my",
  "we",
  "our",
  "i",
  "this",
  "that",
  "from",
  "as",
]);
const content = (t: string[]) => {
  const c = t.filter((x) => !STOP.has(x));
  return c.length ? c : t;
};

export function textSim(a: VNode, b: VNode): number {
  if (a.text === b.text) return 1;
  const ta = content(a.tokens),
    tb = content(b.tokens);
  const { dice, contain } = setStats(ta, tb);
  const shorter = Math.min(new Set(ta).size, new Set(tb).size);
  const containScore = contain * (shorter >= 2 ? 0.82 : 0.5);
  // Character bigrams catch small edits in short strings; on long text they mostly measure "both are English".
  const len = Math.max(a.text.length, b.text.length);
  let s = Math.max(dice, containScore, 0.9 * bigramDice(a.text, b.text) * Math.min(1, 32 / len));
  if (hasDigit(a.text) && hasDigit(b.text)) {
    const ma = mask(a.text),
      mb = mask(b.text);
    s = Math.max(s, ma === mb ? 0.55 : 0.45 * bigramDice(ma, mb));
  }
  return s;
}

function contentSim(a: VNode, b: VNode): number {
  if (a.media || b.media) {
    if (a.media && b.media) return a.media === b.media ? 1 : 0.15;
    return 0;
  }
  if (a.text && b.text) return textSim(a, b);
  if (a.text || b.text) return 0.08;
  if (!a.sub.length && !b.sub.length) return 0.3;
  const { dice, contain } = setStats(a.sub, b.sub);
  return Math.max(dice, 0.85 * contain);
}

const KIND: Record<Kind, Record<Kind, number>> = {
  heading: { heading: 1, text: 0.7, control: 0.4, media: 0, box: 0.1 },
  text: { heading: 0.7, text: 1, control: 0.5, media: 0, box: 0.1 },
  control: { heading: 0.4, text: 0.5, control: 1, media: 0.1, box: 0.3 },
  media: { heading: 0, text: 0, control: 0.1, media: 1, box: 0.3 },
  box: { heading: 0.1, text: 0.1, control: 0.3, media: 0.3, box: 1 },
};

function geomSim(a: VNode, b: VNode) {
  const d = Math.hypot(a.x + a.w / 2 - (b.x + b.w / 2), a.y + a.h / 2 - (b.y + b.h / 2));
  const pos = Math.exp(-d / 0.25);
  const size = Math.exp(-(Math.abs(Math.log((a.w + 1e-3) / (b.w + 1e-3))) + Math.abs(Math.log((a.h + 1e-3) / (b.h + 1e-3)))) / 1.5);
  return 0.6 * pos + 0.4 * size;
}

function colorSim(p: number[], q: number[]) {
  const d = Math.hypot((p[0] - q[0]) * p[3], (p[1] - q[1]) * p[3], (p[2] - q[2]) * p[3], (p[3] - q[3]) * 255);
  return 1 - Math.min(1, d / 220);
}
function styleSim(a: VNode, b: VNode) {
  const fs = Math.exp(-Math.abs(Math.log(a.fs / b.fs)) * 2);
  const fw = 1 - Math.min(1, Math.abs(a.fw - b.fw) / 500);
  const rad = Math.exp(-Math.abs(Math.min(a.radius, 40) - Math.min(b.radius, 40)) / 8);
  return (colorSim(a.fg, b.fg) + 1.4 * colorSim(a.bg, b.bg) + fs + 0.6 * fw + 0.6 * rad) / 4.6;
}

function baseSim(a: VNode, b: VNode, o: Required<MatchOptions>) {
  const k = KIND[a.kind][b.kind];
  const c = contentSim(a, b);
  if (!o.kind && !o.geometry && !o.style) return c;
  const wk = o.kind ? 0.15 : 0,
    wc = 0.45,
    wg = o.geometry ? 0.2 : 0,
    ws = o.style ? 0.2 : 0;
  // Position and paint only count in proportion to how plausible the content is:
  // two unrelated paragraphs in the same slot are not the same element.
  const gate = 0.35 + 0.65 * Math.min(1, c / 0.6);
  let s = (wk * k + wc * c + (wg * (o.geometry ? geomSim(a, b) : 0) + ws * (o.style ? styleSim(a, b) : 0)) * gate) / (wk + wc + wg + ws);
  if (o.kind && k < 0.2) s *= 0.5;
  return s;
}

/* ───────────────────────────── assignment ───────────────────────────── */

/** Minimum-cost assignment for an n×m cost matrix with n ≤ m (rows all assigned). O(n²m). */
export function hungarian(cost: number[][]): number[] {
  const n = cost.length,
    m = n ? cost[0].length : 0;
  const INF = 1e18;
  const u = new Float64Array(n + 1),
    v = new Float64Array(m + 1);
  const p = new Int32Array(m + 1),
    way = new Int32Array(m + 1);
  for (let i = 1; i <= n; i++) {
    p[0] = i;
    let j0 = 0;
    const minv = new Float64Array(m + 1).fill(INF);
    const used = new Uint8Array(m + 1);
    do {
      used[j0] = 1;
      const i0 = p[j0];
      let delta = INF,
        j1 = 0;
      for (let j = 1; j <= m; j++)
        if (!used[j]) {
          const cur = cost[i0 - 1][j - 1] - u[i0] - v[j];
          if (cur < minv[j]) {
            minv[j] = cur;
            way[j] = j0;
          }
          if (minv[j] < delta) {
            delta = minv[j];
            j1 = j;
          }
        }
      for (let j = 0; j <= m; j++) {
        if (used[j]) {
          u[p[j]] += delta;
          v[j] -= delta;
        } else minv[j] -= delta;
      }
      j0 = j1;
    } while (p[j0] !== 0);
    do {
      const j1 = way[j0];
      p[j0] = p[j1];
      j0 = j1;
    } while (j0);
  }
  const rowTo = new Array<number>(n).fill(-1);
  for (let j = 1; j <= m; j++) if (p[j]) rowTo[p[j] - 1] = j - 1;
  return rowTo;
}

/** Maximise total similarity; pairs below `t` are treated as unmatched. */
function assign(S: number[][], t: number): MatchPair[] {
  const n = S.length,
    m = n ? S[0].length : 0;
  if (!n || !m) return [];
  const flip = n > m;
  const rows = flip ? m : n,
    cols = flip ? n : m;
  const cost: number[][] = [];
  for (let r = 0; r < rows; r++) {
    const row = new Array<number>(cols);
    for (let c = 0; c < cols; c++) {
      const s = flip ? S[c][r] : S[r][c];
      row[c] = 1 - Math.max(s, t);
    }
    cost.push(row);
  }
  const to = hungarian(cost);
  const out: MatchPair[] = [];
  to.forEach((c, r) => {
    if (c < 0) return;
    const a = flip ? c : r,
      b = flip ? r : c;
    if (S[a][b] >= t) out.push({ a, b, score: S[a][b] });
  });
  return out;
}

function ancestors(nodes: VNode[], i: number, k = 3) {
  const out: number[] = [];
  let p = nodes[i].parent;
  while (p >= 0 && out.length < k) {
    out.push(p);
    p = nodes[p].parent;
  }
  return out;
}
function descendants(nodes: VNode[], i: number) {
  const out: number[] = [];
  const st = [...nodes[i].children];
  while (st.length) {
    const c = st.pop()!;
    out.push(c);
    st.push(...nodes[c].children);
  }
  return out;
}
function gap(p: VNode, q: VNode) {
  const dx = Math.max(0, Math.abs(p.x + p.w / 2 - (q.x + q.w / 2)) - (p.w + q.w) / 2);
  const dy = Math.max(0, Math.abs(p.y + p.h / 2 - (q.y + q.h / 2)) - (p.h + q.h) / 2);
  return Math.hypot(dx, dy);
}
function aligned(p: VNode, q: VNode) {
  const oy = Math.min(p.y + p.h, q.y + q.h) - Math.max(p.y, q.y);
  const ox = Math.min(p.x + p.w, q.x + q.w) - Math.max(p.x, q.x);
  return oy > 0.5 * Math.min(p.h, q.h) || ox > 0.5 * Math.min(p.w, q.w);
}
function relPos(n: VNode, p: VNode) {
  return [(n.x + n.w / 2 - p.x) / (p.w || 1), (n.y + n.h / 2 - p.y) / (p.h || 1)];
}

/* ───────────────────────────── matcher ───────────────────────────── */

const DEFAULTS: Required<MatchOptions> = { threshold: 0.5, kind: true, geometry: true, style: true, structure: true, splits: true };

export function matchNodes(A: VNode[], B: VNode[], options: MatchOptions = {}): MatchResult {
  const t0 = typeof performance !== "undefined" ? performance.now() : Date.now();
  const o = { ...DEFAULTS, ...options };
  const base = A.map((a) => B.map((b) => baseSim(a, b, o)));
  let pairs = assign(base, o.threshold);

  if (o.structure && A.length && B.length) {
    const ancA = A.map((_, i) => ancestors(A, i)),
      ancB = B.map((_, j) => ancestors(B, j));
    // Only descendants with content of their own vote; empty boxes would just echo earlier guesses.
    const evid = (N: VNode[]) => (c: number) => !!(N[c].text || N[c].media);
    const desA = A.map((_, i) => descendants(A, i).filter(evid(A))),
      desB = B.map((_, j) => descendants(B, j).filter(evid(B)));
    const sty = A.map((a) => B.map((b) => (a.kind === b.kind ? styleSim(a, b) : 0)));
    for (let pass = 0; pass < 3; pass++) {
      const fwd = new Int32Array(A.length).fill(-1),
        bwd = new Int32Array(B.length).fill(-1);
      for (const p of pairs) {
        fwd[p.a] = p.b;
        bwd[p.b] = p.a;
      }
      // Spatial anchors: the nearest matched siblings (the label beside a switch, the price under a title).
      const anchors = (N: VNode[], matched: Int32Array) =>
        N.map((n, i) => {
          const near: [number, number][] = [];
          for (const m of N) {
            if (m.i === i || matched[m.i] < 0 || m.parent !== n.parent || !(m.text || m.media)) continue;
            let d = gap(n, m);
            if (aligned(n, m)) d *= 0.25; // same row or column reads as "belongs together"
            if (d < 0.4) near.push([d, m.i]);
          }
          near.sort((x, y) => x[0] - y[0]);
          return near.filter((x, k) => k === 0 || (k === 1 && x[0] < 2 * near[0][0] + 0.01)).map((x) => x[1]);
        });
      const anA = anchors(A, fwd),
        anB = anchors(B, bwd);
      const S = base.map((row, i) =>
        row.map((s, j) => {
          let ctx = 0;
          const pa = A[i].parent,
            pb = B[j].parent;
          if (pa >= 0 && pb >= 0 && fwd[pa] === pb) {
            const [ax, ay] = relPos(A[i], A[pa]),
              [bx, by] = relPos(B[j], B[pb]);
            ctx = 0.5 + 0.5 * Math.exp(-Math.hypot(ax - bx, ay - by) / 0.3);
          } else if (ancA[i].some((x) => fwd[x] >= 0 && ancB[j].includes(fwd[x]))) ctx = 0.5;
          if (anA[i].some((x) => anB[j].includes(fwd[x]))) ctx = Math.max(ctx, 0.8);
          // Same slot, same kind, same look: an element whose label or value changed.
          let bonus = 0.12 * ctx + 0.08 * ctx * sty[i][j] ** 3;
          const da = desA[i],
            db = desB[j];
          if (da.length && db.length) {
            const setB = new Set(db);
            let agree = 0;
            for (const c of da) if (fwd[c] >= 0 && setB.has(fwd[c])) agree++;
            bonus += (0.18 * (2 * agree)) / (da.length + db.length);
          }
          return s + bonus * (0.4 + 0.6 * Math.min(1, s / 0.45));
        }),
      );
      pairs = assign(S, o.threshold);
    }
  }

  const splits: MatchResult["splits"] = [];
  const merges: MatchResult["merges"] = [];
  if (o.splits) detectSplitsMerges(A, B, pairs, splits, merges);

  const usedA = new Set<number>(),
    usedB = new Set<number>();
  for (const p of pairs) {
    usedA.add(p.a);
    usedB.add(p.b);
  }
  for (const s of splits) {
    usedA.add(s.a);
    s.bs.forEach((b) => usedB.add(b));
  }
  for (const m of merges) {
    usedB.add(m.b);
    m.as.forEach((a) => usedA.add(a));
  }
  const t1 = typeof performance !== "undefined" ? performance.now() : Date.now();
  return {
    pairs,
    splits,
    merges,
    removed: A.map((n) => n.i).filter((i) => !usedA.has(i)),
    added: B.map((n) => n.i).filter((j) => !usedB.has(j)),
    ms: t1 - t0,
  };
}

/** One text became several (an address split into lines), or several became one (first + last name). */
function detectSplitsMerges(A: VNode[], B: VNode[], pairs: MatchPair[], splits: MatchResult["splits"], merges: MatchResult["merges"]) {
  const fwd = new Map<number, number>(),
    back = new Map<number, number>();
  for (const p of pairs) {
    fwd.set(p.a, p.b);
    back.set(p.b, p.a);
  }
  const content = (n: VNode) => n.tokens.filter((t) => t.length >= 2 || /\d/.test(t));
  const within = (part: VNode, whole: VNode) => {
    const pt = content(part),
      wt = new Set(content(whole));
    return pt.length > 0 && pt.length < wt.size && pt.every((t) => wt.has(t));
  };
  const near = (p: VNode, q: VNode) => Math.exp(-Math.hypot(p.x - q.x, p.y - q.y) / 0.6);

  const run = (
    X: VNode[],
    Y: VNode[],
    xTo: Map<number, number>,
    yFrom: Map<number, number>,
    emit: (whole: number, parts: number[]) => void,
  ) => {
    // X are the wholes, Y the candidate parts.
    const claim = new Map<number, number[]>();
    for (const y of Y) {
      if (!y.text) continue;
      const partner = yFrom.get(y.i);
      let best = -1,
        bestScore = 0;
      for (const x of X) {
        if (!x.text || !within(y, x)) continue;
        if (partner !== undefined && partner !== x.i) continue; // part already matched elsewhere
        const xp = xTo.get(x.i);
        if (xp !== undefined && xp !== y.i && !within(Y[xp], x)) continue; // whole already matched to something that isn't a part
        const s = near(y, x) + (xTo.get(x.i) === y.i ? 1 : 0);
        if (s > bestScore) {
          bestScore = s;
          best = x.i;
        }
      }
      if (best >= 0) claim.set(best, [...(claim.get(best) ?? []), y.i]);
    }
    for (const [x, parts] of claim) {
      if (parts.length < 2) continue;
      const covered = new Set(parts.flatMap((p) => content(Y[p])));
      const whole = new Set(content(X[x]));
      let cov = 0;
      for (const t of whole) if (covered.has(t)) cov++;
      if (cov / whole.size < 0.6) continue;
      emit(x, parts);
    }
  };

  run(A, B, fwd, back, (a, bs) => {
    for (let k = pairs.length - 1; k >= 0; k--) if (pairs[k].a === a || bs.includes(pairs[k].b)) pairs.splice(k, 1);
    splits.push({ a, bs });
  });
  const fwd2 = new Map<number, number>(),
    back2 = new Map<number, number>();
  for (const p of pairs) {
    fwd2.set(p.a, p.b);
    back2.set(p.b, p.a);
  }
  run(B, A, back2, fwd2, (b, as) => {
    for (let k = pairs.length - 1; k >= 0; k--) if (pairs[k].b === b || as.includes(pairs[k].a)) pairs.splice(k, 1);
    merges.push({ as, b });
  });
}

/* ───────────────────────────── baselines ───────────────────────────── */

/** What React-style reconciliation without keys does: same position in the tree means same element. */
export function matchByTreePosition(A: VNode[], B: VNode[]): MatchResult {
  const byPath = new Map<string, number>();
  B.forEach((b) => byPath.set(b.path + "|" + b.tag, b.i));
  const pairs: MatchPair[] = [];
  for (const a of A) {
    const j = byPath.get(a.path + "|" + a.tag);
    if (j !== undefined) pairs.push({ a: a.i, b: j, score: 1 });
  }
  return finish(A, B, pairs);
}

/** Naive content matching: identical text or identical media, first come first served. */
export function matchByExactText(A: VNode[], B: VNode[]): MatchResult {
  const used = new Set<number>();
  const pairs: MatchPair[] = [];
  for (const a of A) {
    const key = a.media ? "#" + a.media : a.text;
    if (!key) continue;
    const b = B.find((b) => !used.has(b.i) && (b.media ? "#" + b.media : b.text) === key);
    if (b) {
      used.add(b.i);
      pairs.push({ a: a.i, b: b.i, score: 1 });
    }
  }
  return finish(A, B, pairs);
}

function finish(A: VNode[], B: VNode[], pairs: MatchPair[]): MatchResult {
  const ua = new Set(pairs.map((p) => p.a)),
    ub = new Set(pairs.map((p) => p.b));
  return {
    pairs,
    splits: [],
    merges: [],
    removed: A.map((n) => n.i).filter((i) => !ua.has(i)),
    added: B.map((n) => n.i).filter((j) => !ub.has(j)),
    ms: 0,
  };
}

/** Every relation a result asserts, as "a>b" strings (pairs, plus each part of a split or merge). */
export function relations(r: MatchResult): Set<string> {
  const s = new Set<string>();
  for (const p of r.pairs) s.add(`${p.a}>${p.b}`);
  for (const x of r.splits) for (const b of x.bs) s.add(`${x.a}>${b}`);
  for (const x of r.merges) for (const a of x.as) s.add(`${a}>${x.b}`);
  return s;
}

/* ───────────────────────────── semantic diff ───────────────────────────── */

export interface Change {
  kind: "moved" | "resized" | "text" | "paint" | "removed" | "added" | "split" | "merged";
  a?: number;
  b?: number;
  detail: string;
}

/** What changed between two states, in terms a reviewer (or a test) can read. */
export function describeChanges(A: VNode[], B: VNode[], r: MatchResult): Change[] {
  const out: Change[] = [];
  const label = (n: VNode) =>
    n.raw ? `“${n.raw.length > 38 ? n.raw.slice(0, 36) + "…" : n.raw}”` : n.kind === "media" ? "image" : `${n.tag.toLowerCase()} ${n.kind}`;
  for (const p of r.pairs) {
    const a = A[p.a],
      b = B[p.b];
    if (a.text !== b.text && (a.text || b.text)) out.push({ kind: "text", a: a.i, b: b.i, detail: `${label(a)} → ${label(b)}` });
    else if (colorSim(a.bg, b.bg) < 0.9 || colorSim(a.fg, b.fg) < 0.9)
      out.push({ kind: "paint", a: a.i, b: b.i, detail: `${label(b)} changed colour` });
    const dx = Math.abs(a.x - b.x) + Math.abs(a.y - b.y),
      dw = Math.abs(Math.log((a.w + 1e-3) / (b.w + 1e-3))) + Math.abs(Math.log((a.h + 1e-3) / (b.h + 1e-3)));
    if (dw > 0.25 && a.children.length + b.children.length === 0)
      out.push({ kind: "resized", a: a.i, b: b.i, detail: `${label(b)} resized` });
    else if (dx > 0.04 && (a.parent < 0 || r.pairs.find((q) => q.a === a.parent)?.b !== b.parent || dx > 0.3))
      out.push({ kind: "moved", a: a.i, b: b.i, detail: `${label(b)} moved` });
  }
  for (const s of r.splits)
    out.push({ kind: "split", a: s.a, detail: `${label(A[s.a])} split into ${s.bs.map((j) => label(B[j])).join(" + ")}` });
  for (const m of r.merges)
    out.push({ kind: "merged", b: m.b, detail: `${m.as.map((i) => label(A[i])).join(" + ")} merged into ${label(B[m.b])}` });
  const top = (nodes: VNode[], set: Set<number>) => [...set].filter((i) => nodes[i].parent < 0 || !set.has(nodes[i].parent));
  for (const i of top(A, new Set(r.removed))) out.push({ kind: "removed", a: i, detail: `${label(A[i])} removed` });
  for (const j of top(B, new Set(r.added))) out.push({ kind: "added", b: j, detail: `${label(B[j])} added` });
  return out;
}

/* ───────────────────────────── transitions ───────────────────────────── */

export const supportsViewTransitions = () =>
  typeof document !== "undefined" && typeof (document as Document & { startViewTransition?: unknown }).startViewTransition === "function";

/**
 * Give matched pairs the same unique `view-transition-name`. Returns a cleanup function.
 * Only pairs where both elements are inside `clip` (the visible stage) are named, so nothing
 * flies in from outside the viewport.
 */
export function nameElements(els: Element[], idx: number[], prefix: string, clip?: DOMRect) {
  const touched: HTMLElement[] = [];
  idx.forEach((i, k) => {
    const el = els[i] as HTMLElement | undefined;
    if (!el) return;
    if (clip) {
      const r = el.getBoundingClientRect();
      if (r.bottom < clip.top || r.top > clip.bottom || r.right < clip.left || r.left > clip.right) return;
    }
    el.style.setProperty("view-transition-name", `${prefix}${k}`);
    touched.push(el);
  });
  return () => touched.forEach((el) => el.style.removeProperty("view-transition-name"));
}

/** Pairs whose elements are both visible in the clip rect. */
export function visiblePairs(pairs: MatchPair[], elsA: Element[], elsB: Element[], clipA: DOMRect, clipB: DOMRect) {
  const inside = (el: Element | undefined, c: DOMRect) => {
    if (!el) return false;
    const r = el.getBoundingClientRect();
    return r.bottom > c.top && r.top < c.bottom && r.right > c.left && r.left < c.right;
  };
  return pairs.filter((p) => inside(elsA[p.a], clipA) && inside(elsB[p.b], clipB));
}

/**
 * FLIP fallback for browsers without the View Transitions API. The old page is cloned into a
 * ghost layer that fades out; matched leaf elements on the new page travel from their old boxes.
 * Containers crossfade, which avoids compounding transforms on nested matches.
 */
export function flipTransition(
  stage: HTMLElement,
  pairsFor: () => { pairs: MatchPair[]; elsA: Element[]; elsB: () => Element[]; nodesB: () => VNode[] },
  update: () => Promise<void> | void,
  duration = 450,
  easing = "cubic-bezier(.2,.8,.2,1)",
) {
  const { pairs, elsA } = pairsFor();
  const page = stage.firstElementChild as HTMLElement | null;
  if (!page) {
    update();
    return { finished: Promise.resolve(), cancel() {} };
  }
  const rects = new Map<number, DOMRect>();
  for (const p of pairs) rects.set(p.b, elsA[p.a].getBoundingClientRect());
  pairs.forEach((p) => (elsA[p.a] as HTMLElement).setAttribute("data-flip-hide", ""));
  const sr = stage.getBoundingClientRect();
  const ghost = page.cloneNode(true) as HTMLElement;
  pairs.forEach((p) => (elsA[p.a] as HTMLElement).removeAttribute("data-flip-hide"));
  ghost.querySelectorAll("[data-flip-hide]").forEach((e) => ((e as HTMLElement).style.visibility = "hidden"));
  Object.assign(ghost.style, {
    position: "absolute",
    left: "0",
    top: "0",
    width: sr.width + "px",
    pointerEvents: "none",
    zIndex: "1",
    margin: "0",
  });
  ghost.setAttribute("aria-hidden", "true");
  const anims: Animation[] = [];
  const finished = (async () => {
    await update();
    stage.appendChild(ghost);
    const { elsB, nodesB } = pairsFor();
    const els = elsB(),
      nodes = nodesB();
    const hasMatchedDesc = new Set<number>();
    const bset = new Set(pairs.map((p) => p.b));
    for (const p of pairs) {
      let q = nodes[p.b]?.parent ?? -1;
      while (q >= 0) {
        if (bset.has(q)) hasMatchedDesc.add(q);
        q = nodes[q].parent;
      }
    }
    anims.push(ghost.animate([{ opacity: 1 }, { opacity: 0 }], { duration: duration * 0.7, easing: "ease-out", fill: "forwards" }));
    for (const p of pairs) {
      if (hasMatchedDesc.has(p.b)) continue;
      const el = els[p.b] as HTMLElement | undefined,
        from = rects.get(p.b);
      if (!el || !from) continue;
      const to = el.getBoundingClientRect();
      if (!to.width || !to.height) continue;
      const sx = from.width / to.width,
        sy = from.height / to.height;
      const dx = from.left - to.left,
        dy = from.top - to.top;
      if (Math.abs(dx) < 0.5 && Math.abs(dy) < 0.5 && Math.abs(sx - 1) < 0.01 && Math.abs(sy - 1) < 0.01) continue;
      const pos = getComputedStyle(el).position;
      const prev = { position: el.style.position, zIndex: el.style.zIndex, transformOrigin: el.style.transformOrigin };
      if (pos === "static") el.style.position = "relative";
      el.style.zIndex = "2";
      el.style.transformOrigin = "0 0";
      const a = el.animate([{ transform: `translate(${dx}px,${dy}px) scale(${sx},${sy})` }, { transform: "none" }], { duration, easing });
      a.finished.catch(() => {}).finally(() => Object.assign(el.style, prev));
      anims.push(a);
    }
    await Promise.all(anims.map((a) => a.finished.catch(() => {})));
    ghost.remove();
  })();
  return {
    finished,
    cancel() {
      anims.forEach((a) => a.finish());
      ghost.remove();
    },
  };
}
