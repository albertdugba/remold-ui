/**
 * diagram.ts — diagrams-as-code that keep their shape across edits.
 *
 * Parses a Mermaid-style flowchart, lays it out with ELK, and for each edit produces two layouts:
 *   fresh  — laid out from scratch, which is how Mermaid and D2 render every edit
 *   stable — seeded with the previous positions, then aligned to them, so existing boxes stay put
 * Node identity carries across renames (new id, similar label, same neighbours) via a small matcher.
 */
import ELK from "elkjs/lib/elk.bundled.js";

export type Shape = "rect" | "round" | "diamond" | "db";
export interface GNode {
  id: string;
  label: string;
  shape: Shape;
}
export interface GEdge {
  from: string;
  to: string;
  label?: string;
  dotted?: boolean;
}
export interface Graph {
  dir: "LR" | "TD";
  nodes: GNode[];
  edges: GEdge[];
}
export interface PNode extends GNode {
  x: number;
  y: number;
  w: number;
  h: number;
}
export interface PEdge extends GEdge {
  key: string;
  pts: [number, number][];
  lx?: number;
  ly?: number;
}
export interface Layout {
  nodes: Map<string, PNode>;
  edges: PEdge[];
  w: number;
  h: number;
}

/* ───────── parsing ───────── */

const NODE = /^([A-Za-z_][\w-]*)\s*(\[\((.+?)\)\]|\[(.+?)\]|\((.+?)\)|\{(.+?)\})?/;
export function parseFlow(src: string): { graph: Graph; errors: string[] } {
  const errors: string[] = [];
  const nodes = new Map<string, GNode>();
  const edges: GEdge[] = [];
  let dir: Graph["dir"] = "LR";
  const node = (m: RegExpMatchArray) => {
    const id = m[1];
    const shape: Shape =
      m[3] !== undefined ? "db" : m[4] !== undefined ? "rect" : m[5] !== undefined ? "round" : m[6] !== undefined ? "diamond" : "rect";
    const label = (m[3] ?? m[4] ?? m[5] ?? m[6] ?? "").trim();
    const prev = nodes.get(id);
    if (!prev) nodes.set(id, { id, label: label || id, shape });
    else if (label) {
      prev.label = label;
      prev.shape = shape;
    }
    return id;
  };
  src.split("\n").forEach((raw, k) => {
    const line = raw.replace(/%%.*$/, "").trim();
    if (!line) return;
    const head = line.match(/^(flowchart|graph)\s+(LR|RL|TD|TB|BT)\b/i);
    if (head) {
      dir = /^(LR|RL)$/i.test(head[2]) ? "LR" : "TD";
      return;
    }
    const a = line.match(NODE);
    if (!a) {
      errors.push(`Line ${k + 1}: expected a node id`);
      return;
    }
    const from = node(a);
    let rest = line.slice(a[0].length).trim();
    if (!rest) return;
    const arrow = rest.match(/^(-->|-\.->|==>|---)\s*(?:\|([^|]*)\|)?\s*/);
    if (!arrow) {
      errors.push(`Line ${k + 1}: expected an arrow like -->`);
      return;
    }
    rest = rest.slice(arrow[0].length);
    const b = rest.match(NODE);
    if (!b) {
      errors.push(`Line ${k + 1}: expected a target node`);
      return;
    }
    const to = node(b);
    edges.push({ from, to, label: arrow[2]?.trim() || undefined, dotted: arrow[1] === "-.->" });
  });
  return { graph: { dir, nodes: [...nodes.values()], edges }, errors };
}

/* ───────── identity across edits ───────── */

const tokens = (s: string) => new Set(s.toLowerCase().match(/[\p{L}\p{N}]+/gu) ?? []);
const dice = (a: Set<string>, b: Set<string>) => {
  if (!a.size || !b.size) return 0;
  let n = 0;
  for (const t of a) if (b.has(t)) n++;
  return (2 * n) / (a.size + b.size);
};

