/**
 * "What became what": run the matcher on the benchmark scenarios and show the result.
 * Matched elements share a colour; hover one to highlight its partner.
 */
import { matchNodes, type MatchNode, type NodeMatches } from "@remold-ui/core";
// The benchmark lives in core's source (it isn't part of the published package).
import { truth } from "../../../packages/core/src/match/benchmark/build";
import { scenarios } from "../../../packages/core/src/match/benchmark/scenarios";
import { matchByExactText, matchByTreePosition, relations, score } from "../../../packages/core/src/match/benchmark/score";

const SVG = "http://www.w3.org/2000/svg";
const PANEL_WIDTH = 320;

const matchers: Record<string, (a: MatchNode[], b: MatchNode[]) => NodeMatches> = {
  Remold: (a, b) => matchNodes(a, b),
  "Tree position": matchByTreePosition,
  "Exact text": matchByExactText,
};

/** For each node on each side, a group id shared with its partner(s), or null if unmatched. */
function groups(result: NodeMatches, sizeA: number, sizeB: number) {
  const a: (number | null)[] = new Array(sizeA).fill(null);
  const b: (number | null)[] = new Array(sizeB).fill(null);
  let next = 0;
  for (const p of result.pairs) a[p.from] = b[p.to] = next++;
  for (const s of result.splits) {
    a[s.from] = next;
    for (const j of s.to) b[j] = next;
    next++;
  }
  for (const m of result.merges) {
    b[m.to] = next;
    for (const i of m.from) a[i] = next;
    next++;
  }
  return { a, b, count: next };
}

/** Draw one page as boxes, scaled to the panel width. Returns each node's element by index. */
function drawPage(svg: SVGSVGElement, nodes: MatchNode[], group: (number | null)[], wrong: Set<number>): SVGGElement[] {
  // Nodes are in root widths; a mobile page is narrow, so scale by its own extent.
  const width = Math.max(...nodes.map((n) => n.x + n.width), 0.01);
  const height = Math.max(...nodes.map((n) => n.y + n.height), 0.01);
  const scale = PANEL_WIDTH / width;
  svg.setAttribute("viewBox", `0 0 ${PANEL_WIDTH} ${height * scale}`);
  svg.replaceChildren();

  return nodes.map((n, i) => {
    const g = document.createElementNS(SVG, "g");
    const rect = document.createElementNS(SVG, "rect");
    rect.setAttribute("x", String(n.x * scale));
    rect.setAttribute("y", String(n.y * scale));
    rect.setAttribute("width", String(Math.max(1, n.width * scale)));
    rect.setAttribute("height", String(Math.max(1, n.height * scale)));
    rect.setAttribute("rx", "2");
    const id = group[i];
    if (id === null || id === undefined) {
      g.classList.add("unmatched");
    } else {
      // Spread hues around the wheel with the golden angle, so neighbours look different.
      rect.style.setProperty("--hue", String((id * 137.5) % 360));
      g.classList.add("matched");
      g.dataset.group = String(id);
    }
    if (wrong.has(i)) g.classList.add("wrong");
    g.append(rect);
    if (n.text && n.kind !== "box") {
      const label = document.createElementNS(SVG, "text");
      label.setAttribute("x", String(n.x * scale + 2));
      label.setAttribute("y", String(n.y * scale + Math.min(n.height * scale, 11) - 2));
      label.textContent = n.text;
      g.append(label);
    }
    const title = document.createElementNS(SVG, "title");
    title.textContent = n.text || n.media || n.kind;
    g.append(title);
    svg.append(g);
    return g;
  });
}

export function setUpMatching() {
  const scenarioSelect = document.getElementById("scenario") as HTMLSelectElement;
  const matcherSelect = document.getElementById("matcher") as HTMLSelectElement;
  const before = document.getElementById("before") as unknown as SVGSVGElement;
  const after = document.getElementById("after") as unknown as SVGSVGElement;
  const note = document.getElementById("scenario-note")!;
  const summary = document.getElementById("match-summary")!;
  const scores = document.getElementById("match-scores")!;

  for (const s of scenarios) scenarioSelect.add(new Option(s.name, s.id));
  for (const name of Object.keys(matchers)) matcherSelect.add(new Option(name));

  function render() {
    const scenario = scenarios.find((s) => s.id === scenarioSelect.value)!;
    const expected = truth(scenario.from, scenario.to);
    const result = matchers[matcherSelect.value]!(scenario.from.nodes, scenario.to.nodes);
    const claimed = relations(result);

    // Elements involved in a wrong claim, on each side.
    const wrongA = new Set<number>();
    const wrongB = new Set<number>();
    for (const r of claimed) {
      if (expected.has(r)) continue;
      const [i, j] = r.split(">").map(Number);
      wrongA.add(i!);
      wrongB.add(j!);
    }

    const g = groups(result, scenario.from.nodes.length, scenario.to.nodes.length);
    const elementsA = drawPage(before, scenario.from.nodes, g.a, wrongA);
    const elementsB = drawPage(after, scenario.to.nodes, g.b, wrongB);
    for (const el of [...elementsA, ...elementsB]) {
      const id = el.dataset.group;
      if (id === undefined) continue;
      const partners = [...elementsA, ...elementsB].filter((e) => e.dataset.group === id);
      el.addEventListener("pointerenter", () => partners.forEach((p) => p.classList.add("hot")));
      el.addEventListener("pointerleave", () => partners.forEach((p) => p.classList.remove("hot")));
    }

    note.textContent = scenario.note;
    summary.textContent =
      `${result.pairs.length} pairs, ${result.splits.length} splits, ${result.merges.length} merges, ` +
      `${result.removed.length} removed, ${result.added.length} added.`;
    scores.replaceChildren(
      ...Object.entries(matchers).map(([name, matcher]) => {
        const s = score(relations(matcher(scenario.from.nodes, scenario.to.nodes)), expected);
        const li = document.createElement("li");
        li.textContent = `${name}: F1 ${(s.f1 * 100).toFixed(1)}%  (${s.correct} of ${s.expected} found, ${s.claimed - s.correct} wrong)`;
        if (name === matcherSelect.value) li.className = "current";
        return li;
      }),
    );
  }

  scenarioSelect.addEventListener("change", render);
  matcherSelect.addEventListener("change", render);
  render();
}
