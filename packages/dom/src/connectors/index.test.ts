// @vitest-environment happy-dom
import { beforeAll, describe, expect, it } from "vitest";
import { connectorPath, connectorRoute, connectors, pointAlong } from "./index";
import { manualLoop, mount, useFakeLayout } from "../test-utils";

beforeAll(useFakeLayout);

/** A root with an SVG laid over it, as the React part builds it. */
function setUp(html: string) {
  const root = mount(`<svg data-box="0 0 1000 800"></svg>${html}`);
  const svg = root.querySelector("svg")!;
  return {
    root,
    svg,
    paths: () => [...svg.querySelectorAll("path.rm-connector")],
  };
}

describe("connectorPath", () => {
  it("goes down, then turns across with a rounded corner", () => {
    expect(
      connectorPath({
        from: { x: 10, y: 20 },
        to: { x: 60, y: 100 },
        shape: "elbow",
        radius: 12,
      }),
    ).toBe("M10 20V88Q10 100 22 100H60");
  });

  it("keeps the corner no bigger than the space it has", () => {
    expect(
      connectorPath({
        from: { x: 10, y: 20 },
        to: { x: 15, y: 100 },
        shape: "elbow",
        radius: 12,
      }),
    ).toBe("M10 20V95Q10 100 15 100H15");
  });

  it("bends smoothly when the element isn't below and to the right", () => {
    expect(
      connectorPath({
        from: { x: 100, y: 100 },
        to: { x: 40, y: 60 },
        shape: "elbow",
      }),
    ).toMatch(/^M100 100C/);
  });
});

