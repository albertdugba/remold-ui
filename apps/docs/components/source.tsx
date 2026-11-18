import { ServerCodeBlock } from "fumadocs-ui/components/codeblock.rsc";
import { demoSources } from "./generated/demo-sources";
import { Install } from "./package-tabs";
import { SourceTabs } from "./source-tabs";

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

const panel = (file: SourceFile) => (
  <ServerCodeBlock
    code={file.code}
    lang={file.lang}
    codeblock={{ allowCopy: false, "data-line-numbers": true, viewportProps: { className: "max-h-[560px] lg:max-h-[760px]" } }}
  />
);

export function Source({ demo }: { demo: string }) {
  const { usage, files } = getSource(demo);

  return (
    <SourceTabs
      tabs={[
        { label: "Usage", code: usage.code, panel: panel(usage), apart: true },
        ...files.map((file) => ({ label: file.name, code: file.code, panel: panel(file) })),
      ]}
    />
  );
}

export function Dependencies({ demo }: { demo: string }) {
  const packages = [...new Set(getSource(demo).files.flatMap((file) => file.packages))].sort();

  if (packages.length === 0) return <p>Nothing else to install: it only needs React.</p>;

  return <Install packages={packages.join(" ")} />;
}
