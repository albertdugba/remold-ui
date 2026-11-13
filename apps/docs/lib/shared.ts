import { createGetUrl } from "fumadocs-core/source";

export const appName = "Remold";
export const docsRoute = "/docs";
export const docsContentRoute = "/llms.mdx/docs";

export const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://remoldui.xyz").replace(/\/$/, "");

const getContentUrl = createGetUrl(docsContentRoute);

export function getPageMarkdownUrl(page: { slugs: string[]; locale?: string }) {
  const segments = [...page.slugs, "content.md"];

  return { segments, url: getContentUrl(segments, page.locale) };
}
