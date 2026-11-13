import { demoSources } from "@/components/generated/demo-sources";
import { siteUrl } from "./seo";

interface SourceFile {
  name: string;
  code: string;
  lang: string;
  packages: readonly string[];
}

export const sourceOf = (demo: string) =>
  (demoSources as Record<string, { usage: SourceFile; files: readonly SourceFile[] } | undefined>)[demo];

const fence = (lang: string, code: string) => `\`\`\`${lang}\n${code.trimEnd()}\n\`\`\``;

const installCommand = (name: string) => fence("bash", `npx shadcn@latest add ${siteUrl}/r/${name}.json`);

function dependenciesOf(demo: string) {
  const packages = [...new Set(sourceOf(demo)?.files.flatMap((file) => file.packages) ?? [])].sort();
  return packages.length ? fence("bash", `npm install ${packages.join(" ")}`) : "Nothing else to install: it only needs React.";
}

/** Every file the install command adds, with a line on where to start. */
function sourceSection(demo: string) {
  const source = sourceOf(demo);
  if (!source) return "";
  const files = source.files.map((file) => `### ${file.name}\n\n${fence(file.lang, file.code)}`).join("\n\n");
  return `## Code\n\nThe files the install command adds to \`components/remold\`. Start with the usage example:\n\n${fence(
    source.usage.lang,
    source.usage.code,
  )}\n\n${files}`;
}

/**
 * A docs page's Markdown, made useful to an agent: the live demos and components the site renders
 * (`<Stage>`, `<AddCommand>`, `<Dependencies>` and the rest) become the commands, package lists and
 * code they stand for. With `withCode`, the component's full source is added at the end.
 */
export function forAgents(markdown: string, { withCode }: { withCode: boolean }) {
  const demos = new Set<string>();

  // Code blocks are left exactly as written: only the prose between them is converted.
  const text = markdown
    .split(/(^```[\s\S]*?^```[ \t]*$)/m)
    .map((part) => (part.startsWith("```") ? part : convert(part, demos)))
    .join("")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  if (!withCode || demos.size === 0) return text;
  return `${text}\n\n${[...demos].map(sourceSection).filter(Boolean).join("\n\n")}`;
}

/** The site's own components in some prose, as what they stand for. Demos found are added to `demos`. */
function convert(prose: string, demos: Set<string>) {
  return prose
    // A live demo: noted, and replaced by its code at the end.
    .replace(/<Stage\b([^>]*)>[\s\S]*?<\/Stage>/g, (_, attributes: string) => {
      const name = /name="([^"]+)"/.exec(attributes)?.[1] ?? /demo="([^"]+)"/.exec(attributes)?.[1];
      if (name) demos.add(name);
      return "";
    })
    .replace(/<Customize\b[^>]*name="([^"]+)"[^>]*\/>/g, (_, name: string) => {
      demos.add(name);
      return "";
    })
    .replace(/<AddCommand\s+name="([^"]+)"\s*\/>/g, (_, name: string) => installCommand(name))
    .replace(/<Dependencies\s+demo="([^"]+)"\s*\/>/g, (_, demo: string) => dependenciesOf(demo))
    .replace(/<Install\s+packages="([^"]+)"\s*\/>/g, (_, packages: string) => fence("bash", `npm install ${packages}`))
    .replace(/<Callout>([\s\S]*?)<\/Callout>/g, (_, body: string) => `> ${body.trim()}`)
    // Anything else the site draws on its own (a showcase, an anatomy, a demo) has nothing to read.
    .replace(/^[ \t]*<[A-Z][A-Za-z]*(\s[^>]*)?\/>[ \t]*$/gm, "")
    // Heading ids the site adds for its own links.
    .replace(/^(#{1,6} .*?) \[#[\w-]+\]$/gm, "$1");
}
