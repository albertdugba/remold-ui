// @vitest-environment happy-dom
import type { FrameCallback, FrameLoop } from "@remold-ui/dom";
import { shapes } from "@remold-ui/core";
import { act, StrictMode, createRef, useEffect, useRef, useState, type ReactNode } from "react";
import { createRoot, type Root as ReactRoot } from "react-dom/client";
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { Remold, useAutoplay, useDragToDismiss, useDust, useRemold, useRemoldMorph, useViewTransition, type Transition } from "./canvas.js";
import * as Interface from "./index.js";

/** Every fill on any canvas: cubes and objects each fill their sides and top. */
let fills = 0;

declare global {
  // eslint-disable-next-line no-var
  var IS_REACT_ACT_ENVIRONMENT: boolean;
}

beforeAll(() => {
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  // happy-dom has no layout: elements report the box in their data-box attribute.
  Element.prototype.getBoundingClientRect = function (this: Element) {
    const [x = 0, y = 0, width = 0, height = 0] = (this.getAttribute("data-box") ?? "0 0 800 800").split(" ").map(Number);
    return { x, y, width, height, left: x, top: y, right: x + width, bottom: y + height, toJSON() {} } as DOMRect;
  };
  // …and no canvas drawing: a context that accepts every call.
  HTMLCanvasElement.prototype.getContext = (() => {
    const gradient = { addColorStop() {} };
    return new Proxy(
      {},
      {
        get: (_, key) => (key === "createLinearGradient" ? () => gradient : key === "fill" ? () => fills++ : () => {}),
        set: () => true,
      },
    );
  }) as unknown as HTMLCanvasElement["getContext"];
});

function manualLoop() {
  const callbacks = new Set<FrameCallback>();
  const loop: FrameLoop = { add: (cb) => (callbacks.add(cb), () => callbacks.delete(cb)) };
  return {
    loop,
    run() {
      for (let i = 0; i < 300 && callbacks.size; i++) for (const cb of [...callbacks]) if (!cb(1 / 60)) callbacks.delete(cb);
    },
    /** Something is still animating. */
    get running() {
      return callbacks.size > 0;
    },
  };
}

let container: HTMLElement;
let root: ReactRoot;
beforeEach(() => {
  container = document.createElement("div");
  document.body.replaceChildren(container);
  root = createRoot(container);
});
afterEach(() => act(() => root.unmount()));

const render = (node: ReactNode) => act(async () => root.render(<StrictMode>{node}</StrictMode>));
const Item = ({ text, y }: { text: string; y: number }) => (
  <p data-box={`0 ${y} 200 30`} style={{ fontSize: 16 }}>
    {text}
  </p>
);
const find = (text: string) => [...container.querySelectorAll("p")].find((p) => p.textContent === text)!;
const translateOf = (el: HTMLElement) => el.style.translate.split(" ").filter(Boolean).map(Number.parseFloat);

