import { CodeBlockTab, CodeBlockTabs, CodeBlockTabsList, CodeBlockTabsTrigger } from "fumadocs-ui/components/codeblock";
import { ServerCodeBlock } from "fumadocs-ui/components/codeblock.rsc";
import { demoSources } from "./generated/demo-sources";
import { Install } from "./package-tabs";

interface SourceFile {
  name: string;
  code: string;
  lang: string;
  packages: readonly string[];
}

interface DemoSource {
  usage: SourceFile;
  files: readonly SourceFile[];
}

function getSource(demo: string): DemoSource {
  const source = demoSources[demo as keyof typeof demoSources] as DemoSource | undefined;

  if (!source) throw new Error(`<Source demo="${demo}" />: no generated source is available.`);

  return source;
}

export function Source({ demo }: { demo: string }) {
  const { usage, files } = getSource(demo);

  return (
    <CodeBlockTabs defaultValue="usage">
      <CodeBlockTabsList>
        <CodeBlockTabsTrigger value="usage">Usage</CodeBlockTabsTrigger>
        <CodeBlockTabsTrigger value="source">Full source</CodeBlockTabsTrigger>
      </CodeBlockTabsList>
      <CodeBlockTab value="usage">
        <ServerCodeBlock code={usage.code} lang={usage.lang} codeblock={{ "data-line-numbers": true }} />
      </CodeBlockTab>
      <CodeBlockTab value="source">
        <SourceFiles files={files} />
      </CodeBlockTab>
    </CodeBlockTabs>
  );
}

function SourceFiles({ files }: { files: readonly SourceFile[] }) {
  const firstFile = files[0]!.name;

  return (
    <CodeBlockTabs defaultValue={firstFile}>
      <CodeBlockTabsList>
        {files.map((file) => (
          <CodeBlockTabsTrigger key={file.name} value={file.name}>
            {file.name}
          </CodeBlockTabsTrigger>
        ))}
      </CodeBlockTabsList>
      {files.map((file) => (
        <CodeBlockTab key={file.name} value={file.name}>
          <ServerCodeBlock code={file.code} lang={file.lang} codeblock={{ "data-line-numbers": true }} />
        </CodeBlockTab>
      ))}
    </CodeBlockTabs>
  );
}

export function Dependencies({ demo }: { demo: string }) {
  const packages = [...new Set(getSource(demo).files.flatMap((file) => file.packages))].sort();

  if (packages.length === 0) return <p>Nothing else to install: it only needs React.</p>;

  return <Install packages={packages.join(" ")} />;
}
