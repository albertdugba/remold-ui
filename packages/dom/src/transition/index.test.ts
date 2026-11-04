// @vitest-environment happy-dom
import { beforeAll, describe, expect, it } from "vitest";
import { manualLoop, mount, useFakeLayout } from "../test-utils";
import { prepareTransition, transition } from "./index";

beforeAll(useFakeLayout);

const list = (items: [string, number][]) =>
  items.map(([text, y]) => `<p data-box="0 ${y} 200 30" style="font-size: 16px">${text}</p>`).join("");

/** The translate a test element was given, as numbers. */
const translateOf = (el: Element | null | undefined) =>
  ((el as HTMLElement | null)?.style.translate ?? "")
    .split(" ")
    .filter(Boolean)
    .map((v) => Number.parseFloat(v));

const find = (root: Element, text: string) =>
  [...root.querySelectorAll("p, button, div")].find((el) => el.textContent === text) as HTMLElement;

const card = (text: string, y: number) =>
  `<div data-box="0 ${y} 300 80" style="background-color: rgb(255, 255, 255)"><p data-box="10 ${y + 10} 200 30">${text}</p></div>`;

describe("transition", () => {
  it("lifts what travels above its neighbours, farthest on top, and puts it back afterwards", async () => {
    const root = mount(card("Near", 0) + card("Far", 100) + card("Still", 400));
    const frames = manualLoop();
    const t = transition(
      root,
      () => {
        root.innerHTML = card("Far", 0) + card("Near", 30) + card("Still", 400);
      },
      { loop: frames.loop, reducedMotion: "never" },
    );
    await t.ready;
    const box = (text: string) => [...root.querySelectorAll("p")].find((p) => p.textContent === text)!.parentElement as HTMLElement;
    expect(box("Far").style.zIndex).toBe("2");
    expect(box("Near").style.zIndex).toBe("1");
    expect(box("Far").style.position).toBe("relative");
    expect(box("Still").style.zIndex).toBe("");
    frames.run();
    await t.finished;
    expect(box("Far").style.zIndex).toBe("");
    expect(box("Far").style.position).toBe("");
  });

  it("lifts the mover's parents too, so a card inside a slot can rise above the other slots", async () => {
    const slot = (text: string, y: number, z: number) =>
      `<div data-box="0 ${y} 300 80" style="position: absolute; z-index: ${z}">${card(text, y)}</div>`;
    const root = mount(slot("Back", 0, 0) + slot("Front", 300, 1));
    const frames = manualLoop();
    const t = transition(
      root,
      () => {
        root.innerHTML = slot("Back", 20, 0) + slot("Front", 500, 1);
      },
      { loop: frames.loop, reducedMotion: "never" },
    );
    await t.ready;
    const slotOf = (text: string) => [...root.querySelectorAll("p")].find((p) => p.textContent === text)!.parentElement!.parentElement as HTMLElement;
    expect(Number(slotOf("Front").style.zIndex)).toBeGreaterThan(Number(slotOf("Back").style.zIndex));
    frames.run();
    await t.finished;
    expect(slotOf("Front").style.zIndex).toBe("1");
    expect(slotOf("Back").style.zIndex).toBe("0");
  });

  it("lifts nothing when asked not to", async () => {
    const root = mount(card("Near", 0) + card("Far", 100));
    const frames = manualLoop();
    const t = transition(
      root,
      () => {
        root.innerHTML = card("Far", 0) + card("Near", 100);
      },
      { loop: frames.loop, reducedMotion: "never", lift: false },
    );
    await t.ready;
    expect([...root.querySelectorAll("div")].every((d) => d.style.zIndex === "")).toBe(true);
    frames.run();
  });

  it("moves rebuilt elements from where they were to where they are", async () => {
    const root = mount(
      list([
        ["Alpha", 0],
        ["Beta", 50],
      ]),
    );
    const frames = manualLoop();
    const t = transition(
      root,
      () => {
        root.innerHTML = list([
          ["Beta", 0],
          ["Alpha", 50],
        ]);
      },
      { loop: frames.loop, reducedMotion: "never" },
    );

    const { matches } = await t.ready;
    expect(matches.pairs).toHaveLength(2);
    // New "Alpha" sits at y = 50 but starts where the old one was, at y = 0.
    expect(translateOf(find(root, "Alpha"))).toEqual([0, -50]);
    expect(translateOf(find(root, "Beta"))).toEqual([0, 50]);

    frames.step();
    expect(translateOf(find(root, "Alpha"))[1]).toBeGreaterThan(-50);

    frames.run();
    await t.finished;
    expect(find(root, "Alpha").style.translate).toBe("");
    expect(find(root, "Alpha").style.scale).toBe("");
  });

  it("fades out a copy of what was removed, then cleans it up", async () => {
    const root = mount(
      list([
        ["Keep", 0],
        ["Remove me", 50],
      ]),
    );
    const frames = manualLoop();
    const t = transition(
      root,
      () => {
        root.innerHTML = list([["Keep", 0]]);
      },
      { loop: frames.loop, reducedMotion: "never" },
    );
    await t.ready;
    const ghost = root.querySelector("[data-rm-exiting]") as HTMLElement;
    expect(ghost.textContent).toBe("Remove me");
    expect(ghost.closest("[data-rm-ignore]")).not.toBeNull();
    // Its own size, whatever percentage limits the page's CSS gives it inside the 0 × 0 layer.
    expect(ghost.style.maxWidth).toBe("none");
    expect(ghost.style.maxHeight).toBe("none");
    frames.run();
    await t.finished;
    expect(root.querySelector("[data-rm-exiting]")).toBeNull();
    expect(root.querySelector("[data-rm-ignore]")).toBeNull();
  });

  it("fades in what was added and marks it while it arrives", async () => {
    const root = mount(list([["Keep", 0]]));
    const frames = manualLoop();
    const t = transition(
      root,
      () => {
        root.innerHTML = list([
          ["Keep", 0],
          ["New", 50],
        ]);
      },
      { loop: frames.loop, reducedMotion: "never" },
    );
    await t.ready;
    const arriving = find(root, "New");
    expect(arriving.hasAttribute("data-rm-entering")).toBe(true);
    expect(arriving.style.opacity).toBe("0.000");
    frames.run();
    await t.finished;
    expect(arriving.hasAttribute("data-rm-entering")).toBe(false);
    expect(arriving.style.opacity).toBe("");
  });

  it("marks elements whose text changed", async () => {
    const root = mount(`<p data-box="0 0 200 30">Saving changes</p>`);
    const frames = manualLoop();
    const t = transition(
      root,
      () => {
        root.innerHTML = `<p data-box="0 0 200 30">Saved changes</p>`;
      },
      { loop: frames.loop },
    );
    const { summary } = await t.ready;
    expect(summary.changed).toBe(1);
    expect(root.querySelector("p")!.hasAttribute("data-rm-changed")).toBe(true);
    expect(root.querySelector("p")!.hasAttribute("data-rm-matched")).toBe(true);
  });

  it("corrects children so a growing card doesn't stretch them", async () => {
    const card = (width: number) =>
      `<div data-box="0 0 ${width} 100" style="background-color: rgb(255, 255, 255)">` +
      `<p data-box="10 10 50 20" style="font-size: 16px">Title</p></div>`;
    const root = mount(card(100));
    const frames = manualLoop();
    const t = transition(
      root,
      () => {
        root.innerHTML = card(200);
      },
      { loop: frames.loop, reducedMotion: "never" },
    );
    await t.ready;
    const box = root.querySelector("div")!;
    const title = root.querySelector("p")!;
    // The card starts squashed to half width; the title inside is scaled back up by 2,
    // so on screen it is the right size.
    expect(box.style.scale).toBe("0.5000 1.0000");
    expect(title.style.scale).toBe("2.0000 1.0000");
  });

  it("with reduced motion, doesn't move anything but still fades changes", async () => {
    const root = mount(list([["Alpha", 0]]));
    const frames = manualLoop();
    const t = transition(
      root,
      () => {
        root.innerHTML = list([
          ["New", 0],
          ["Alpha", 50],
        ]);
      },
      { loop: frames.loop, reducedMotion: "always" },
    );
    await t.ready;
    expect(find(root, "Alpha").style.translate).toBe("");
    expect(find(root, "New").style.opacity).toBe("0.000");
    frames.run();
    await t.finished;
  });

  describe("choreography", () => {
    const opacityOf = (el: HTMLElement) => Number.parseFloat(el.style.opacity || "1");

    it("lets what leaves go first, then moves", async () => {
      const root = mount(
        list([
          ["Gone", 0],
          ["Keep", 50],
        ]),
      );
      const frames = manualLoop();
      const t = transition(
        root,
        () => {
          root.innerHTML = list([["Keep", 0]]);
        },
        { loop: frames.loop, reducedMotion: "never", choreography: true },
      );
      await t.ready;
      const ghost = root.querySelector("[data-rm-exiting]") as HTMLElement;

      frames.step();
      expect(translateOf(find(root, "Keep"))).toEqual([0, 50]);
      expect(Number.parseFloat(ghost.style.opacity)).toBeLessThan(1);

      for (let frame = 0; frame < 5; frame++) frames.step();
      expect(translateOf(find(root, "Keep"))[1]).toBeLessThan(50);

      frames.run();
      await t.finished;
      expect(find(root, "Keep").style.translate).toBe("");
    });

    it("brings arrivals in once the moves have started, one after another", async () => {
      const root = mount(list([["Alpha", 0]]));
      const frames = manualLoop();
      const t = transition(
        root,
        () => {
          root.innerHTML = list([
            ["First", 0],
            ["Second", 50],
            ["Alpha", 100],
          ]);
        },
        { loop: frames.loop, reducedMotion: "never", choreography: { enter: 0.1, stagger: 0.05 } },
      );
      await t.ready;
      const first = find(root, "First");
      const second = find(root, "Second");

      frames.step();
      expect(translateOf(find(root, "Alpha"))[1]).toBeGreaterThan(-100);
      expect(opacityOf(first)).toBe(0);

      // 0.1 s in: the first arrival has started, the second waits its turn.
      for (let frame = 0; frame < 6; frame++) frames.step();
      expect(opacityOf(first)).toBeGreaterThan(0);
      expect(opacityOf(second)).toBe(0);

      for (let frame = 0; frame < 4; frame++) frames.step();
      expect(opacityOf(second)).toBeGreaterThan(0);

      frames.run();
      await t.finished;
      expect(second.style.opacity).toBe("");
    });

    it("keeps the whole stagger short however many arrive", async () => {
      const root = mount(list([["Alpha", 0]]));
      const frames = manualLoop();
      const items: [string, number][] = Array.from({ length: 30 }, (_, index) => [`Item ${index}`, index * 40]);
      const t = transition(
        root,
        () => {
          root.innerHTML = list(items);
        },
        { loop: frames.loop, reducedMotion: "never", choreography: { enter: 0, stagger: 0.05, maxStagger: 0.1 } },
      );
      await t.ready;

      // Alpha leaving holds the arrivals 0.06 s; 0.1 s of stagger later, even the last of 30 has
      // started, though 30 × 0.05 s would be 1.5 s.
      for (let frame = 0; frame < 11; frame++) frames.step();
      expect(opacityOf(find(root, "Item 29"))).toBeGreaterThan(0);

      frames.run();
      await t.finished;
    });

    it("is off with reduced motion: changes fade at once", async () => {
      const root = mount(list([["Alpha", 0]]));
      const frames = manualLoop();
      const t = transition(
        root,
        () => {
          root.innerHTML = list([
            ["New", 0],
            ["Alpha", 50],
          ]);
        },
        { loop: frames.loop, reducedMotion: "always", choreography: { enter: 0.5 } },
      );
      await t.ready;

      frames.step();
      expect(opacityOf(find(root, "New"))).toBeGreaterThan(0);

      frames.run();
      await t.finished;
    });
  });

  it("is interruptible: a second transition takes over from the first", async () => {
    const root = mount(
      list([
        ["Alpha", 0],
        ["Beta", 50],
      ]),
    );
    const frames = manualLoop();
    const first = transition(
      root,
      () => {
        root.innerHTML = list([
          ["Beta", 0],
          ["Alpha", 50],
        ]);
      },
      { loop: frames.loop, reducedMotion: "never" },
    );
    await first.ready;
    for (let i = 0; i < 5; i++) frames.step();

    const second = transition(
      root,
      () => {
        root.innerHTML = list([
          ["Alpha", 0],
          ["Beta", 50],
        ]);
      },
      { loop: frames.loop, reducedMotion: "never" },
    );
    await first.finished;
    await second.ready;
    frames.run();
    await second.finished;
    for (const p of root.querySelectorAll("p")) expect(p.style.translate).toBe("");
  });

  it("skip jumps to the end", async () => {
    const root = mount(
      list([
        ["Alpha", 0],
        ["Beta", 50],
      ]),
    );
    const frames = manualLoop();
    const t = transition(
      root,
      () => {
        root.innerHTML = list([
          ["Beta", 0],
          ["Alpha", 50],
        ]);
      },
      { loop: frames.loop, reducedMotion: "never" },
    );
    await t.ready;
    t.skip();
    await t.finished;
    expect(find(root, "Alpha").style.translate).toBe("");
  });

  it("waits for an async update", async () => {
    const root = mount(list([["Alpha", 0]]));
    const frames = manualLoop();
    const t = transition(
      root,
      async () => {
        await Promise.resolve();
        root.innerHTML = list([["Alpha", 50]]);
      },
      { loop: frames.loop, reducedMotion: "never" },
    );
    await t.updated;
    const { matches } = await t.ready;
    expect(matches.pairs).toHaveLength(1);
  });

  it("reports an update that throws", async () => {
    const root = mount(list([["Alpha", 0]]));
    const t = transition(root, () => {
      throw new Error("render failed");
    });
    await expect(t.updated).rejects.toThrow("render failed");
    await expect(t.finished).rejects.toThrow("render failed");
  });

  it("moves focus to the replacement of the focused element", async () => {
    const root = mount(`<button data-box="0 0 100 30">Save</button>`);
    root.querySelector("button")!.focus();
    const frames = manualLoop();
    const t = transition(
      root,
      () => {
        root.innerHTML = `<button data-box="0 40 100 30">Save</button>`;
      },
      { loop: frames.loop },
    );
    await t.ready;
    expect(document.activeElement).toBe(root.querySelector("button"));
  });

  it("announces a summary when asked", async () => {
    const root = mount(list([["Alpha", 0]]));
    const frames = manualLoop();
    const t = transition(
      root,
      () => {
        root.innerHTML = list([
          ["Alpha", 50],
          ["Beta", 0],
        ]);
      },
      { loop: frames.loop, announce: true },
    );
    await t.ready;
    await new Promise((resolve) => setTimeout(resolve, 80));
    expect(document.querySelector("[data-rm-announcer]")!.textContent).toBe("1 moved, 1 added");
  });

  it("can be split in two for frameworks that change the DOM themselves", async () => {
    const root = mount(
      list([
        ["Alpha", 0],
        ["Beta", 50],
      ]),
    );
    const frames = manualLoop();
    const prepared = prepareTransition(root, {
      loop: frames.loop,
      reducedMotion: "never",
    });
    root.innerHTML = list([
      ["Beta", 0],
      ["Alpha", 50],
    ]);
    const t = prepared.play();
    expect(t).toBe(prepared.transition);
    expect((await t.ready).matches.pairs).toHaveLength(2);
    expect(translateOf(find(root, "Alpha"))).toEqual([0, -50]);
  });

  it("a prepared transition can be cancelled", async () => {
    const root = mount(list([["Alpha", 0]]));
    const prepared = prepareTransition(root);
    prepared.cancel();
    await expect(prepared.transition.finished).rejects.toMatchObject({
      name: "AbortError",
    });
    // Playing after cancelling does nothing.
    expect(() => prepared.play()).not.toThrow();
  });

  it("preparing only reads: a running transition keeps going until play takes over", async () => {
    const root = mount(
      list([
        ["Alpha", 0],
        ["Beta", 50],
      ]),
    );
    const frames = manualLoop();
    const first = transition(
      root,
      () => {
        root.innerHTML = list([
          ["Beta", 0],
          ["Alpha", 50],
        ]);
      },
      { loop: frames.loop, reducedMotion: "never" },
    );
    await first.ready;
    frames.step();
    const prepared = prepareTransition(root, {
      loop: frames.loop,
      reducedMotion: "never",
    });
    const before = translateOf(find(root, "Alpha"))[1]!;
    frames.step();
    expect(translateOf(find(root, "Alpha"))[1]).toBeGreaterThan(before);
    prepared.cancel();
    frames.run();
    await first.finished;
  });

  it("moves the right distance inside a scaled-down container", async () => {
    // The root is 1000px wide in its own pixels but drawn at 500px: everything inside is at half size.
    const root = mount(
      list([
        ["Alpha", 0],
        ["Beta", 25],
      ]),
      "0 0 500 400",
    );
    Object.defineProperty(root, "offsetWidth", {
      value: 1000,
      configurable: true,
    });
    const frames = manualLoop();
    const t = transition(
      root,
      () => {
        root.innerHTML = list([
          ["Beta", 0],
          ["Alpha", 25],
        ]);
      },
      { loop: frames.loop, reducedMotion: "never" },
    );
    await t.ready;
    // Alpha appears 25 screen pixels lower, which is 50 of its own pixels.
    expect(translateOf(find(root, "Alpha"))).toEqual([0, -50]);
  });
});