describe("Remold.Morph", () => {
  function List(props: {
    order: string[];
    loop: FrameLoop;
    onTransition?: (t: Transition) => void;
    className?: Remold.Morph.Props["className"];
  }) {
    const { order, ...rest } = props;
    return (
      <Remold.Morph trigger={order.join()} reducedMotion="never" data-box="0 0 800 800" {...rest}>
        {/* New keys on purpose: React rebuilds every element, and Remold still matches them. */}
        {order.map((text, i) => (
          <Item key={`${text}-${order.join()}`} text={text} y={i * 50} />
        ))}
      </Remold.Morph>
    );
  }

  it("animates when the trigger changes, matching elements React rebuilt", async () => {
    const frames = manualLoop();
    const onTransition = vi.fn<(t: Transition) => void>();
    await render(<List order={["Alpha", "Beta"]} loop={frames.loop} onTransition={onTransition} />);
    expect(onTransition).not.toHaveBeenCalled();

    await render(<List order={["Beta", "Alpha"]} loop={frames.loop} onTransition={onTransition} />);
    // Once, even in StrictMode.
    expect(onTransition).toHaveBeenCalledTimes(1);
    const transition = onTransition.mock.calls[0]![0];
    expect((await transition.ready).matches.pairs).toHaveLength(2);
    expect(translateOf(find("Alpha"))).toEqual([0, -50]);
    expect(container.firstElementChild!.hasAttribute("data-rm-animating")).toBe(true);

    await act(async () => {
      frames.run();
      await transition.finished;
    });
    expect(find("Alpha").style.translate).toBe("");
    expect(container.firstElementChild!.hasAttribute("data-rm-animating")).toBe(false);
  });

  it("takes an array of triggers, compared item by item like effect dependencies", async () => {
    const frames = manualLoop();
    const onTransition = vi.fn();
    const view = (sort: string, filter: string) => (
      <Remold.Morph trigger={[sort, filter]} loop={frames.loop} onTransition={onTransition}>
        <Item text="Alpha" y={0} />
      </Remold.Morph>
    );
    await render(view("name", "all"));
    // A new array with the same items isn't a change.
    await render(view("name", "all"));
    expect(onTransition).not.toHaveBeenCalled();
    await render(view("name", "open"));
    expect(onTransition).toHaveBeenCalledTimes(1);
  });

  it("does nothing when the trigger stays the same, or when disabled", async () => {
    const frames = manualLoop();
    const onTransition = vi.fn();
    await render(<List order={["Alpha"]} loop={frames.loop} onTransition={onTransition} />);
    await render(<List order={["Alpha"]} loop={frames.loop} onTransition={onTransition} />);
    await render(
      <Remold.Morph trigger="other" disabled loop={frames.loop} onTransition={onTransition}>
        <Item text="Alpha" y={0} />
      </Remold.Morph>,
    );
    expect(onTransition).not.toHaveBeenCalled();
  });

  it("gives className and render the part's state", async () => {
    const frames = manualLoop();
    const className = (state: Remold.Morph.State) => (state.animating ? "moving" : "still");
    await render(<List order={["Alpha", "Beta"]} loop={frames.loop} className={className} />);
    expect(container.firstElementChild!.className).toBe("still");
    await render(<List order={["Beta", "Alpha"]} loop={frames.loop} className={className} />);
    expect(container.firstElementChild!.className).toBe("moving");
  });

  it("renders your own element, merging props and refs", async () => {
    const ref = createRef<HTMLDivElement>();
    const theirs = createRef<HTMLElement>();
    await render(<Remold.Morph trigger={1} ref={ref} className="ours" render={<section ref={theirs} className="theirs" />} />);
    const section = container.querySelector("section")!;
    expect(section.className).toBe("ours theirs");
    expect(ref.current).toBe(section);
    expect(theirs.current).toBe(section);
  });

  it("render can be a function of props and state", async () => {
    await render(
      <Remold.Morph trigger={1} render={(props, state) => <ul {...(props as object)} data-busy={String(state.animating)} />} />,
    );
    expect(container.querySelector("ul")!.getAttribute("data-busy")).toBe("false");
  });
});

describe("useRemoldMorph", () => {
  it("animates any element that forwards its ref, like a library component", async () => {
    const frames = manualLoop();
    const onTransition = vi.fn<(t: Transition) => void>();
    // Stands in for a Base UI or MUI part: renders its own element and forwards the ref.
    const Card = ({ ref, children }: { ref: (node: HTMLElement | null) => void; children: ReactNode }) => (
      <article ref={ref} data-box="0 0 800 800">
        {children}
      </article>
    );
    function Sorted({ order }: { order: string[] }) {
      const { ref, animating } = useRemoldMorph<HTMLElement>(order.join(), { reducedMotion: "never", loop: frames.loop, onTransition });
      return (
        <Card ref={ref}>
          <span data-animating={String(animating)} />
          {order.map((text, i) => (
            <Item key={`${text}-${order.join()}`} text={text} y={i * 50} />
          ))}
        </Card>
      );
    }
    await render(<Sorted order={["Alpha", "Beta"]} />);
    expect(onTransition).not.toHaveBeenCalled();

    await render(<Sorted order={["Beta", "Alpha"]} />);
    expect(onTransition).toHaveBeenCalledTimes(1);
    const transition = onTransition.mock.calls[0]![0];
    expect((await transition.ready).matches.pairs).toHaveLength(2);
    expect(translateOf(find("Alpha"))).toEqual([0, -50]);
    expect(container.querySelector("span")!.dataset.animating).toBe("true");

    await act(async () => {
      frames.run();
      await transition.finished;
    });
    expect(container.querySelector("span")!.dataset.animating).toBe("false");
  });
});

describe("useRemold", () => {
  it("animates a state change made in an event handler", async () => {
    const frames = manualLoop();
    let result: Transition | null = null;
    function Sorter() {
      const [order, setOrder] = useState(["Alpha", "Beta"]);
      const { ref, animate } = useRemold({ loop: frames.loop, reducedMotion: "never" });
      return (
        <>
          <button onClick={() => (result = animate(() => setOrder(["Beta", "Alpha"])))}>Sort</button>
          <div ref={ref} data-box="0 0 800 800">
            {order.map((text, i) => (
              <Item key={`${text}${i}`} text={text} y={i * 50} />
            ))}
          </div>
        </>
      );
    }
    await render(<Sorter />);
    await act(async () => container.querySelector("button")!.click());
    expect((await result!.ready).matches.pairs).toHaveLength(2);
    expect(translateOf(find("Alpha"))).toEqual([0, -50]);
  });
});

