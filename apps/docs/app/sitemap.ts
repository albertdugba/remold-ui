import type { MetadataRoute } from "next";
import { source } from "@/lib/source";
import { absoluteUrl } from "@/lib/seo";

export const dynamic = "force-static";

export default function sitemap(): MetadataRoute.Sitemap {
  const docs = source.getPages().map((page) => ({
    url: absoluteUrl(page.url),
    changeFrequency: "weekly" as const,
    priority: page.url === "/docs" ? 0.9 : 0.8,
  }));

  return [
    { url: absoluteUrl(), changeFrequency: "weekly", priority: 1 },
    { url: absoluteUrl("/illustrations"), changeFrequency: "monthly", priority: 0.7 },
    ...docs,
  ];
}
