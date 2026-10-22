import { Code, Definitions, DocLink, H2, Note, PageHeader, PropsTable } from "../kit";

export function CanvasScene() {
  return (
    <>
      <PageHeader title="scene()">A canvas scene of objects that springs between named layouts. No framework needed.</PageHeader>
      <H2>Usage</H2>
      <Code>{`
import { scene } from "@remold-ui/canvas";

const diagram = scene(canvas, {
  label: "Our architecture",
  objects: { api: { look: "chip", label: "API" }, db: { look: "cylinder", label: "Database" } },
  layouts: { simple: { objects: { … } }, scaled: { objects: { … } } },
  links: [{ from: "api", to: "db", flow: true }],
});

diagram.to("scaled");
`}</Code>
      <p>
        Objects are drawn with a <code>look</code>: <code>plate</code>, <code>chip</code>, <code>cylinder</code>, <code>tower</code>,{" "}
        <code>glass</code>, <code>wire</code>, <code>portrait</code>, <code>atlas</code> or <code>grid</code>, or your own. Positions are
        floor units, so the same layout fits any canvas size. In React, use <DocLink to="react/scene">Scene</DocLink>.
      </p>
      <H2>Methods</H2>
      <PropsTable
        label="Method"
        rows={[
          { name: "to(layout)", type: "void", description: "Spring to another layout." },
          { name: "focus(id | null)", type: "void", description: "Lift an object and dim the rest, or clear focus." },
          { name: "points(points, options?)", type: "void", description: "Show a cloud of cubes. Calling again morphs to the new cloud." },
          {
            name: "anchor(id, port?)",
            type: "{ x, y } | null",
            description: "Where an object is on the canvas, for placing HTML over it.",
          },
          { name: "pick(x, y)", type: "string | null", description: "The object at a canvas point." },
          { name: "destroy()", type: "void", description: "Stop and remove listeners." },
        ]}
      />
    </>
  );
}

export function CanvasParticles() {
  return (
    <>
      <PageHeader title="particles()">Thousands of dots that rebuild themselves into each new shape.</PageHeader>
      <H2>Usage</H2>
      <Code>{`
import { particles, sampleTextPoints } from "@remold-ui/canvas";
import { samplePath } from "@remold-ui/core";

const dots = particles(canvas, { points: sampleTextPoints("Hello", { count: 2000 }), label: "Hello" });

dots.to(samplePath(logoPath, { count: 2000 }), { label: "Our logo" });
`}</Code>
      <p>
        Each dot pairs with a nearby spot in the next shape and springs there; spare dots shrink away and new ones grow in. Dots near the
        pointer lean away. See the <DocLink to="examples/canvas">Particles example</DocLink>.
      </p>
      <H2>Options</H2>
      <PropsTable
        label="Option"
        rows={[
          { name: "points", type: "CloudPoint[]", description: "The first shape. A point's tone picks its palette colour." },
          {
            name: "fit",
            type: '"contain" | "none"',
            default: '"contain"',
            description: "Scale each shape to the canvas, or use points as CSS pixels.",
          },
          { name: "padding", type: "number", default: "24", description: "Space kept round a fitted shape." },
          { name: "radius", type: "number", default: "2.5", description: "Dot radius at full size." },
          { name: "shape", type: '"circle" | "square"', default: '"circle"', description: "Squares are cheaper for very large clouds." },
          {
            name: "color",
            type: "fill | (ctx, size) => fill",
            default: "CSS color",
            description: "One fill for every dot, such as a gradient.",
          },
          { name: "palette", type: "string[]", description: "Colours by tone, from 0 (first) to 1 (last)." },
          {
            name: "pointer",
            type: "false | { radius, strength }",
            default: "{ radius: 90, strength: 22 }",
            description: "How dots lean away from the pointer.",
          },
          { name: "label", type: "string", description: "The canvas's accessible name." },
          { name: "spring", type: "{ duration, bounce }", default: "{ duration: 0.9, bounce: 0.2 }", description: "How dots move." },
        ]}
      />
      <H2>Sampling shapes</H2>
      <Definitions
        label={["Function", "Gives points for"]}
        rows={[
          { name: "samplePath(d, options)", description: 'An SVG path\'s inside, or its outline with mode: "outline".' },
          { name: "sampleTextPoints(text, options)", description: "Text in a CSS font. Load web fonts first." },
          { name: "sampleImagePoints(image, options)", description: "An image's opaque, dark or light pixels." },
          { name: "sampleMask(mask, options)", description: "Any pixel data, such as ImageData." },
        ]}
      />
      <p>
        All take <code>count</code> (exactly that many points) or <code>spacing</code>, plus <code>pattern</code> and <code>jitter</code>.
      </p>
    </>
  );
}