describe("connectors", () => {
  const tree = `
    <div data-rm-anchor="src" data-box="0 0 20 20"></div>
    <div data-rm-anchor="a" data-rm-link="src" data-box="40 40 20 20"></div>
    <div data-rm-anchor="b" data-rm-link="src" data-box="40 80 20 20"></div>`;

  it("draws a line from each anchor to every element that links to it", () => {
    const { root, svg, paths } = setUp(tree);
    const c = connectors(root, svg, { loop: manualLoop().loop, gap: 0 });
    expect(paths()).toHaveLength(2);
    // From under the folder, down and across to the middle of the first file's left edge.
    expect(paths()[0]!.getAttribute("d")).toBe("M10 20V38Q10 50 22 50H40");
    // Lines there from the start are drawn at once.
    expect(paths()[0]!.hasAttribute("stroke-dasharray")).toBe(false);
    expect(svg.hasAttribute("data-rm-ignore")).toBe(true);
    c.destroy();
  });

  it("follows the elements as they move", async () => {
    const { root, svg, paths } = setUp(tree);
    const frames = manualLoop();
    const c = connectors(root, svg, { loop: frames.loop, gap: 0 });
    root.querySelector('[data-rm-anchor="b"]')!.setAttribute("data-box", "40 140 20 20");
    await Promise.resolve();
    frames.step();
    expect(paths()[1]!.getAttribute("d")).toBe("M10 20V138Q10 150 22 150H40");
    c.destroy();
  });

  it("draws new lines in, and draws leaving lines out before removing them", async () => {
    const { root, svg, paths } = setUp(tree);
    const frames = manualLoop();
    const c = connectors(root, svg, {
      loop: frames.loop,
      reducedMotion: "never",
    });
    const reply = document.createElement("div");
    reply.setAttribute("data-rm-anchor", "c");
    reply.setAttribute("data-rm-link", "src");
    reply.setAttribute("data-box", "40 120 20 20");
    root.append(reply);
    await Promise.resolve();
    frames.step();
    const added = paths()[2]!;
    expect(added.getAttribute("stroke-dashoffset")).not.toBe(null);
    frames.run(2);
    expect(added.hasAttribute("stroke-dasharray")).toBe(false);

    reply.remove();
    await Promise.resolve();
    frames.step();
    expect(paths()).toHaveLength(3);
    expect(added.getAttribute("data-rm-drawing")).toBe("");
    frames.run(2);
    expect(paths()).toHaveLength(2);
    c.destroy();
  });

  it("adds and removes lines at once with reduced motion", async () => {
    const { root, svg, paths } = setUp(tree);
    const frames = manualLoop();
    const c = connectors(root, svg, {
      loop: frames.loop,
      reducedMotion: "always",
    });
    root.querySelector('[data-rm-anchor="b"]')!.remove();
    await Promise.resolve();
    frames.step();
    expect(paths()).toHaveLength(1);
    c.destroy();
  });

  it("ignores elements inside an ignored layer, like a transition's leaving copies", () => {
    const { root, svg, paths } = setUp(`${tree}<div data-rm-ignore><div data-rm-link="src" data-box="40 200 20 20"></div></div>`);
    const c = connectors(root, svg, { loop: manualLoop().loop });
    expect(paths()).toHaveLength(2);
    c.destroy();
  });

  it("copies the linked element's data-rm-line onto its line, for styling", async () => {
    const { root, svg, paths } = setUp(tree);
    const frames = manualLoop();
    const c = connectors(root, svg, { loop: frames.loop });
    const b = root.querySelector('[data-rm-anchor="b"]')!;
    b.setAttribute("data-rm-line", "lit");
    await Promise.resolve();
    frames.step();
    expect(paths()[1]!.getAttribute("data-line")).toBe("lit");
    expect(paths()[0]!.hasAttribute("data-line")).toBe(false);
    b.removeAttribute("data-rm-line");
    await Promise.resolve();
    frames.step();
    expect(paths()[1]!.hasAttribute("data-line")).toBe(false);
    c.destroy();
  });

  it("can end lines at the top of the element, for timelines", () => {
    const { root, svg, paths } = setUp(`
      <div data-rm-anchor="one" data-box="0 0 20 20"></div>
      <div data-rm-anchor="two" data-rm-link="one" data-box="0 60 20 20"></div>`);
    const c = connectors(root, svg, {
      loop: manualLoop().loop,
      gap: 0,
      end: "top",
    });
    // Straight down from the middle of one to the middle of the next.
    expect(paths()[0]!.getAttribute("d")).toBe("M10 20L10 60");
    c.destroy();
  });

  it("goes to sleep when nothing changes", async () => {
    const { root, svg } = setUp(tree);
    const frames = manualLoop();
    const c = connectors(root, svg, { loop: frames.loop });
    root.querySelector('[data-rm-anchor="a"]')!.setAttribute("data-box", "40 44 20 20");
    await Promise.resolve();
    frames.run(1);
    expect(frames.active).toBe(0);
    c.destroy();
  });
});

describe("connectorRoute", () => {
  it("joins two facing sides with a step: across, down, across", () => {
    // Right side of one box to the left side of another, lower down: two rounded corners.
    const d = connectorRoute({
      from: { x: 0, y: 0 },
      fromSide: "right",
      to: { x: 100, y: 60 },
      toSide: "left",
      shape: "elbow",
      radius: 10,
    });
    expect(d).toBe("M0 0L40 0Q50 0 50 10L50 50Q50 60 60 60L100 60");
  });

  it("turns once between a vertical side and a horizontal one", () => {
    expect(
      connectorRoute({
        from: { x: 0, y: 0 },
        fromSide: "right",
        to: { x: 80, y: 50 },
        toSide: "top",
        shape: "elbow",
        radius: 10,
      }),
    ).toBe("M0 0L70 0Q80 0 80 10L80 50");
  });

  it("bends smoothly out of one side and into the other when an elbow would double back", () => {
    // The target is behind the side the line leaves from.
    expect(
      connectorRoute({
        from: { x: 100, y: 0 },
        fromSide: "right",
        to: { x: 0, y: 50 },
        toSide: "left",
        shape: "elbow",
      }),
    ).toMatch(/^M100 0C/);
    expect(
      connectorRoute({
        from: { x: 0, y: 0 },
        fromSide: "bottom",
        to: { x: 0, y: 100 },
        toSide: "top",
        shape: "curve",
      }),
    ).toMatch(/^M0 0C0 40 0 60 0 100$/);
  });
});

