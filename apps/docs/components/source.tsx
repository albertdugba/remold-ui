import { CodeBlockTab, CodeBlockTabs, CodeBlockTabsList, CodeBlockTabsTrigger } from "fumadocs-ui/components/codeblock";
import { ServerCodeBlock } from "fumadocs-ui/components/codeblock.rsc";
import { demoSources } from "./generated/demo-sources";
import { Install } from "./package-tabs";

interface SourceFile {
  name: string;
  code: string;
  lang: string;
  packages: readonly string[];
  javascript: string;
  javascriptName: string;
  javascriptLang: string;
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
        <CodeBlockTabs defaultValue="typescript">
          <CodeBlockTabsList>
            <CodeBlockTabsTrigger value="typescript">TypeScript</CodeBlockTabsTrigger>
            <CodeBlockTabsTrigger value="javascript">JavaScript</CodeBlockTabsTrigger>
          </CodeBlockTabsList>
          <CodeBlockTab value="typescript">
            <ServerCodeBlock code={usage.code} lang={usage.lang} codeblock={{ "data-line-numbers": true }} />
          </CodeBlockTab>
          <CodeBlockTab value="javascript">
            <ServerCodeBlock code={usage.javascript} lang={usage.javascriptLang} codeblock={{ "data-line-numbers": true }} />
          </CodeBlockTab>
        </CodeBlockTabs>
      </CodeBlockTab>
      <CodeBlockTab value="source">
        <SourceFiles files={files} />
      </CodeBlockTab>
    </CodeBlockTabs>
  );
}

function SourceFiles({ files, javascript = false }: { files: readonly SourceFile[]; javascript?: boolean }) {
  const firstFile = javascript ? files[0]!.javascriptName : files[0]!.name;

  return (
    <CodeBlockTabs defaultValue={firstFile}>
      <CodeBlockTabsList>
        {files.map((file) => {
          const name = javascript ? file.javascriptName : file.name;
          return (
            <CodeBlockTabsTrigger key={name} value={name}>
              {name}
            </CodeBlockTabsTrigger>
          );
        })}
      </CodeBlockTabsList>
      {files.map((file) => {
        const name = javascript ? file.javascriptName : file.name;
        const code = javascript ? file.javascript : file.code;
        const lang = javascript ? file.javascriptLang : file.lang;

        return (
          <CodeBlockTab key={name} value={name}>
            <ServerCodeBlock code={code} lang={lang} codeblock={{ "data-line-numbers": true }} />
          </CodeBlockTab>
        );
      })}
    </CodeBlockTabs>
  );
}

export function Dependencies({ demo }: { demo: string }) {
  const packages = [...new Set(getSource(demo).files.flatMap((file) => file.packages))].sort();
  if (packages.length === 0) return <p>Nothing else to install: it only needs React.</p>;
  return <Install packages={packages.join(" ")} />;
}
