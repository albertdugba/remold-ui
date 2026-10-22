import { expect, it } from "vitest";
import { isTracked, vRemold } from "./index";

it("tracks elements while mounted", () => {
  const el = {} as Element;
  (vRemold.mounted as unknown as (el: Element) => void)(el);
  expect(isTracked(el)).toBe(true);
  (vRemold.unmounted as unknown as (el: Element) => void)(el);
  expect(isTracked(el)).toBe(false);
});
