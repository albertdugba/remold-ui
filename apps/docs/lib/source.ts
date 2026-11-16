import { llms, loader } from "fumadocs-core/source";
import { lucideIconsPlugin } from "fumadocs-core/source/lucide-icons";
import { forAgents } from "./agent-markdown";
import { docsRoute } from "./shared";
import { defineDocs } from "fumadocs-mdx/macro";
import { metaSchema, pageSchema } from "fumadocs-core/source/schema";

const docs = defineDocs({
  dir: "content/docs",
  docs: {
    // `tags`: short labels under the title (the parts a page uses). `kind: canvas` marks a
    // component drawn on a canvas (illustrations and diagrams), listed apart from interface ones;
    // `kind: particles` marks product UI built from particles.
    // `status` (such as `new`) marks a page as new on the components page.
    // `hidden: true` takes a page off the site without deleting it: no route, sidebar entry or card.
    // All reuse the schema's own string type, so the docs don't need their own copy of zod.
    schema: pageSchema.extend({
      tags: pageSchema.shape.title.array().optional(),
      kind: pageSchema.shape.title.optional(),
      status: pageSchema.shape.title.optional(),
      hidden: pageSchema.shape.full,
    }),
    postprocess: {
      includeProcessedMarkdown: true,
    },
  },
  meta: {
    schema: metaSchema,
  },
});

const everything = docs.toFumadocsSource();
const shown = { ...everything, files: everything.files.filter((file) => file.type !== "page" || !file.data.hidden) };

// See https://fumadocs.dev/docs/headless/source-api for more info
export const source = loader({
  baseUrl: docsRoute,
  source: shown,
  plugins: [
    lucideIconsPlugin(),
  ],
});

/** For llms.txt and llms-full.txt: every page, with commands and packages but not each component's code. */
export const docsLlms = llms(source, {
  renderPage: async (page) => `# ${page.data.title} (${page.url})

${forAgents(await page.data.getText("processed"), { withCode: false })}`,
});

/** For one page's Markdown, the "Copy Markdown" and "Open in…" actions: everything, the code included. */
export const pageLlms = llms(source, {
  renderPage: async (page) => `# ${page.data.title} (${page.url})

> ${page.data.description ?? ""}

${forAgents(await page.data.getText("processed"), { withCode: true })}`,
});