describe("useViewTransition", () => {
  it("falls back to an interruptible Remold transition where View Transitions are unavailable", async () => {
    const frames = manualLoop();
    let result: Transition | null = null;
    function Sorter() {
      const [order, setOrder] = useState(["Alpha", "Beta"]);
      const { ref, animate } = useViewTransition({ loop: frames.loop, reducedMotion: "never" });
      return (
        <>
          <button onClick={() => (result = animate(() => setOrder(["Beta", "Alpha"])))}>Sort</button>
          <div ref={ref} data-box="0 0 800 800">
            {order.map((text, i) => (
              <Item key={`${text}${i}`} text={text} y={i * 50} />
            ))}
          </div>
        </>
      );
    }
    await render(<Sorter />);
    await act(async () => container.querySelector("button")!.click());
    expect((await result!.ready).matches.pairs).toHaveLength(2);
    expect(translateOf(find("Alpha"))).toEqual([0, -50]);
  });
});

describe("Remold.Text", () => {
  it("renders the first text normally, then morphs letters", async () => {
    const frames = manualLoop();
    await render(<Remold.Text loop={frames.loop}>Saving</Remold.Text>);
    const span = container.querySelector("span")!;
    expect(span.textContent).toBe("Saving");
    await render(<Remold.Text loop={frames.loop}>Saved</Remold.Text>);
    // Screen readers get the plain text; the letters are for the eye.
    expect(span.firstElementChild!.textContent).toBe("Saved");
    expect(span.lastElementChild!.getAttribute("aria-hidden")).toBe("true");
    expect(span.hasAttribute("data-rm-animating")).toBe(true);
    await act(async () => frames.run());
    expect(span.hasAttribute("data-rm-animating")).toBe(false);
    // Re-rendering with the same text must not disturb the letters.
    await render(<Remold.Text loop={frames.loop}>Saved</Remold.Text>);
    expect(span.firstElementChild!.textContent).toBe("Saved");
  });
});

describe("Remold.Ignore", () => {
  it("marks its contents to be skipped, without affecting layout", async () => {
    await render(
      <Remold.Ignore>
        <b>Ad</b>
      </Remold.Ignore>,
    );
    const wrapper = container.firstElementChild as HTMLElement;
    expect(wrapper.hasAttribute("data-rm-ignore")).toBe(true);
    expect(wrapper.style.display).toBe("contents");
  });
});

describe("entry points", () => {
  it("keeps canvas parts out of the main entry, and offers everything from /canvas", () => {
    for (const part of ["Scene", "Story", "Particles", "Canvas", "Globe", "DotGrid"]) {
      expect(part in Interface.Remold).toBe(false);
      expect(part in Remold).toBe(true);
    }
    expect(Object.keys(Interface.Remold).every((part) => part in Remold)).toBe(true);
    expect("useDust" in Interface).toBe(false);
  });
});

