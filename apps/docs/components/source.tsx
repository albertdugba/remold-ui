/**
 * The full source of a live demo, read from disk at build time: the demo file, every local file it
 * imports (helpers, data, shared frames) and their stylesheets, one tab per file. Because it reads
 * the real files, what you see is exactly what runs on the page.
 */
import { readFile } from "node:fs/promises";
import path from "node:path";
import { CodeBlockTab, CodeBlockTabs, CodeBlockTabsList, CodeBlockTabsTrigger } from "fumadocs-ui/components/codeblock";
import { ServerCodeBlock } from "fumadocs-ui/components/codeblock.rsc";
import { Install } from "./package-tabs";

const DEMOS = path.join(process.cwd(), "components/demos");
const EXTENSIONS = [".tsx", ".ts", ".js", ".css"];
/** Generated data (glyph outlines) is summarised rather than printed in full. */
const LARGEST = 40_000;

interface SourceFile {
  name: string;
  code: string;
  lang: string;
  /** Packages it imports from npm (not React itself, which every project has). */
  packages: string[];
}

const PROVIDED = new Set(["react", "react-dom", "next"]);

/** Bare imports, as package names: `@scope/name` or `name`. */
function packageImports(code: string): string[] {
  const found = new Set<string>();
  for (const match of code.matchAll(/(?:from|import)\s+'([^.'][^']*)'/g)) {
    const spec = match[1]!;
    const parts = spec.split("/");
    const name = spec.startsWith("@") ? parts.slice(0, 2).join("/") : parts[0]!;
    if (!PROVIDED.has(name)) found.add(name);
  }
  return [...found];
}

async function resolve(name: string): Promise<{ name: string; code: string } | null> {
  for (const candidate of path.extname(name) ? [name] : EXTENSIONS.map((ext) => name + ext)) {
    try {
      return { name: candidate, code: await readFile(path.join(DEMOS, candidate), "utf8") };
    } catch {
      // Try the next extension.
    }
  }
  return null;
}

/** Local imports in the order they appear: `from './x'` and side-effect `import './x.css'`. */
function localImports(code: string): string[] {
  const found: string[] = [];
  for (const match of code.matchAll(/(?:from|import)\s+'\.\/([^']+)'/g)) found.push(match[1]!);
  return found;
}

function summarise(file: { name: string; code: string }): string {
  if (file.code.length <= LARGEST) return file.code;
  const head = file.code.split("\n").slice(0, 3).join("\n").slice(0, 600);
  const size = Math.round(file.code.length / 1024);
  return `${head}\n// … ${size} KB of generated data, left out here. See the comment above for how it's made.\n`;
}

/** The demo first, each file's stylesheet straight after it, then the files it imports. */
async function collect(entry: string): Promise<SourceFile[]> {
  const files: SourceFile[] = [];
  const seen = new Set<string>();
  const visit = async (name: string) => {
    const file = await resolve(name);
    if (!file || seen.has(file.name)) return;
    seen.add(file.name);
    files.push({ name: file.name, code: summarise(file), lang: path.extname(file.name).slice(1), packages: packageImports(file.code) });
    const imports = localImports(file.code);
    for (const dep of imports.filter((d) => d.endsWith(".css"))) await visit(dep);
    for (const dep of imports.filter((d) => !d.endsWith(".css"))) await visit(dep);
  };
  await visit(entry);
  return files;
}

export async function Source({ demo }: { demo: string }) {
  const files = await collect(demo);
  if (files.length === 0) throw new Error(`<Source demo="${demo}" />: no file components/demos/${demo}.*`);
  return (
    <CodeBlockTabs defaultValue={files[0]!.name}>
      <CodeBlockTabsList>
        {files.map((f) => (
          <CodeBlockTabsTrigger key={f.name} value={f.name}>
            {f.name}
          </CodeBlockTabsTrigger>
        ))}
      </CodeBlockTabsList>
      {files.map((f) => (
        <CodeBlockTab key={f.name} value={f.name}>
          <ServerCodeBlock code={f.code} lang={f.lang} codeblock={{ "data-line-numbers": true }} />
        </CodeBlockTab>
      ))}
    </CodeBlockTabs>
  );
}

/** The npm packages a demo needs, as an install command for each package manager. */
export async function Dependencies({ demo }: { demo: string }) {
  const files = await collect(demo);
  const packages = [...new Set(files.flatMap((f) => f.packages))].sort();
  if (packages.length === 0) return <p>Nothing else to install: it only needs React.</p>;
  return <Install packages={packages.join(" ")} />;
}
