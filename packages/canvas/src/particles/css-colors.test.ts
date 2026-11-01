// @vitest-environment happy-dom
import { describe, expect, it, vi } from "vitest";
import { hasVariables, resolveColors, watchTheme } from "./css-colors";

describe("resolveColors", () => {
  it("reads var(--name) from the element, keeps other colours, and falls back", () => {
    const el = document.createElement("div");
    el.style.setProperty("--ink", " #111111 ");
    document.body.append(el);
    expect(resolveColors(["var(--ink)", "#fff", "var(--none, red)", "var(--none)"], el)).toEqual(["#111111", "#fff", "red", "transparent"]);
    expect(hasVariables(["#fff"])).toBe(false);
    expect(hasVariables(["var(--ink)"])).toBe(true);
  });
});

describe("watchTheme", () => {
  it("calls back when <html>'s class changes, until stopped", async () => {
    const change = vi.fn();
    const stop = watchTheme(change);
    document.documentElement.classList.add("dark");
    await new Promise((resolve) => setTimeout(resolve));
    expect(change).toHaveBeenCalled();
    stop();
    change.mockClear();
    document.documentElement.classList.remove("dark");
    await new Promise((resolve) => setTimeout(resolve));
    expect(change).not.toHaveBeenCalled();
  });
});
