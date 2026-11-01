/**
 * Colours a canvas can paint. A canvas doesn't read CSS variables, so `var(--name)` entries are
 * looked up on an element first; anything else is passed through as it is.
 */

const VARIABLE = /^var\(\s*(--[\w-]+)\s*(?:,\s*(.+))?\)$/;

/** Whether any of `colors` is a `var(--name)` to look up. */
export function hasVariables(colors: readonly string[] | undefined): boolean {
  return colors?.some((color) => VARIABLE.test(color.trim())) ?? false;
}

/** `colors` with each `var(--name)` read from `element`'s styles, falling back to the var's own fallback. */
export function resolveColors(colors: readonly string[], element: Element): string[] {
  if (!hasVariables(colors) || typeof getComputedStyle !== "function") return [...colors];
  const style = getComputedStyle(element);
  return colors.map((color) => {
    const variable = VARIABLE.exec(color.trim());
    if (!variable) return color;
    return style.getPropertyValue(variable[1]!).trim() || variable[2]?.trim() || "transparent";
  });
}

/**
 * Calls `change` when the page's theme may have changed: a class, style or `data-theme` on
 * `<html>` or `<body>`, or the system's light or dark setting. Returns a function that stops.
 */
export function watchTheme(change: () => void): () => void {
  if (typeof document === "undefined") return () => {};
  const observer = typeof MutationObserver === "function" ? new MutationObserver(change) : null;
  for (const root of [document.documentElement, document.body]) {
    if (root) observer?.observe(root, { attributes: true, attributeFilter: ["class", "style", "data-theme"] });
  }
  const scheme = typeof matchMedia === "function" ? matchMedia("(prefers-color-scheme: dark)") : null;
  scheme?.addEventListener?.("change", change);
  return () => {
    observer?.disconnect();
    scheme?.removeEventListener?.("change", change);
  };
}