/** Map new node ids to old ones. Same id wins; otherwise similar label plus shared neighbours. */
export function matchIds(prev: Graph, next: Graph): Map<string, string> {
  const map = new Map<string, string>(); // next id -> prev id
  const prevIds = new Set(prev.nodes.map((n) => n.id));
  for (const n of next.nodes) if (prevIds.has(n.id)) map.set(n.id, n.id);
  const used = new Set(map.values());
  const nb = (g: Graph, id: string) => new Set(g.edges.flatMap((e) => (e.from === id ? [e.to] : e.to === id ? [e.from] : [])));
  const cands: [number, string, string][] = [];
  for (const n of next.nodes) {
    if (map.has(n.id)) continue;
    const nbN = new Set([...nb(next, n.id)].map((x) => map.get(x) ?? "?" + x));
    for (const p of prev.nodes) {
      if (used.has(p.id)) continue;
      const s = 0.55 * dice(tokens(n.label), tokens(p.label)) + 0.45 * dice(nbN, nb(prev, p.id)) + (n.shape === p.shape ? 0.05 : 0);
      if (s >= 0.4) cands.push([s, n.id, p.id]);
    }
  }
  cands.sort((x, y) => y[0] - x[0]);
  for (const [, nid, pid] of cands)
    if (!map.has(nid) && !used.has(pid)) {
      map.set(nid, pid);
      used.add(pid);
    }
  return map;
}

/* ───────── layout ───────── */

export type Measure = (label: string) => number;
const elk = new ELK();

const BASE = {
  "elk.algorithm": "layered",
  "elk.edgeRouting": "ORTHOGONAL",
  "elk.layered.spacing.nodeNodeBetweenLayers": "64",
  "elk.spacing.nodeNode": "26",
  "elk.spacing.edgeNode": "18",
  "elk.layered.spacing.edgeNodeBetweenLayers": "22",
  "elk.layered.nodePlacement.strategy": "BRANDES_KOEPF",
  "elk.padding": "[top=16,left=16,bottom=16,right=16]",
};

function size(n: GNode, measure: Measure) {
  const w = Math.max(84, Math.round(measure(n.label) + (n.shape === "diamond" ? 54 : 30)));
  const h = n.shape === "diamond" ? 58 : n.shape === "db" ? 52 : 42;
  return { w, h };
}

async function run(g: Graph, measure: Measure, seed?: Map<string, { x: number; y: number }>): Promise<Layout> {
  const layoutOptions: Record<string, string> = { ...BASE, "elk.direction": g.dir === "LR" ? "RIGHT" : "DOWN" };
  if (seed)
    Object.assign(layoutOptions, {
      "elk.layered.layering.strategy": "INTERACTIVE",
      "elk.layered.crossingMinimization.strategy": "INTERACTIVE",
      "elk.layered.cycleBreaking.strategy": "INTERACTIVE",
      "elk.layered.nodePlacement.strategy": "INTERACTIVE",
      "elk.layered.interactiveReferencePoint": "CENTER",
    });
  const graph = {
    id: "root",
    layoutOptions,
    children: g.nodes.map((n) => {
      const s = size(n, measure);
      const p = seed?.get(n.id);
      return { id: n.id, width: s.w, height: s.h, ...(p ? { x: p.x - s.w / 2, y: p.y - s.h / 2 } : {}) };
    }),
    edges: g.edges.map((e, k) => ({
      id: "e" + k,
      sources: [e.from],
      targets: [e.to],
      labels: e.label ? [{ text: e.label, width: measure(e.label) * 0.86 + 10, height: 18 }] : [],
    })),
  };
  const out = (await elk.layout(graph as never)) as unknown as {
    width: number;
    height: number;
    children: { id: string; x: number; y: number; width: number; height: number }[];
    edges: {
      id: string;
      sections?: { startPoint: { x: number; y: number }; endPoint: { x: number; y: number }; bendPoints?: { x: number; y: number }[] }[];
      labels?: { x: number; y: number; width: number; height: number }[];
    }[];
  };
  const byId = new Map(g.nodes.map((n) => [n.id, n]));
  const nodes = new Map<string, PNode>();
  for (const c of out.children) nodes.set(c.id, { ...byId.get(c.id)!, x: c.x, y: c.y, w: c.width, h: c.height });
  const edges: PEdge[] = out.edges.map((e, k) => {
    const s = e.sections?.[0];
    const pts: [number, number][] = s
      ? [[s.startPoint.x, s.startPoint.y], ...(s.bendPoints ?? []).map((p) => [p.x, p.y] as [number, number]), [s.endPoint.x, s.endPoint.y]]
      : [];
    const L = e.labels?.[0];
    return {
      ...g.edges[k],
      key: `${g.edges[k].from}>${g.edges[k].to}`,
      pts,
      ...(L ? { lx: L.x + L.width / 2, ly: L.y + L.height / 2 } : {}),
    };
  });
  return { nodes, edges, w: out.width, h: out.height };
}

