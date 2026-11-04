// @vitest-environment happy-dom
import { describe, expect, it } from "vitest";
import { iconToPath } from "./icon";

const mount = (html: string) => {
  const host = document.createElement("div");
  host.innerHTML = html;
  return host;
};

describe("iconToPath", () => {
  it("joins an icon's shapes, in drawing order, and reads its look", () => {
    // Shaped like a Lucide icon: a circle and a path, stroked.
    const host = mount(
      `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="11" cy="11" r="8"></circle><path d="m21 21-4.3-4.3"></path>
      </svg>`,
    );
    expect(iconToPath(host)).toEqual({
      d: "M19 11A8 8 0 0 1 3 11A8 8 0 0 1 19 11ZM21 21l-4.3-4.3",
      look: {
        viewBox: "0 0 24 24",
        fill: "none",
        stroke: "currentColor",
        strokeWidth: "2",
        strokeLinecap: "round",
        strokeLinejoin: "round",
      },
    });
  });

  it("takes the svg itself as well as an element holding it", () => {
    const host = mount(`<svg viewBox="0 0 20 20"><rect x="2" y="2" width="16" height="16" rx="3"></rect></svg>`);
    expect(iconToPath(host.querySelector("svg")!)?.d).toBe(iconToPath(host)?.d);
    expect(iconToPath(host)?.look).toEqual({ viewBox: "0 0 20 20" });
  });

  it("reads paint the svg leaves out from the first shape, as Hugeicons sets it", () => {
    const host = mount(
      `<svg viewBox="0 0 24 24" fill="none">
        <path d="M5 14L8.5 17.5L19 6.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"></path>
        <path d="M4 4h1" stroke="red" stroke-width="3"></path>
      </svg>`,
    );
    expect(iconToPath(host)?.look).toEqual({
      viewBox: "0 0 24 24",
      fill: "none",
      stroke: "currentColor",
      strokeWidth: "1.5",
      strokeLinecap: "round",
    });
  });

  it("skips shapes that aren't drawn, such as clip paths and gradients", () => {
    const host = mount(
      `<svg viewBox="0 0 24 24"><defs><clipPath id="c"><rect width="24" height="24"></rect></clipPath></defs>
        <g clip-path="url(#c)"><line x1="4" y1="12" x2="20" y2="12"></line></g></svg>`,
    );
    expect(iconToPath(host)?.d).toBe("M4 12L20 12");
  });

  it("returns null when there's nothing to draw yet", () => {
    expect(iconToPath(mount(`<svg viewBox="0 0 24 24"></svg>`))).toBeNull();
    expect(iconToPath(mount(`<span></span>`))).toBeNull();
  });

  it("names the element when a transform would be lost", () => {
    const host = mount(`<svg viewBox="0 0 24 24"><g transform="rotate(45)"><path d="M0 0L1 1"></path></g></svg>`);
    expect(() => iconToPath(host)).toThrow(/<g> has a transform/);
  });
});
