export const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://remoldui.xyz").replace(/\/$/, "");

export const siteDescription =
  "Open-source React components and motion primitives that preserve continuity across layouts, text, SVG icons, and canvas scenes.";

export const socialImage = "/og-remold-ui.png";

export const socialImageAlt = "remold/ui: animated React components with the micro-animations built in.";

export function absoluteUrl(path = "/") {
  return new URL(path, siteUrl).toString();
}
