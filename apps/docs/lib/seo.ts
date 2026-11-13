export const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://remoldui.xyz").replace(/\/$/, "");

export const siteDescription =
  "Open-source animated React components built with Motion and Base UI, with Remold for the morphing: text, SVG icons, shapes, particles and canvas scenes.";

export const socialImage = "/og-remold-ui.png";

export const socialImageAlt = "remold/ui: animated React components you copy into your app, built with Motion and Base UI. Remold adds the morphing: text, icons, shapes, particles and canvas scenes.";

export function absoluteUrl(path = "/") {
  return new URL(path, siteUrl).toString();
}
