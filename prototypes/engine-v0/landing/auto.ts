/**
 * auto.ts — keyless continuity for any DOM subtree whose contents get replaced wholesale.
 *
 *   await autoTransition(root, () => { root.innerHTML = nextHtml; });
 *
 * Before the update, every visible element under `root` is measured (and, on the View Transitions
 * path, given a provisional name). After the update the new subtree is measured, the matcher pairs
 * old and new elements with no ids, and each new element inherits its partner's name. Old elements
 * with no partner fade where they were; new ones fade in. Without the API, a FLIP fallback runs.
 */
import {
  describeChanges,
  extractNodes,
  matchNodes,
  supportsViewTransitions,
  type Change,
  type MatchResult,
  type VNode,
} from "../correspond";

export interface Measured {
  nodes: VNode[];
  els: HTMLElement[];
}
export interface AutoResult {
  A: Measured;
  B: Measured;
  result: MatchResult;
  changes: Change[];
}
export interface AutoOptions {
  duration?: number;
  easing?: string;
  /** "match" (default) pairs elements; "none" crossfades the whole root; "instant" just swaps. */
  mode?: "match" | "none" | "instant";
  engine?: "auto" | "vt" | "flip";
  /** Outline changed elements after the transition so people see what changed. */
  highlight?: boolean;
}

export function measure(root: Element): Measured {
  const els: HTMLElement[] = [];
  const nodes = extractNodes(root, { onNode: (el) => els.push(el as HTMLElement) });
  return { nodes, els };
}

const inView = (el: Element, clip: DOMRect) => {
  const r = el.getBoundingClientRect();
  return r.width > 0 && r.height > 0 && r.bottom > clip.top && r.top < clip.bottom && r.right > clip.left && r.left < clip.right;
};
const clipOf = (root: Element) => {
  const r = root.getBoundingClientRect();
  const top = Math.max(r.top, 0),
    bottom = Math.min(r.bottom, innerHeight);
  return new DOMRect(r.left, top, r.width, Math.max(0, bottom - top));
};

let seq = 0;
let running: { skip(): void } | null = null;

