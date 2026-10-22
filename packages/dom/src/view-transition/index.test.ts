// @vitest-environment happy-dom
import { afterEach, beforeAll, describe, expect, it } from "vitest";
import { manualLoop, mount, useFakeLayout } from "../test-utils";
import { supportsViewTransitions, viewTransition } from "./index";

beforeAll(useFakeLayout);

/** A stand-in for the browser API that records the names present at each snapshot. */
function fakeViewTransitions() {
  const seen = {
    old: new Map<string, string>(),
    new: new Map<string, string>(),
  };
  const names = () =>
    new Map(
      [...document.querySelectorAll<HTMLElement>("p")]
        .filter((el) => el.style.getPropertyValue("view-transition-name"))
        .map((el) => [el.textContent ?? "", el.style.getPropertyValue("view-transition-name")]),
    );
  const start = (update: () => Promise<void>) => {
    seen.old = names();
    const updateCallbackDone = update().then(() => {
      seen.new = names();
    });
    return {
      updateCallbackDone,
      ready: updateCallbackDone,
      finished: updateCallbackDone.then(() => {}),
      skipTransition() {},
    };
  };
  Object.defineProperty(document, "startViewTransition", {
    value: start,
    configurable: true,
  });
  return seen;
}

afterEach(() => {
  Reflect.deleteProperty(document, "startViewTransition");
});

const list = (items: [string, number][]) => items.map(([text, y]) => `<p data-box="0 ${y} 200 30">${text}</p>`).join("");

describe("viewTransition", () => {
  it("falls back to transition() where the API is missing", async () => {
    expect(supportsViewTransitions()).toBe(false);
    const root = mount(list([["Alpha", 0]]));
    const t = viewTransition(
      root,
      () => {
        root.innerHTML = list([["Alpha", 50]]);
      },
      { loop: manualLoop().loop },
    );
    expect((await t.ready).matches.pairs).toHaveLength(1);
  });

  it("gives each new element the name of the old element it came from", async () => {
    const seen = fakeViewTransitions();
    const root = mount(
      list([
        ["Alpha", 0],
        ["Beta", 50],
      ]),
    );
    const t = viewTransition(
      root,
      () => {
        root.innerHTML = list([
          ["Beta", 0],
          ["Alpha", 50],
          ["Gamma", 100],
        ]);
      },
      { reducedMotion: "never" },
    );
    await t.ready;
    expect(seen.new.get("Alpha")).toBe(seen.old.get("Alpha"));
    expect(seen.new.get("Beta")).toBe(seen.old.get("Beta"));
    // Brand-new elements have no partner, so they fade in with the page.
    expect(seen.new.has("Gamma")).toBe(false);
  });

  it("removes the names and timing styles when finished", async () => {
    fakeViewTransitions();
    const root = mount(list([["Alpha", 0]]));
    const t = viewTransition(
      root,
      () => {
        root.innerHTML = list([["Alpha", 50]]);
      },
      { reducedMotion: "never" },
    );
    await t.finished;
    expect(root.querySelector("p")!.style.getPropertyValue("view-transition-name")).toBe("");
    expect(document.head.querySelector("style")).toBeNull();
  });
});
