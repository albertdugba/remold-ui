// @vitest-environment happy-dom
import { beforeAll, describe, expect, it } from "vitest";
import { manualLoop, mount, useFakeLayout } from "../test-utils";
import { readNodes } from "../snapshot";
import { graphemes, morphText, sharedLetters } from "./index";

beforeAll(useFakeLayout);

describe("graphemes", () => {
  it("keeps emoji and accented letters whole", () => {
    expect(graphemes("hé👍🏽!")).toEqual(["h", "é", "👍🏽", "!"]);
  });
});

describe("sharedLetters", () => {
  const pairs = (a: string, b: string) => sharedLetters([...a], [...b]);
  it("keeps runs of shared letters", () => {
    expect(pairs("Saving", "Saved")).toEqual([
      [0, 0],
      [1, 1],
      [2, 2],
    ]);
  });
  it("drops lone shared letters, so they don't fly across the word", () => {
    expect(pairs("cat", "dog")).toEqual([]);
    expect(pairs("axb", "ybz")).toEqual([]);
  });
  it("handles empty text", () => {
    expect(pairs("", "abc")).toEqual([]);
  });
});

describe("morphText", () => {
  it("shows the new text to screen readers and draws letters for the eye", async () => {
    const root = mount(`<span>Saving</span>`);
    const el = root.querySelector("span")!;
    const frames = manualLoop();
    const done = morphText(el, "Saved", {
      loop: frames.loop,
      reducedMotion: "never",
    });
    const [reader, visual] = [...el.children] as HTMLElement[];
    expect(reader!.textContent).toBe("Saved");
    expect(visual!.getAttribute("aria-hidden")).toBe("true");
    // "Sav" is kept; "e" and "d" arrive; "i", "n" and "g" leave as ghosts.
    const arriving = [...visual!.querySelectorAll("span span")].filter((s) => (s as HTMLElement).style.opacity === "0.000");
    expect(arriving.map((s) => s.textContent)).toEqual(["e", "d"]);
    expect(visual!.lastElementChild!.textContent).toBe("ing");
    frames.run();
    await done;
    expect(visual!.lastElementChild!.textContent).toBe("");
  });

  it("is read by transitions as one piece of text, leaving its letters to the morph", () => {
    const root = mount(`<p data-box="0 0 200 20">Everyday limit</p>`);
    const el = root.querySelector("p")!;
    void morphText(el, "Pick a card", {
      loop: manualLoop().loop,
      reducedMotion: "never",
    });
    // Mid-morph, with ghosts of the old letters still inside: one node, holding the new text.
    expect(readNodes(root).nodes.map((n) => n.text)).toEqual(["Pick a card"]);
  });

  it("breaks lines only between words", () => {
    const root = mount(`<span></span>`);
    const el = root.querySelector("span")!;
    void morphText(el, "two words", { loop: manualLoop().loop });
    const words = el.children[1]!.firstElementChild!.querySelectorAll(":scope > span");
    expect([...words].map((w) => w.textContent)).toEqual(["two", "words"]);
    expect((words[0] as HTMLElement).style.whiteSpace).toBe("nowrap");
  });

  it("can be called again mid-animation", async () => {
    const root = mount(`<span>One</span>`);
    const el = root.querySelector("span")!;
    const frames = manualLoop();
    const first = morphText(el, "Two", { loop: frames.loop });
    frames.step();
    const second = morphText(el, "Three", { loop: frames.loop });
    frames.run();
    await Promise.all([first, second]);
    expect(el.firstElementChild!.textContent).toBe("Three");
  });
});