describe("Remold.Scene", () => {
  const objects = { core: { look: "plate" as const, label: "core" }, react: { look: "chip" as const, label: "react" } };
  const layouts = {
    a: { objects: { core: { x: 0, y: 0, width: 100, depth: 100 }, react: { x: 200, y: 200, width: 60, depth: 60 } } },
    b: { objects: { core: { x: 200, y: 0, width: 100, depth: 100 }, react: { x: -200, y: 200, width: 60, depth: 60 } } },
  };

  it("follows a controlled layout and reflects it as state", async () => {
    const frames = manualLoop();
    const actions = createRef<Remold.Scene.Actions | null>() as React.RefObject<Remold.Scene.Actions | null>;
    const scene = (layout: string) => (
      <Remold.Scene
        label="Demo"
        layout={layout}
        objects={objects}
        layouts={layouts}
        loop={frames.loop}
        reducedMotion="never"
        actionsRef={actions}
      />
    );
    await render(scene("a"));
    const canvas = container.querySelector("canvas")!;
    expect(canvas.getAttribute("aria-label")).toBe("Demo");
    expect(canvas.getAttribute("data-rm-layout")).toBe("a");

    await render(scene("b"));
    expect(canvas.getAttribute("data-rm-layout")).toBe("b");
    await act(async () => frames.run());
    expect(actions.current!.box("core")!.x).toBe(200);
  });

  it("exposes named ports as anchors for DOM annotations", async () => {
    const actions = createRef<Remold.Scene.Actions | null>() as React.RefObject<Remold.Scene.Actions | null>;
    await render(<Remold.Scene objects={objects} layouts={layouts} loop={manualLoop().loop} actionsRef={actions} />);
    expect(actions.current!.anchor("core", "left")).not.toEqual(actions.current!.anchor("core", "right"));
  });

  it("focus can be controlled: the parent decides", async () => {
    const frames = manualLoop();
    const changes: (string | null)[] = [];
    function Controlled() {
      const [focused, setFocused] = useState<string | null>(null);
      const actions = useRef<Remold.Scene.Actions | null>(null);
      return (
        <Remold.Scene
          objects={objects}
          layouts={layouts}
          loop={frames.loop}
          focused={focused}
          // Only "core" may be focused.
          onFocusedChange={(id) => {
            changes.push(id);
            if (id === null || id === "core") setFocused(id);
          }}
          actionsRef={actions}
        />
      );
    }
    await render(<Controlled />);
    const canvas = container.querySelector("canvas")!;
    // What the scene itself shows as focused (its screen-reader description names it).
    const description = document.getElementById(canvas.getAttribute("aria-describedby")!)!;
    const shown: (string | null)[] = [];
    const described: string[] = [];
    // Two arrow presses visit both objects, so the user asks for both.
    for (let i = 0; i < 2; i++) {
      await act(async () => canvas.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowRight" })));
      shown.push(canvas.getAttribute("data-rm-focused"));
      described.push(description.textContent ?? "");
    }
    expect(changes).toEqual(expect.arrayContaining(["core", "react"]));
    expect(shown).toContain("core");
    expect(shown).not.toContain("react");
    // The scene agrees with the parent: "react" was refused, so it never stays focused.
    expect(described).toContain("core");
    expect(described).not.toContain("react");
  });

  it("keeps its own focus when uncontrolled, and reports changes", async () => {
    const onFocusedChange = vi.fn();
    await render(
      <Remold.Scene
        objects={objects}
        layouts={layouts}
        loop={manualLoop().loop}
        defaultFocused="react"
        onFocusedChange={onFocusedChange}
      />,
    );
    const canvas = container.querySelector("canvas")!;
    expect(canvas.getAttribute("data-rm-focused")).toBe("react");
    await act(async () => canvas.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" })));
    expect(onFocusedChange).toHaveBeenLastCalledWith(null);
    expect(canvas.hasAttribute("data-rm-focused")).toBe(false);
  });

  it("points sent from a parent's mount effect are drawn, even in StrictMode", async () => {
    let actionsSeen: Remold.Scene.Actions | null = null;
    function Parent() {
      const actions = useRef<Remold.Scene.Actions | null>(null);
      useEffect(() => {
        actions.current!.points([
          { x: 0, y: 0 },
          { x: 40, y: 0 },
        ]);
        actionsSeen = actions.current;
      }, []);
      // No objects, so every fill comes from a cube.
      return (
        <Remold.Scene
          objects={{}}
          layouts={{ only: { objects: {} } }}
          reducedMotion="always"
          loop={manualLoop().loop}
          actionsRef={actions}
        />
      );
    }
    await render(<Parent />);
    fills = 0;
    actionsSeen!.redraw();
    // Two cubes, two fills each (sides and top).
    expect(fills).toBe(4);
  });

  it("cleans up when it unmounts", async () => {
    await render(<Remold.Scene label="Demo" objects={objects} layouts={layouts} loop={manualLoop().loop} />);
    await render(<></>);
    expect(document.querySelector("[aria-live]")).toBeNull();
  });
});

describe("Remold.Story", () => {
  const objects = { gateway: { look: "glass" as const, label: "gateway" }, queue: { look: "wire" as const, label: "queue" } };
  const layouts = {
    direct: { objects: { gateway: { x: 0, y: 0, width: 120, depth: 80 }, queue: { x: 200, y: 0, width: 100, depth: 70, opacity: 0 } } },
    buffered: { objects: { gateway: { x: -140, y: 0, width: 120, depth: 80 }, queue: { x: 120, y: 0, width: 100, depth: 70 } } },
  };
  const chapters = [
    { id: "direct", layout: "direct", focused: "gateway", title: "Direct", annotation: { object: "gateway", port: "top" as const } },
    { id: "buffered", layout: "buffered", focused: "queue", title: "Buffered", annotation: { object: "queue", port: "right" as const } },
  ];

  it("owns an uncontrolled chapter, anchors its annotation and exposes story actions", async () => {
    const actions = createRef<Remold.Story.Actions | null>() as React.RefObject<Remold.Story.Actions | null>;
    const onChapterChange = vi.fn();
    await render(
      <Remold.Story
        objects={objects}
        layouts={layouts}
        chapters={chapters}
        actionsRef={actions}
        onChapterChange={onChapterChange}
        loop={manualLoop().loop}
        reducedMotion="always"
      />,
    );
    const story = container.firstElementChild as HTMLElement;
    expect(story.getAttribute("data-rm-chapter")).toBe("direct");
    expect(story.querySelector("[data-rm-story-annotation]")?.textContent).toContain("Direct");
    expect(actions.current!.anchor("gateway", "left")).not.toEqual(actions.current!.anchor("gateway", "right"));

    await act(async () => actions.current!.go("buffered"));
    expect(story.getAttribute("data-rm-chapter")).toBe("buffered");
    expect(actions.current!.chapter).toBe("buffered");
    expect(onChapterChange).toHaveBeenLastCalledWith("buffered");
    expect(() => actions.current!.go("missing")).toThrow(RangeError);
  });

  it("reports but does not replace a controlled chapter", async () => {
    const onChapterChange = vi.fn();
    const actions = createRef<Remold.Story.Actions | null>() as React.RefObject<Remold.Story.Actions | null>;
    await render(
      <Remold.Story
        chapter="direct"
        objects={objects}
        layouts={layouts}
        chapters={chapters}
        actionsRef={actions}
        onChapterChange={onChapterChange}
        loop={manualLoop().loop}
      />,
    );
    await act(async () => actions.current!.go("buffered"));
    expect(container.firstElementChild?.getAttribute("data-rm-chapter")).toBe("direct");
    expect(onChapterChange).toHaveBeenLastCalledWith("buffered");
  });
});

describe("Remold.Icon", () => {
  const LINE = "M4 12h16";
  const CROSS = "M5 5l14 14M19 5L5 19";

  it("renders the first icon, then morphs to the next and lands exactly on it", async () => {
    const frames = manualLoop();
    await render(<Remold.Icon path={LINE} loop={frames.loop} reducedMotion="never" stroke="currentColor" />);
    const path = container.querySelector("path")!;
    expect(path.getAttribute("d")).toBe(LINE);
    expect(container.querySelector("svg")!.getAttribute("viewBox")).toBe("0 0 24 24");

    await render(<Remold.Icon path={CROSS} loop={frames.loop} reducedMotion="never" stroke="currentColor" />);
    expect(container.querySelector("svg")!.hasAttribute("data-rm-animating")).toBe(true);
    await act(async () => frames.run());
    expect(path.getAttribute("d")).toBe(CROSS);
    expect(container.querySelector("svg")!.hasAttribute("data-rm-animating")).toBe(false);
  });

  it("keeps one identity while it reshapes, so a layout transition doesn't fade it in again", async () => {
    await render(<Remold.Icon path={LINE} reducedMotion="always" />);
    const identity = container.querySelector("svg")!.getAttribute("data-rm-media");
    expect(identity).toBeTruthy();

    await render(<Remold.Icon path={CROSS} reducedMotion="always" />);
    expect(container.querySelector("svg")!.getAttribute("data-rm-media")).toBe(identity);
  });

  it("jumps straight to the new icon with reduced motion", async () => {
    await render(<Remold.Icon path={LINE} reducedMotion="always" />);
    await render(<Remold.Icon path={CROSS} reducedMotion="always" />);
    expect(container.querySelector("path")!.getAttribute("d")).toBe(CROSS);
  });

  it("stops the previous animation when the icon changes again", async () => {
    const frames = manualLoop();
    await render(<Remold.Icon path={LINE} loop={frames.loop} reducedMotion="never" />);
    await render(<Remold.Icon path={CROSS} loop={frames.loop} reducedMotion="never" />);
    await render(<Remold.Icon path={LINE} loop={frames.loop} reducedMotion="never" />);
    await act(async () => frames.run());
    expect(container.querySelector("path")!.getAttribute("d")).toBe(LINE);
    expect(container.querySelector("svg")!.hasAttribute("data-rm-animating")).toBe(false);
  });
});

describe("Remold.Icon with an icon", () => {
  /** Shaped like icon-set components (Lucide's, say): an svg with its look and a few shapes. */
  const Search = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
      <circle cx="11" cy="11" r="8" />
      <path d="m21 21-4.3-4.3" />
    </svg>
  );
  const Menu = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
      <line x1="4" y1="6" x2="20" y2="6" />
      <line x1="4" y1="18" x2="20" y2="18" />
    </svg>
  );
  const SEARCH = "M19 11A8 8 0 0 1 3 11A8 8 0 0 1 19 11ZM21 21l-4.3-4.3";
  const MENU = "M4 6L20 6M4 18L20 18";

  it("reads an icon element into one path with its look, and keeps the original hidden", async () => {
    await render(<Remold.Icon icon={<Search />} className="size-6" />);
    const svg = container.querySelector("svg.size-6")!;
    expect(svg.querySelector(":scope > path")!.getAttribute("d")).toBe(SEARCH);
    expect(svg.getAttribute("viewBox")).toBe("0 0 24 24");
    expect(svg.getAttribute("stroke")).toBe("currentColor");
    expect(svg.getAttribute("fill")).toBe("none");
    expect(svg.getAttribute("stroke-linecap")).toBe("round");
    expect((svg.querySelector(":scope > g") as SVGGElement).style.display).toBe("none");
  });

  it("takes a component as well as an element, and lets props override the icon's look", async () => {
    await render(<Remold.Icon icon={Search} strokeWidth={1.5} />);
    const svg = container.querySelector("svg")!;
    expect(svg.querySelector(":scope > path")!.getAttribute("d")).toBe(SEARCH);
    expect(svg.getAttribute("stroke-width")).toBe("1.5");
  });

  it("morphs from one icon to the next and lands exactly on it", async () => {
    const frames = manualLoop();
    await render(<Remold.Icon icon={<Search />} loop={frames.loop} reducedMotion="never" />);
    const path = container.querySelector("svg > path")!;
    await render(<Remold.Icon icon={<Menu />} loop={frames.loop} reducedMotion="never" />);
    expect(container.querySelector("svg")!.hasAttribute("data-rm-animating")).toBe(true);
    await act(async () => frames.run());
    expect(path.getAttribute("d")).toBe(MENU);
  });

  it("asks for an icon or path data", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    await expect(render(<Remold.Icon />)).rejects.toThrow(/icon.*or SVG path data/);
  });
});