describe("pointAlong", () => {
  it("finds the point halfway along a path by length", () => {
    expect(pointAlong("M0 0L100 0", 0.5)).toEqual({ x: 50, y: 0 });
    const corner = pointAlong("M0 0L0 50L100 50", 0.5);
    expect(corner.x).toBeCloseTo(25, 0);
    expect(corner.y).toBeCloseTo(50, 0);
  });
});

describe("connectors: sides, labels, arrows and pulses", () => {
  const pair = (extra: string) => `
    <div data-rm-anchor="a" data-box="0 0 40 40"></div>
    <div data-rm-anchor="b" data-rm-link="a" ${extra} data-box="200 100 40 40"></div>`;

  it("lets a line choose the sides it leaves and arrives at", () => {
    const { root, svg, paths } = setUp(pair('data-rm-from-side="right" data-rm-to-side="left"'));
    const c = connectors(root, svg, {
      loop: manualLoop().loop,
      gap: 0,
      radius: 0,
    });
    // Out of the right side's middle, across, down, across into the left side's middle.
    expect(paths()[0]!.getAttribute("d")).toBe("M40 20L120 20Q120 20 120 20L120 120Q120 120 120 120L200 120");
    c.destroy();
  });

  it("labels a line halfway along, fading in with it", async () => {
    const { root, svg } = setUp(pair('data-rm-label="If yes"'));
    const c = connectors(root, svg, { loop: manualLoop().loop });
    const label = svg.querySelector("text.rm-connector-label")!;
    expect(label.textContent).toBe("If yes");
    expect(label.getAttribute("opacity")).toBe("1");
    c.destroy();
    expect(svg.querySelector("text")).toBeNull();
  });

  it("adds an arrowhead once a line has drawn in, for every line or one", async () => {
    const frames = manualLoop();
    const { root, svg, paths } = setUp(pair(""));
    const c = connectors(root, svg, { loop: frames.loop, arrow: true });
    expect(paths()[0]!.getAttribute("marker-end")).toMatch(/^url\(#rm-arrow-\d+\)$/);
    c.destroy();
    const single = setUp(pair('data-rm-arrow=""'));
    const d = connectors(single.root, single.svg, { loop: frames.loop });
    expect(single.paths()[0]!.hasAttribute("marker-end")).toBe(true);
    d.destroy();
  });

  it("sends one pulse each time the pulse value changes, after its delay", async () => {
    const frames = manualLoop();
    const { root, svg } = setUp(pair('data-rm-pulse="0" data-rm-pulse-delay="0.5"'));
    const c = connectors(root, svg, {
      loop: frames.loop,
      pulse: { duration: 1 },
    });
    const pulse = () => svg.querySelector("path.rm-connector-pulse")!;
    // The starting value doesn't send one.
    frames.run(2);
    expect(pulse().getAttribute("opacity")).toBe("0");
    root.querySelector("[data-rm-link]")!.setAttribute("data-rm-pulse", "1");
    await Promise.resolve();
    frames.step(0.25);
    expect(pulse().getAttribute("opacity")).toBe("0"); // still waiting out the delay
    frames.step(0.5);
    expect(pulse().getAttribute("opacity")).toBe("1");
    frames.run(3);
    expect(pulse().getAttribute("opacity")).toBe("0");
    expect(frames.active).toBe(0);
    c.destroy();
  });

  it("keeps looping pulses running, but sends none with reduced motion", () => {
    const frames = manualLoop();
    const looping = setUp(pair('data-rm-pulse="loop"'));
    const c = connectors(looping.root, looping.svg, { loop: frames.loop });
    frames.run(5);
    expect(frames.active).toBe(1);
    c.destroy();
    const calm = setUp(pair('data-rm-pulse="loop"'));
    const d = connectors(calm.root, calm.svg, {
      loop: frames.loop,
      reducedMotion: "always",
    });
    expect(calm.svg.querySelector("path.rm-connector-pulse")).toBeNull();
    d.destroy();
  });
});
