import { expect, it } from "vitest";
import { createMorph } from "./index";

it("returns path data for every progress value", () => {
  const morph = createMorph("M0 0H10V10H0Z", "M5 0L10 10H0Z");

  expect(morph.d(0)).toMatch(/^M/);
  expect(morph.d(0.5)).toMatch(/^M/);
  expect(morph.d(1)).toMatch(/^M/);
  expect(morph.d(0)).not.toBe(morph.d(1));
});
