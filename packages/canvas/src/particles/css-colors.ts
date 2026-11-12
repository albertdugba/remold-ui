
const VARIABLE = /^var\(\s*(--[\w-]+)\s*(?:,\s*(.+))?\)$/;
const THEME_ATTRIBUTES = ["class", "style", "data-theme"];

export function hasVariables(colors: readonly string[] | undefined): boolean {
  return colors?.some((color) => VARIABLE.test(color.trim())) ?? false;
}

export function resolveColors(colors: readonly string[], element: Element): string[] {
  if (!hasVariables(colors) || typeof getComputedStyle !== "function") return [...colors];

  const style = getComputedStyle(element);

  return colors.map((color) => {
    const variable = VARIABLE.exec(color.trim());

    if (!variable) return color;

    return style.getPropertyValue(variable[1]!).trim() || variable[2]?.trim() || "transparent";
  });
}

export function watchTheme(change: () => void): () => void {
  if (typeof document === "undefined") return () => {};

  const observer = typeof MutationObserver === "function" ? new MutationObserver(change) : null;

  for (const root of [document.documentElement, document.body]) {
    if (root) observer?.observe(root, { attributes: true, attributeFilter: THEME_ATTRIBUTES });
  }

  const scheme = typeof matchMedia === "function" ? matchMedia("(prefers-color-scheme: dark)") : null;

  scheme?.addEventListener?.("change", change);

  return () => {
    observer?.disconnect();
    scheme?.removeEventListener?.("change", change);
  };
}