describe("Remold.PathGroup", () => {
  it("keeps independently morphing paths in one accessible SVG", async () => {
    const frames = manualLoop();
    await render(
      <Remold.PathGroup
        viewBox="0 0 24 24"
        loop={frames.loop}
        paths={[
          { id: "one", path: "M4 12h16", stroke: "currentColor" },
          { id: "two", path: "M12 4v16", stroke: "currentColor" },
        ]}
      />,
    );
    expect(container.querySelector("svg")!.getAttribute("data-rm-paths")).toBe("2");
    await render(
      <Remold.PathGroup
        viewBox="0 0 24 24"
        loop={frames.loop}
        paths={[
          { id: "one", path: "M5 5l14 14", stroke: "currentColor" },
          { id: "two", path: "M19 5L5 19", stroke: "currentColor" },
        ]}
      />,
    );
    await act(async () => frames.run());
    expect([...container.querySelectorAll("path")].map((path) => path.getAttribute("d"))).toEqual(["M5 5l14 14", "M19 5L5 19"]);
  });
});

describe("Remold.Connectors", () => {
  it("draws a line from each anchor to the elements that link to it, and follows changes", async () => {
    const frames = manualLoop();
    function Tree({ open }: { open: boolean }) {
      return (
        <Remold.Connectors loop={frames.loop} gap={0} data-box="0 0 800 800" className="tree">
          <span data-rm-anchor="src" data-box="0 0 20 20" />
          {open && <span data-rm-anchor="app" data-rm-link="src" data-box="40 40 20 20" />}
          <span data-rm-anchor="lib" data-rm-link="src" data-box="40 80 20 20" />
        </Remold.Connectors>
      );
    }
    await render(<Tree open />);
    const host = container.querySelector(".tree") as HTMLElement;
    expect(host.style.position).toBe("relative");
    const svg = host.querySelector("svg")!;
    expect(svg.getAttribute("data-rm-ignore")).toBe("");
    expect(svg.querySelectorAll("path.rm-connector")).toHaveLength(2);
    await render(<Tree open={false} />);
    await act(async () => frames.run());
    expect(svg.querySelectorAll("path.rm-connector")).toHaveLength(1);
  });
});

