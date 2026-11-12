import { source } from "@/lib/source";
import { DocsBody, DocsDescription, DocsPage, DocsTitle, MarkdownCopyButton, ViewOptionsPopover } from "fumadocs-ui/layouts/docs/page";
import { notFound } from "next/navigation";
import { getMDXComponents } from "@/components/mdx";
import type { Metadata } from "next";
import { createRelativeLink } from "fumadocs-ui/mdx";
import { getPageMarkdownUrl } from "@/lib/shared";
import { socialImage } from "@/lib/seo";

export default async function Page(props: PageProps<"/docs/[[...slug]]">) {
  const params = await props.params;
  const page = source.getPage(params.slug);
  if (!page) notFound();

  const MDX = page.data.body;
  const markdownUrl = getPageMarkdownUrl(page).url;

  return (
    <DocsPage toc={page.data.toc} full={page.data.full}>
      <DocsTitle>{page.data.title}</DocsTitle>
      <DocsDescription className="mb-0">{page.data.description}</DocsDescription>
      {((page.data.tags && page.data.tags.length > 0) || page.data.kind === "canvas") && (
        <p className="rm-tags" aria-label="Uses">
          {page.data.kind === "canvas" && (
            <em className="kind" title="Drawn on a canvas: an illustration or diagram, not page content">
              Canvas
            </em>
          )}
          {page.data.tags?.map((tag) => <em key={tag}>{tag}</em>)}
        </p>
      )}
      <div className="flex flex-row gap-2 items-center border-b pb-6">
        <MarkdownCopyButton markdownUrl={markdownUrl} />
        <ViewOptionsPopover
          markdownUrl={markdownUrl}
          githubUrl={`https://github.com/albertdugba/remold-ui/blob/main/apps/docs/content/docs/${page.path}`}
        />
      </div>
      <DocsBody>
        <MDX
          components={getMDXComponents({
            // this allows you to link to other pages with relative file paths
            a: createRelativeLink(source, page),
          })}
        />
      </DocsBody>
    </DocsPage>
  );
}

export async function generateStaticParams() {
  return source.generateParams();
}

export async function generateMetadata(props: PageProps<"/docs/[[...slug]]">): Promise<Metadata> {
  const params = await props.params;
  const page = source.getPage(params.slug);
  if (!page) notFound();

  return {
    title: page.data.title,
    description: page.data.description,
    alternates: { canonical: page.url },
    openGraph: {
      type: "article",
      url: page.url,
      title: `${page.data.title} · Remold UI`,
      description: page.data.description,
      images: [{ url: socialImage, width: 1200, height: 630, alt: "Remold UI interface cards connected by motion traces" }],
    },
    twitter: { card: "summary_large_image", images: [socialImage] },
  };
}