export async function autoTransition(
  root: HTMLElement,
  update: () => void | Promise<void>,
  o: AutoOptions = {},
): Promise<AutoResult | null> {
  running?.skip();
  const duration = o.duration ?? 520;
  const easing = o.easing ?? "cubic-bezier(.2,.8,.2,1)";
  const reduced = typeof matchMedia !== "undefined" && matchMedia("(prefers-reduced-motion: reduce)").matches;
  const A = measure(root);
  const finish = (B: Measured): AutoResult => {
    const result = matchNodes(A.nodes, B.nodes);
    return { A, B, result, changes: describeChanges(A.nodes, B.nodes, result) };
  };

  if (o.mode === "instant" || reduced) {
    await update();
    const out = finish(measure(root));
    if (o.highlight) highlight(out);
    return out;
  }

  const useVT = o.engine === "vt" || (o.engine !== "flip" && supportsViewTransitions());
  const tag = `tl${++seq}-`;
  document.documentElement.style.setProperty("--rm-d", duration + "ms");
  document.documentElement.style.setProperty("--rm-ease", easing);

  if (useVT) {
    const clip = clipOf(root);
    const clear = () =>
      root.querySelectorAll<HTMLElement>("[data-rm-name]").forEach((e) => {
        e.style.removeProperty("view-transition-name");
        delete e.dataset.tlName;
      });
    const name = (el: HTMLElement, n: string) => {
      el.style.setProperty("view-transition-name", n);
      el.dataset.tlName = "1";
    };
    root.style.setProperty("view-transition-name", tag + "root");
    if (o.mode !== "none")
      A.els.forEach((el, i) => {
        if (inView(el, clip)) name(el, tag + i);
      });
    let out: AutoResult | null = null;
    const vt = (document as Document & { startViewTransition: (cb: () => Promise<void>) => ViewTransition }).startViewTransition(
      async () => {
        await update();
        clear();
        const B = measure(root);
        out = finish(B);
        if (o.mode !== "none") {
          const clipB = clipOf(root);
          for (const p of out.result.pairs) {
            const a = A.els[p.a],
              b = B.els[p.b];
            if (a && b && inView(b, clipB) && inView(a, clip)) name(b, tag + p.a);
          }
        }
      },
    );
    running = { skip: () => vt.skipTransition?.() };
    try {
      await vt.finished;
    } catch {
      /* skipped */
    }
    clear();
    root.style.removeProperty("view-transition-name");
    running = null;
    if (out && o.highlight) highlight(out);
    return out;
  }

  // FLIP fallback.
  const clip = clipOf(root);
  const rects = A.els.map((el) => el.getBoundingClientRect());
  A.els.forEach((el, i) => el.setAttribute("data-rm-i", String(i)));
  const ghost = root.cloneNode(true) as HTMLElement;
  A.els.forEach((el) => el.removeAttribute("data-rm-i"));
  const rr = root.getBoundingClientRect();
  Object.assign(ghost.style, {
    position: "absolute",
    left: "0",
    top: "0",
    width: rr.width + "px",
    height: rr.height + "px",
    margin: "0",
    pointerEvents: "none",
    zIndex: "3",
  });
  ghost.setAttribute("aria-hidden", "true");
  ghost.removeAttribute("id");
  await update();
  const B = measure(root);
  const out = finish(B);
  if (o.mode !== "none") {
    const matchedA = new Set(out.result.pairs.map((p) => p.a));
    ghost.querySelectorAll<HTMLElement>("[data-rm-i]").forEach((e) => {
      if (matchedA.has(+e.dataset.tlI!)) e.style.visibility = "hidden";
    });
  }
  const host = root.parentElement!;
  const prevPos = host.style.position;
  if (getComputedStyle(host).position === "static") host.style.position = "relative";
  ghost.style.left = rr.left - host.getBoundingClientRect().left + "px";
  ghost.style.top = rr.top - host.getBoundingClientRect().top + "px";
  host.appendChild(ghost);
  const anims: Animation[] = [
    ghost.animate([{ opacity: 1 }, { opacity: 0 }], { duration: duration * 0.7, easing: "ease-out", fill: "forwards" }),
  ];
  if (o.mode !== "none") {
    const matchedB = new Set(out.result.pairs.map((p) => p.b));
    const hasMatchedDesc = new Set<number>();
    for (const j of matchedB) {
      let q = B.nodes[j].parent;
      while (q >= 0) {
        if (matchedB.has(q)) hasMatchedDesc.add(q);
        q = B.nodes[q].parent;
      }
    }
    for (const p of out.result.pairs) {
      if (hasMatchedDesc.has(p.b)) continue;
      const el = B.els[p.b],
        from = rects[p.a];
      if (!el || !inView(A.els[p.a] ?? el, clip)) continue;
      const to = el.getBoundingClientRect();
      if (!to.width || !to.height) continue;
      const dx = from.left - to.left,
        dy = from.top - to.top,
        sx = from.width / to.width,
        sy = from.height / to.height;
      if (Math.abs(dx) < 0.5 && Math.abs(dy) < 0.5 && Math.abs(sx - 1) < 0.01 && Math.abs(sy - 1) < 0.01) continue;
      const prev = { position: el.style.position, zIndex: el.style.zIndex, transformOrigin: el.style.transformOrigin };
      if (getComputedStyle(el).position === "static") el.style.position = "relative";
      el.style.zIndex = "4";
      el.style.transformOrigin = "0 0";
      const a = el.animate([{ transform: `translate(${dx}px,${dy}px) scale(${sx},${sy})` }, { transform: "none" }], { duration, easing });
      a.finished.catch(() => {}).finally(() => Object.assign(el.style, prev));
      anims.push(a);
    }
  }
  running = { skip: () => anims.forEach((a) => a.finish()) };
  await Promise.all(anims.map((a) => a.finished.catch(() => {})));
  ghost.remove();
  host.style.position = prevPos;
  running = null;
  if (o.highlight) highlight(out);
  return out;
}

/** Briefly mark elements whose text changed and elements that are new. */
export function highlight(r: AutoResult, ms = 2200) {
  const marks: HTMLElement[] = [];
  for (const p of r.result.pairs) {
    const a = r.A.nodes[p.a],
      b = r.B.nodes[p.b];
    if (a.text !== b.text && b.text) marks.push(r.B.els[p.b]);
  }
  const added = new Set(r.result.added);
  for (const j of r.result.added) if (!added.has(r.B.nodes[j].parent)) marks.push(r.B.els[j]);
  marks.forEach((el, k) => {
    el.classList.add("rm-mark");
    el.style.setProperty("--rm-k", String(k));
    setTimeout(() => el.classList.remove("rm-mark"), ms);
  });
  return marks.length;
}