describe("Remold.Anchor", () => {
  it("names an anchor and the one its line comes from", async () => {
    await render(
      <>
        <Remold.Anchor name="q1" />
        <Remold.Anchor name="a1" linkTo="q1" className={(state) => (state.linked ? "linked" : "")} />
      </>,
    );
    const [question, answer] = container.querySelectorAll("span");
    expect(question!.getAttribute("data-rm-anchor")).toBe("q1");
    expect(question!.hasAttribute("data-rm-link")).toBe(false);
    expect(answer!.getAttribute("data-rm-link")).toBe("q1");
    expect(answer!.className).toBe("linked");
  });
});

describe("Remold.Anchor line options", () => {
  it("passes sides, label, arrow, pulse and line state to the incoming line", async () => {
    await render(
      <Remold.Anchor
        name="b"
        linkTo="a"
        fromSide="right"
        toSide="left"
        label="If yes"
        arrow={false}
        pulse={3}
        pulseDelay={0.4}
        line="lit"
      />,
    );
    const el = container.querySelector("span")!;
    expect(Object.fromEntries([...el.attributes].map((a) => [a.name, a.value]))).toMatchObject({
      "data-rm-from-side": "right",
      "data-rm-to-side": "left",
      "data-rm-label": "If yes",
      "data-rm-arrow": "false",
      "data-rm-pulse": "3",
      "data-rm-pulse-delay": "0.4",
      "data-rm-line": "lit",
    });
  });
});