export const centre = (n: PNode) => ({ x: n.x + n.w / 2, y: n.y + n.h / 2 });

function translate(l: Layout, dx: number, dy: number): Layout {
  const nodes = new Map<string, PNode>();
  for (const [k, n] of l.nodes) nodes.set(k, { ...n, x: n.x + dx, y: n.y + dy });
  return {
    nodes,
    w: l.w,
    h: l.h,
    edges: l.edges.map((e) => ({
      ...e,
      pts: e.pts.map(([x, y]) => [x + dx, y + dy] as [number, number]),
      lx: e.lx !== undefined ? e.lx + dx : undefined,
      ly: e.ly !== undefined ? e.ly + dy : undefined,
    })),
  };
}

/** Translate `next` so persisting nodes sit, on average, where they were. */
function align(next: Layout, prev: Layout, ids: Map<string, string>): Layout {
  let dx = 0,
    dy = 0,
    n = 0;
  for (const [nid, pid] of ids) {
    const a = next.nodes.get(nid),
      b = prev.nodes.get(pid);
    if (!a || !b) continue;
    const ca = centre(a),
      cb = centre(b);
    dx += cb.x - ca.x;
    dy += cb.y - ca.y;
    n++;
  }
  return n ? translate(next, dx / n, dy / n) : next;
}

export function layoutFresh(g: Graph, measure: Measure) {
  return run(g, measure);
}

/** Stable re-layout: seed with previous positions (new nodes placed near their neighbours), then align. */
export async function layoutStable(
  g: Graph,
  prevG: Graph,
  prev: Layout,
  measure: Measure,
): Promise<{ layout: Layout; ids: Map<string, string> }> {
  const ids = matchIds(prevG, g);
  const fresh = await run(g, measure);
  const seed = new Map<string, { x: number; y: number }>();
  for (const [nid, pid] of ids) {
    const p = prev.nodes.get(pid);
    if (p) seed.set(nid, centre(p));
  }
  // New nodes: keep their fresh offset from already-placed neighbours.
  for (let pass = 0; pass < 3; pass++)
    for (const n of g.nodes) {
      if (seed.has(n.id)) continue;
      const nbrs = g.edges.flatMap((e) => (e.from === n.id ? [e.to] : e.to === n.id ? [e.from] : [])).filter((x) => seed.has(x));
      if (!nbrs.length) continue;
      const f = centre(fresh.nodes.get(n.id)!);
      let x = 0,
        y = 0;
      for (const m of nbrs) {
        const fm = centre(fresh.nodes.get(m)!),
          sm = seed.get(m)!;
        x += sm.x + (f.x - fm.x);
        y += sm.y + (f.y - fm.y);
      }
      seed.set(n.id, { x: x / nbrs.length, y: y / nbrs.length });
    }
  for (const n of g.nodes) if (!seed.has(n.id)) seed.set(n.id, centre(fresh.nodes.get(n.id)!));
  const stable = await run(g, measure, seed);
  return { layout: align(stable, prev, ids), ids };
}

/** How far persisting nodes moved between two layouts (after `ids` maps next -> prev). */
export function displacement(prev: Layout, next: Layout, ids: Map<string, string>, moveThreshold = 12) {
  let total = 0,
    moved = 0,
    n = 0;
  for (const [nid, pid] of ids) {
    const a = next.nodes.get(nid),
      b = prev.nodes.get(pid);
    if (!a || !b) continue;
    const d = Math.hypot(centre(a).x - centre(b).x, centre(a).y - centre(b).y);
    total += d;
    n++;
    if (d > moveThreshold) moved++;
  }
  return { mean: n ? total / n : 0, moved, n };
}