export function CoreMotion() {
  return (
    <>
      <PageHeader title="Motion values">Springs you drive yourself: one number, or thousands at once.</PageHeader>
      <H2>value()</H2>
      <Code>{`
import { value, springs } from "@remold-ui/core";

const x = value(0, { spring: springs.snappy });
x.to(100);

frames((dt) => {
  x.step(dt);
  element.style.translate = \`\${x.current}px\`;
  return !x.settled;
});
`}</Code>
      <PropsTable
        label="Member"
        rows={[
          { name: "to(target, options?)", type: "void", description: "Spring towards a target, keeping position and speed." },
          { name: "set(value)", type: "void", description: "Jump and stop." },
          { name: "hold() / release(options?)", type: "void", description: "Grab it for a drag, then let go with a velocity." },
          { name: "step(dt)", type: "boolean", description: "Advance by dt seconds. True while moving." },
          {
            name: "current, velocity, target, settled",
            type: "",
            description: "Where it is, how fast, where it's heading, and whether it has stopped.",
          },
        ]}
      />
      <H2>values()</H2>
      <p>The same, for many numbers in flat typed arrays, so a renderer can read thousands of positions each frame without allocating.</p>
      <Code>{`
const dots = values(positions, { stride: 2 }); // [x0, y0, x1, y1, …]
dots.toAll(next);
dots.step(dt);
draw(dots.current);
`}</Code>
      <Note>
        <code>frames()</code> comes from <code>@remold-ui/dom</code>. In tests or a worker, call <code>step</code> yourself.
      </Note>
    </>
  );
}

export function CoreMatching() {
  return (
    <>
      <PageHeader title="Matching">The pairing functions everything else uses, available on their own.</PageHeader>
      <H2>matchNodes()</H2>
      <p>
        Pairs two lists of element descriptions (kind, text, box, colour, parent). This is what{" "}
        <DocLink to="concepts/matching">transitions</DocLink> use.
      </p>
      <Code>{`
const { pairs, added, removed, splits, merges } = matchNodes(before, after, { threshold: 0.5 });
`}</Code>
      <H2>matchPoints()</H2>
      <p>
        Pairs two clouds of points so the total distance travelled is as small as possible. Exact for small clouds; for large ones a fast
        approximation lands within a few percent of the best.
      </p>
      <Code>{`
const { pairs, leaving, arriving } = matchPoints(oldPoints, newPoints, { maxDistance: 80 });
`}</Code>
    </>
  );
}

export function CoreShapes() {
  return (
    <>
      <PageHeader title="Shapes">Parse, morph and sample SVG paths.</PageHeader>
      <H2>createMorph()</H2>
      <Code>{`
import { createMorph } from "@remold-ui/core";

const morph = createMorph(fromPath, toPath);
path.setAttribute("d", morph.d(0.5)); // halfway
`}</Code>
      <p>
        Handles different numbers of points, several pieces and holes. <code>t</code> can go past 0 and 1, so springs can overshoot.
      </p>
      <H2>pointCloud()</H2>
      <p>
        The motion behind <DocLink to="canvas/particles">particles()</DocLink>, without any drawing: give it new points and read positions,
        sizes and tones from <code>data</code> each frame. Use it with WebGL, SVG or anything else.
      </p>
      <Code>{`
const cloud = pointCloud(samplePath(a, { count: 3000 }));
cloud.to(samplePath(b, { count: 3000 }));
cloud.step(dt); // then draw cloud.data: [x, y, size, tone, …]
`}</Code>
    </>
  );
}