describe("useAutoplay", () => {
  let visible: ((on: boolean) => void) | null = null;
  beforeEach(() => {
    vi.useFakeTimers();
    // Visibility is driven by hand: the observer reports whatever the test says.
    globalThis.IntersectionObserver = class {
      constructor(private callback: IntersectionObserverCallback) {
        visible = (on) => this.callback([{ isIntersecting: on } as IntersectionObserverEntry], this as unknown as IntersectionObserver);
      }
      observe() {}
      disconnect() {}
    } as unknown as typeof IntersectionObserver;
  });
  afterEach(() => vi.useRealTimers());

  function Demo() {
    const autoplay = useAutoplay(3, { every: 1000 });
    return (
      <div ref={autoplay.ref}>
        <p>step {autoplay.step}</p>
        <output>{String(autoplay.active)}</output>
        <button {...autoplay.toggleProps}>{autoplay.playing ? "Pause" : "Play"}</button>
        <input aria-label="field" />
      </div>
    );
  }
  const text = () => container.querySelector("p")!.textContent;
  const tick = (ms: number) => act(async () => void vi.advanceTimersByTime(ms));

  it("steps only while on screen, wrapping round", async () => {
    await render(<Demo />);
    expect(container.querySelector("output")!.textContent).toBe("false");
    await tick(3000);
    expect(text()).toBe("step 0");
    await act(async () => visible!(true));
    expect(container.querySelector("output")!.textContent).toBe("true");
    await tick(1000);
    expect(text()).toBe("step 1");
    await tick(1000);
    await tick(1000);
    expect(text()).toBe("step 0");
    await act(async () => visible!(false));
    expect(container.querySelector("output")!.textContent).toBe("false");
    await tick(5000);
    expect(text()).toBe("step 0");
  });

  it("lets a step linger, with a duration per step", async () => {
    function Lingering() {
      const autoplay = useAutoplay(2, { every: (step) => (step === 1 ? 5000 : 1000) });
      return <p ref={autoplay.ref}>step {autoplay.step}</p>;
    }
    await render(<Lingering />);
    await act(async () => visible!(true));
    await tick(1000);
    expect(text()).toBe("step 1");
    await tick(4000);
    expect(text()).toBe("step 1");
    await tick(1000);
    expect(text()).toBe("step 0");
  });

  it("stops when someone takes over, but not for its own play button", async () => {
    await render(<Demo />);
    await act(async () => visible!(true));
    const button = container.querySelector("button")!;
    // Pressing pause pauses; pressing play plays again.
    await act(async () => {
      button.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true }));
      button.click();
    });
    expect(button.textContent).toBe("Play");
    await act(async () => {
      button.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true }));
      button.click();
    });
    expect(button.textContent).toBe("Pause");
    // Typing in the demo is taking over.
    await act(async () => void container.querySelector("input")!.dispatchEvent(new KeyboardEvent("keydown", { bubbles: true })));
    expect(button.textContent).toBe("Play");
    await tick(5000);
    expect(text()).toBe("step 0");
  });
});

describe("Remold.Particles", () => {
  const SQUARE = "M0 0H10V10H0Z";
  const BAR = "M0 0H30V4H0Z";

  it("draws a shape on a labelled canvas, and flows into the next one", async () => {
    const frames = manualLoop();
    await render(<Remold.Particles shape={{ path: SQUARE }} count={40} label="A square" loop={frames.loop} className="dots" />);
    const canvas = container.querySelector("canvas.dots")!;
    expect(canvas.getAttribute("aria-label")).toBe("A square");
    fills = 0;
    await act(async () => frames.run());
    expect(fills).toBeGreaterThan(0);

    await render(<Remold.Particles shape={{ path: BAR }} count={40} label="A bar" loop={frames.loop} className="dots" />);
    expect(canvas.getAttribute("aria-label")).toBe("A bar");
    expect(frames.running).toBe(true);
    await act(async () => frames.run());
    expect(frames.running).toBe(false);
  });

  it("scatters into the next shape with transition scatter, and settles", async () => {
    const frames = manualLoop();
    await render(<Remold.Particles shape={{ path: SQUARE }} count={40} loop={frames.loop} transition="scatter" />);
    await act(async () => frames.run());
    await render(<Remold.Particles shape={{ path: BAR }} count={40} loop={frames.loop} transition="scatter" />);
    expect(frames.running).toBe(true);
    await act(async () => frames.run());
    expect(frames.running).toBe(false);
  });

  it("draws a shape from shapes with as many dots as count, coloured by name", async () => {
    const frames = manualLoop();
    const ball = shapes.sphere().tone("sea");
    fills = 0;
    await render(<Remold.Particles shape={ball} count={30} palette={{ sea: "#0ea5e9" }} camera loop={frames.loop} />);
    expect(fills).toBeGreaterThan(0);
    await render(<Remold.Particles shape={ball} count={30} palette={{ sea: "#0ea5e9" }} camera={{ spin: 0 }} loop={frames.loop} />);
    await act(async () => frames.run());
    expect(frames.running).toBe(false);
  });

  it("turns 3D points with a camera, and pauses when its spin drops to 0", async () => {
    const frames = manualLoop();
    const points = [
      { x: 0, y: 0, z: -10 },
      { x: 10, y: 10, z: 10 },
    ];
    await render(<Remold.Particles shape={{ points }} camera={{ spin: 0.2 }} blend="add" loop={frames.loop} />);
    await act(async () => frames.run());
    expect(frames.running).toBe(true);
    await render(<Remold.Particles shape={{ points }} camera={{ spin: 0 }} blend="add" loop={frames.loop} />);
    await act(async () => frames.run());
    expect(frames.running).toBe(false);
  });

  it("doesn't restart when re-rendered with the same shape", async () => {
    const frames = manualLoop();
    const points = [
      { x: 0, y: 0 },
      { x: 10, y: 0 },
    ];
    await render(<Remold.Particles shape={{ points }} loop={frames.loop} />);
    await act(async () => frames.run());
    await render(<Remold.Particles shape={{ points }} loop={frames.loop} />);
    expect(frames.running).toBe(false);
  });
});

