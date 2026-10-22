import { llms, loader } from "fumadocs-core/source";
import { lucideIconsPlugin } from "fumadocs-core/source/lucide-icons";
import { statusBadgesPlugin } from "fumadocs-core/source/status-badges";
import { createElement } from "react";
import { docsRoute } from "./shared";
import { defineDocs } from "fumadocs-mdx/macro";
import { metaSchema, pageSchema } from "fumadocs-core/source/schema";

const docs = defineDocs({
  dir: "content/docs",
  docs: {
    // `tags`: short labels under the title (the parts a page uses). `kind: canvas` marks a
    // component drawn on a canvas (illustrations and diagrams), listed apart from interface ones.
    // `status` (such as `new`) puts a small badge next to the page in the sidebar.
    // All reuse the schema's own string type, so the docs don't need their own copy of zod.
    schema: pageSchema.extend({
      tags: pageSchema.shape.title.array().optional(),
      kind: pageSchema.shape.title.optional(),
      status: pageSchema.shape.title.optional(),
    }),
    postprocess: {
      includeProcessedMarkdown: true,
    },
  },
  meta: {
    schema: metaSchema,
  },
});

// See https://fumadocs.dev/docs/headless/source-api for more info
export const source = loader({
  baseUrl: docsRoute,
  source: docs.toFumadocsSource(),
  plugins: [
    lucideIconsPlugin(),
    statusBadgesPlugin({ renderBadge: (status) => createElement("span", { className: "rm-badge", "data-status": status }, status) }),
  ],
});

export const docsLlms = llms(source, {
  renderPage: async (page) => `# ${page.data.title} (${page.url})

${await page.data.getText("processed")}`,
});
