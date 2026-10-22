// @vitest-environment happy-dom
import { beforeAll, describe, expect, it } from "vitest";
import { fingerprint, readNodes } from "./snapshot";
import { mount, useFakeLayout } from "./test-utils";

beforeAll(useFakeLayout);

describe("corner radius", () => {
  it("reads the radius as drawn, not as written: a pill is half its height", () => {
    const root = mount(`
      <div data-box="0 0 180 40" style="border-radius: 9999px; background-color: rgb(0, 0, 0)"></div>
      <div data-box="0 100 280 400" style="border-radius: 26px; background-color: rgb(0, 0, 0)"></div>`);
    const { nodes } = readNodes(root);
    expect(nodes.map((n) => n.radius)).toEqual([20, 26]);
  });
});

describe("fingerprint", () => {
  it("is stable and tells different inputs apart", () => {
    expect(fingerprint("photo.jpg")).toBe(fingerprint("photo.jpg"));
    expect(fingerprint("photo.jpg")).not.toBe(fingerprint("photo.png"));
  });
});

describe("readNodes", () => {
  it("keeps what a person would perceive, with boxes in root widths", () => {
    const root = mount(`
      <article data-box="100 50 400 300" style="background-color: rgb(255, 255, 255)">
        <h2 data-box="120 60 200 30">Camp Mug</h2>
        <button data-box="120 300 80 30">Add</button>
        <img data-box="300 60 100 100" src="mug.png" alt="A mug">
      </article>`);
    const { nodes, elements } = readNodes(root);
    expect(nodes.map((n) => [n.kind, n.text, n.parent])).toEqual([
      ["box", "", -1],
      ["heading", "Camp Mug", 0],
      ["control", "Add", 0],
      // Media is matched by identity; its alt text is kept as its accessible name.
      ["media", "A mug", 0],
    ]);
    expect(nodes[0]).toMatchObject({
      x: 0.1,
      y: 0.05,
      width: 0.4,
      height: 0.3,
    });
    expect(nodes[3]!.media).toBe(fingerprint((elements[3] as HTMLImageElement).src));
  });

  it("skips invisible wrappers and attaches their children to the nearest kept ancestor", () => {
    const root = mount(`
      <section data-box="0 0 500 500" style="background-color: rgb(240, 240, 240)">
        <div data-box="0 0 500 100"><div><span data-box="10 10 100 20">Hello</span></div></div>
      </section>`);
    expect(readNodes(root).nodes.map((n) => [n.text, n.parent])).toEqual([
      ["", -1],
      ["Hello", 0],
    ]);
  });

  it("folds inline formatting into one piece of text", () => {
    const root = mount(`<p data-box="0 0 300 20">Total: <b>€154</b></p>`);
    expect(readNodes(root).nodes.map((n) => n.text)).toEqual(["Total: €154"]);
  });

  it("ignores hidden elements, empty boxes and anything marked data-rm-ignore", () => {
    const root = mount(`
      <p data-box="0 0 100 20" style="display: none">Hidden</p>
      <p data-box="0 0 100 20" style="visibility: hidden">Also hidden</p>
      <p data-box="0 0 0 0">No size</p>
      <div data-rm-ignore><p data-box="0 0 100 20">Ignored</p></div>
      <p data-box="0 40 100 20">Shown</p>`);
    expect(readNodes(root).nodes.map((n) => n.text)).toEqual(["Shown"]);
  });

  it("reads form fields by their value", () => {
    const root = mount(`<input data-box="0 0 200 30" value="Ada Lovelace">`);
    expect(readNodes(root).nodes[0]).toMatchObject({
      kind: "control",
      text: "Ada Lovelace",
    });
  });

  it("uses the accessible label for elements with no text", () => {
    const root = mount(`<button data-box="0 0 30 30" aria-label="Close"></button>`);
    expect(readNodes(root).nodes[0]!.text).toBe("Close");
  });
});
