import { source } from "@/lib/source";
import { DocsBody, DocsDescription, DocsPage, DocsTitle, MarkdownCopyButton } from "fumadocs-ui/layouts/docs/page";
import { notFound } from "next/navigation";
import { getMDXComponents } from "@/components/mdx";
import type { Metadata } from "next";
import { createRelativeLink } from "fumadocs-ui/mdx";
import { getPageMarkdownUrl, siteUrl } from "@/lib/shared";
import { sourceOf } from "@/lib/agent-markdown";
import { OpenMenu } from "@/components/page-actions";

const REPO_FILES = "https://github.com/albertdugba/remold-ui/blob/main/apps/docs";

type DocsPageEntry = NonNullable<ReturnType<typeof source.getPage>>;

const componentOf = ({ slugs }: DocsPageEntry) => (slugs[0] === "components" && slugs.length === 2 ? slugs[1] : undefined);

function githubUrlOf(page: DocsPageEntry) {
  const component = componentOf(page);
  const entry = component ? sourceOf(component)?.files[0] : undefined;

  return entry ? `${REPO_FILES}/components/demos/${entry.name}` : `${REPO_FILES}/content/docs/${page.path}`;
}

function promptFor(page: DocsPageEntry, markdownUrl: string) {
  const url = `${siteUrl}${markdownUrl}`;
  const { title } = page.data;

  return componentOf(page)
    ? `I want to add the "${title}" component from Remold UI to my app. Read ${url} first: it has the install command, the dependencies and the full source. Then help me install it and fit it into my project.`
    : `Read ${url}, the Remold UI docs page "${title}". I want to ask questions about it.`;
}

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
        <OpenMenu prompt={promptFor(page, markdownUrl)} markdownUrl={markdownUrl} githubUrl={githubUrlOf(page)} />
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
    title: `${page.data.title} · Remold`,
    description: page.data.description,
  };
}
