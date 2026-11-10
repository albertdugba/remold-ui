export const siteUrl = "https://remoldui.xyz";

export const siteDescription =
  "Open-source React components and motion primitives that preserve continuity across layouts, text, SVG icons, and canvas scenes.";

export const socialImage = "/og-remold-ui.png";

export function absoluteUrl(path = "/") {
  return new URL(path, siteUrl).toString();
}
