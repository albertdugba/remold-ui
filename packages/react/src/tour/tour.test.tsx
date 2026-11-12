// @vitest-environment happy-dom
import { act, createRef, type ReactNode, type RefObject } from "react";
import { createRoot, type Root as ReactRoot } from "react-dom/client";
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { Remold, useTour, type TourActions } from "../index.js";

declare global {
  // eslint-disable-next-line no-var
  var IS_REACT_ACT_ENVIRONMENT: boolean;
}

beforeAll(() => {
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  // happy-dom has no layout: elements report the box in their data-box attribute.
  Element.prototype.getBoundingClientRect = function (this: Element) {
    const [x = 0, y = 0, width = 0, height = 0] = (this.getAttribute("data-box") ?? "0 0 0 0").split(" ").map(Number);
    return { x, y, width, height, left: x, top: y, right: x + width, bottom: y + height, toJSON() {} } as DOMRect;
  };
});

let container: HTMLElement;
let root: ReactRoot;
beforeEach(() => {
  container = document.createElement("div");
  document.body.replaceChildren(container);
  root = createRoot(container);
});
afterEach(() => act(() => root.unmount()));

const render = (node: ReactNode) => act(async () => root.render(node));
const find = (selector: string) => container.querySelector<HTMLElement>(selector)!;
const click = (selector: string) => act(async () => find(selector).click());
const press = (key: string, target: EventTarget = window) =>
  act(async () => {
    target.dispatchEvent(new KeyboardEvent("keydown", { key, bubbles: true }));
  });

const STEPS = ["search", "share", "done"];

function Progress() {
  const tour = useTour();
  return <output>{tour.open ? `${tour.index + 1} of ${tour.count}` : "closed"}</output>;
}

function Tour({
  actionsRef,
  ...props
}: Partial<Remold.Tour.Root.Props> & { actionsRef?: RefObject<TourActions | null> }) {
  return (
    <Remold.Tour.Root steps={STEPS} actionsRef={actionsRef} {...props}>
      <Remold.Tour.Target name="search" render={<input data-box="100 50 40 20" />} />
      <Remold.Tour.Target name="share">Share</Remold.Tour.Target>
      <Remold.Tour.Spotlight className="spotlight" />
      <Progress />
      <Remold.Tour.Previous className="previous">Back</Remold.Tour.Previous>
      <Remold.Tour.Next className="next">Next</Remold.Tour.Next>
      <Remold.Tour.Close className="close">Skip</Remold.Tour.Close>
    </Remold.Tour.Root>
  );
}