describe("useDust", () => {
  it("keeps the same pours across renders, and resolves when there's nothing to pour", async () => {
    const seen: unknown[] = [];
    let pour: Promise<void> | null = null;
    function Card({ n }: { n: number }) {
      const card = useRef<HTMLElement>(null);
      const target = useRef<HTMLSpanElement>(null);
      const trail = useDust(card);
      seen.push(trail);
      useEffect(() => {
        if (n !== 2) return;
        const row = card.current!.querySelector("p")!;
        // Nothing laid out, so nothing to sample: the pour has nothing to do and resolves.
        row.getBoundingClientRect = () => new DOMRect(0, 0, 0, 0);
        pour = trail.away(row, target.current!);
      }, [n, trail]);
      return (
        <section ref={card}>
          <p>Row {n}</p>
          <span ref={target} />
        </section>
      );
    }
    await render(<Card n={1} />);
    await render(<Card n={2} />);
    expect(seen.at(-1)).toBe(seen[0]);
    await expect(pour).resolves.toBeUndefined();
    expect(container.querySelector("canvas")).toBeNull();
  });
});

describe("Remold.Canvas", () => {
  it("paints with draw, and springs values to new targets when they change", async () => {
    const frames = manualLoop();
    const seen: number[] = [];
    const draw = (_: CanvasRenderingContext2D, { values }: { values: { r: number } }) => void seen.push(values.r);
    await render(<Remold.Canvas values={{ r: 10 }} draw={draw} loop={frames.loop} label="A dot" className="paint" />);
    const canvas = container.querySelector("canvas.paint")!;
    expect(canvas.getAttribute("aria-label")).toBe("A dot");
    expect(seen.at(-1)).toBe(10);
    expect(frames.running).toBe(false);

    await render(<Remold.Canvas values={{ r: 50 }} draw={draw} loop={frames.loop} label="A dot" className="paint" />);
    expect(frames.running).toBe(true);
    await act(async () => frames.run());
    expect(frames.running).toBe(false);
    expect(seen.at(-1)).toBeCloseTo(50, 2);
    expect(seen.some((r) => r > 10 && r < 50)).toBe(true);
  });

  it("doesn't restart for an equal values object, and keeps drawing when continuous", async () => {
    const frames = manualLoop();
    await render(<Remold.Canvas values={{ r: 1 }} draw={() => {}} loop={frames.loop} />);
    await render(<Remold.Canvas values={{ r: 1 }} draw={() => {}} loop={frames.loop} />);
    expect(frames.running).toBe(false);
    await render(<Remold.Canvas values={{ r: 1 }} draw={() => {}} loop={frames.loop} continuous />);
    expect(frames.running).toBe(true);
  });

  it("gives to, set and redraw through actionsRef", async () => {
    const frames = manualLoop();
    const actions = createRef<Remold.CanvasActions<{ r: number }>>();
    await render(<Remold.Canvas values={{ r: 0 }} draw={() => {}} loop={frames.loop} actionsRef={actions} />);
    act(() => actions.current!.set({ r: 7 }));
    expect(actions.current!.values.r).toBe(7);
    act(() => actions.current!.to({ r: 20 }));
    expect(frames.running).toBe(true);
  });
});

describe("useDragToDismiss", () => {
  it("calls onDismiss when its element is pulled away, and stops listening on unmount", async () => {
    const onDismiss = vi.fn();
    function Sheet() {
      const drag = useDragToDismiss({ onDismiss, reducedMotion: "never" });
      return <div ref={drag.ref} data-testid="sheet" />;
    }
    const pointer = (type: string, y: number, t: number) => {
      const e = new PointerEvent(type, { clientX: 0, clientY: y, button: 0, pointerId: 1, bubbles: true });
      Object.defineProperty(e, "timeStamp", { value: t });
      return e;
    };
    await render(<Sheet />);
    const sheet = container.querySelector("[data-testid=sheet]") as HTMLElement;
    expect(sheet.style.touchAction).toBe("pan-x");
    sheet.dispatchEvent(pointer("pointerdown", 0, 0));
    sheet.dispatchEvent(pointer("pointermove", 80, 300));
    sheet.dispatchEvent(pointer("pointermove", 160, 600));
    sheet.dispatchEvent(pointer("pointerup", 160, 700));
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });
});
