import { describe, expect, it } from "vitest";
import { parseColor } from "./color";

describe("parseColor", () => {
  it("reads RGB channels and alpha in both CSS syntaxes", () => {
    expect(parseColor("rgb(255, 0, 10)")).toEqual([255, 0, 10, 1]);
    expect(parseColor("rgba(0, 0, 0, 0.5)")).toEqual([0, 0, 0, 0.5]);
    expect(parseColor("rgb(1 2 3 / 40%)")).toEqual([1, 2, 3, 0.4]);
    expect(parseColor("rgb(50% 0% 100%)")).toEqual([128, 0, 255, 1]);
  });

  it("converts modern CSS colours into sRGB without a canvas", () => {
    expect(parseColor("lab(100% 0 0)")).toEqual([255, 255, 255, 1]);
    expect(parseColor("oklch(1 0 0 / 40%)")).toEqual([255, 255, 255, 0.4]);
    expect(parseColor("color(srgb 1 0 0 / 0.25)")).toEqual([255, 0, 0, 0.25]);
    expect(parseColor("color(display-p3 1 0 0)")).toEqual([255, 0, 0, 1]);
    expect(parseColor("hsl(120 100% 50%)")).toEqual([0, 255, 0, 1]);
  });

  it("supports CSS colour profiles and clamps out-of-gamut channels", () => {
    expect(parseColor("color(srgb-linear 1 1 1)")).toEqual([255, 255, 255, 1]);
    expect(parseColor("color(rec2020 0.5 0.5 0.5)")).toEqual([139, 139, 139, 1]);
    expect(parseColor("#123456")).toEqual([18, 52, 86, 1]);
  });

  it("preserves transparent and unknown colour handling", () => {
    expect(parseColor("transparent")).toEqual([0, 0, 0, 0]);
    expect(parseColor("none")).toEqual([0, 0, 0, 0]);
    expect(parseColor("")).toEqual([0, 0, 0, 0]);
    expect(parseColor("not-a-colour")).toEqual([0, 0, 0, 1]);
  });
});