describe("Remold.Tour", () => {
  it("starts closed, walks the steps in order and finishes after the last", async () => {
    const actions = createRef<TourActions | null>() as RefObject<TourActions | null>;
    const onStepChange = vi.fn();
    await render(<Tour actionsRef={actions} onStepChange={onStepChange} />);

    expect(find("output").textContent).toBe("closed");
    expect(find(".next").hasAttribute("disabled")).toBe(true);

    await act(async () => actions.current!.start());
    expect(find("output").textContent).toBe("1 of 3");
    expect(find("[data-rm-tour-target='search']").hasAttribute("data-rm-active")).toBe(true);
    expect(onStepChange).toHaveBeenLastCalledWith("search", { reason: "start" });

    await click(".next");
    expect(actions.current!.step).toBe("share");
    expect(find("[data-rm-tour-target='search']").hasAttribute("data-rm-active")).toBe(false);
    expect(find("[data-rm-tour-target='share']").hasAttribute("data-rm-active")).toBe(true);

    await click(".next");
    expect(find(".next").hasAttribute("data-rm-last")).toBe(true);
    await click(".next");
    expect(actions.current!.step).toBeNull();
    expect(onStepChange).toHaveBeenLastCalledWith(null, { reason: "finish" });
  });

  it("goes back a step, but not before the first, and closes", async () => {
    const onStepChange = vi.fn();
    await render(<Tour defaultStep="search" onStepChange={onStepChange} />);

    expect(find(".previous").hasAttribute("disabled")).toBe(true);
    expect(find(".previous").hasAttribute("data-rm-disabled")).toBe(true);

    await click(".next");
    await click(".previous");
    expect(find("output").textContent).toBe("1 of 3");
    expect(onStepChange).toHaveBeenLastCalledWith("search", { reason: "previous" });

    await click(".close");
    expect(find("output").textContent).toBe("closed");
    expect(onStepChange).toHaveBeenLastCalledWith(null, { reason: "close" });
  });

  it("reports but does not change a controlled step", async () => {
    const onStepChange = vi.fn();
    await render(<Tour step="share" onStepChange={onStepChange} />);

    await click(".next");
    expect(find("output").textContent).toBe("2 of 3");
    expect(onStepChange).toHaveBeenLastCalledWith("done", { reason: "next" });
  });

  it("lets a button's own onClick cancel its action", async () => {
    await render(
      <Remold.Tour.Root steps={STEPS} defaultStep="search">
        <Progress />
        <Remold.Tour.Next className="next" onClick={(event) => event.preventDefault()} />
      </Remold.Tour.Root>,
    );
    await click(".next");
    expect(find("output").textContent).toBe("1 of 3");
  });

  it("moves with the arrow keys and closes on Escape, but not while typing", async () => {
    const onStepChange = vi.fn();
    await render(<Tour defaultStep="search" onStepChange={onStepChange} />);

    await press("ArrowLeft");
    expect(find("output").textContent).toBe("1 of 3");

    await press("ArrowRight", find("input"));
    expect(find("output").textContent).toBe("1 of 3");

    await press("ArrowRight");
    expect(find("output").textContent).toBe("2 of 3");
    expect(onStepChange).toHaveBeenLastCalledWith("share", expect.objectContaining({ reason: "arrow-key" }));

    await press("ArrowRight");
    await press("ArrowRight");
    expect(find("output").textContent).toBe("3 of 3");

    await press("Escape");
    expect(find("output").textContent).toBe("closed");
    expect(onStepChange).toHaveBeenLastCalledWith(null, expect.objectContaining({ reason: "escape-key" }));
  });

  it("leaves the keyboard alone when keyboard is off", async () => {
    await render(<Tour defaultStep="search" keyboard={false} />);
    await press("ArrowRight");
    await press("Escape");
    expect(find("output").textContent).toBe("1 of 3");
  });

  it("covers the target plus padding, and closes to the middle for a step without one", async () => {
    await render(<Tour defaultStep="search" />);
    const spotlight = find(".spotlight");

    expect(spotlight.style.transform).toBe("translate(92px, 42px)");
    expect(spotlight.style.width).toBe("56px");
    expect(spotlight.style.height).toBe("36px");
    expect(spotlight.style.getPropertyValue("--rm-tour-x")).toBe("92px");
    expect(spotlight.getAttribute("data-rm-step")).toBe("search");
    expect(spotlight.hasAttribute("data-rm-open")).toBe(true);
    expect(spotlight.getAttribute("aria-hidden")).toBe("true");

    await click(".next");
    await click(".next");
    expect(spotlight.hasAttribute("data-rm-centered")).toBe(true);
    expect(spotlight.style.width).toBe("0px");
    expect(spotlight.style.transform).toBe(`translate(${window.innerWidth / 2}px, ${window.innerHeight / 2}px)`);

    await click(".close");
    expect(spotlight.hasAttribute("data-rm-closed")).toBe(true);
    expect(spotlight.style.transform).toBe("translate(0px, 0px)");
    expect(spotlight.style.width).toBe(`${window.innerWidth}px`);
  });

  it("gives useTour the current target element, to anchor a popover to", async () => {
    let target: Element | null = null;
    function Anchor() {
      target = useTour().target;
      return null;
    }
    await render(
      <Remold.Tour.Root steps={STEPS} defaultStep="share">
        <Remold.Tour.Target name="share" render={<button type="button" />} />
        <Anchor />
      </Remold.Tour.Root>,
    );
    expect(target).toBe(find("button"));
  });

  it("refuses unknown steps, and parts outside a Root", async () => {
    const actions = createRef<TourActions | null>() as RefObject<TourActions | null>;
    await render(<Tour actionsRef={actions} />);
    expect(() => actions.current!.goTo("missing")).toThrow(RangeError);

    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    await expect(render(<Remold.Tour.Next />)).rejects.toThrow("Tour.Next must be inside a <Remold.Tour.Root>");
    error.mockRestore();
  });
});
