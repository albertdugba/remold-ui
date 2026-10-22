import { useState } from "react";
import { examplesIn } from "../../examples";
import type { Collection, Example } from "../../examples/types";
import { Code, Definitions, Demo, H2, PageHeader } from "../kit";

/** One example: what it is, the live demo, its code and the parts it uses. */
function ExampleSection({ example }: { example: Example }) {
  const [autoplay, setAutoplay] = useState(false);
  const { Demo: Live } = example;
  return (
    <section className="doc-example" aria-labelledby={example.id}>
      <H2 id={example.id}>{example.title}</H2>
      <p>{example.summary}</p>
      <Demo
        toolbar={
          <label className="doc-check">
            <input type="checkbox" checked={autoplay} onChange={(e) => setAutoplay(e.target.checked)} />
            Autoplay
          </label>
        }
      >
        <div className="example-stage">
          <Live preview={false} autoplay={autoplay} />
        </div>
      </Demo>
      <Code>{example.code}</Code>
      <Definitions label={["Uses", "For"]} rows={example.uses.map((u) => ({ name: u.name, description: u.role }))} />
    </section>
  );
}

const INTROS: Record<string, string> = {
  interfaces: "Product screens whose markup is replaced as things happen.",
  fintech: "Payment cards and the screens around them, in plain HTML and CSS.",
  canvas: "Scenes, diagrams and particles drawn on a canvas.",
  text: "Headlines, prices and status lines that change letter by letter.",
  icons: "Icons that reshape from one state into the next.",
  svg: "Artwork, charts and progress rings whose paths morph.",
};

export function ExamplesPage({ collection }: { collection: Collection }) {
  return (
    <>
      <PageHeader title={collection.category}>{INTROS[collection.id] ?? collection.summary}</PageHeader>
      {examplesIn(collection).map((example) => (
        <ExampleSection key={example.id} example={example} />
      ))}
    </>
  );
}
