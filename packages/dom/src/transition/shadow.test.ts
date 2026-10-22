import { describe, expect, it } from "vitest";
import { parseShadow, scaledShadow } from "./utils";

describe("box-shadow under scale", () => {
  it("divides every length by the scale and keeps the rest", () => {
    // What Tailwind's ring-1 computes to.
    const ring = parseShadow("rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgb(228, 228, 231) 0px 0px 0px 1px");
    expect(ring).not.toBeNull();
    expect(scaledShadow(ring!, 0.5)).toBe(
      "rgba(0, 0, 0, 0) 0.000px 0.000px 0.000px 0.000px, rgb(228, 228, 231) 0.000px 0.000px 0.000px 2.000px",
    );
    expect(scaledShadow(parseShadow("rgb(0, 0, 0) 0px 4px 12px -2px inset")!, 2)).toBe("rgb(0, 0, 0) 0.000px 2.000px 6.000px -1.000px inset");
  });

  it("has nothing to correct without a shadow", () => {
    expect(parseShadow("none")).toBeNull();
    expect(parseShadow("rgba(0, 0, 0, 0) 0px 0px 0px 0px")).toBeNull();
  });
});
