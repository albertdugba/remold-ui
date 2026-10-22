import type { ComponentType, ReactNode } from "react";
import { IconDemo, StatusDemo, FilesDemo } from "../demos";
import { Code, Definitions, Demo, DocLink, H2, PageHeader, PropsTable, type PropRow } from "../kit";

const spring = (fallback: string): PropRow => ({
  name: "spring",
  type: "{ duration, bounce }",
  default: fallback,
  description: (
    <>
      How it moves. See <DocLink to="concepts/springs">Springs</DocLink>.
    </>
  ),
});
const reducedMotion: PropRow = {
  name: "reducedMotion",
  type: '"user" | "always" | "never"',
  default: '"user"',
  description: (
    <>
      Follow the system setting, or override it. See <DocLink to="concepts/accessibility">Accessibility</DocLink>.
    </>
  ),
};
const loop: PropRow = {
  name: "loop",
  type: "FrameLoop",
  default: "shared loop",
  description: "The frame loop to run on. Pass your own to slow down or test.",
};
const className: PropRow = {
  name: "className",
  type: "string | (state) => string",
  description: "A class name, or a function of the state.",
};
const render: PropRow = {
  name: "render",
  type: "ReactElement | (props, state) => ReactElement",
  description: "Replace the default element.",
};

const transitionOptions: PropRow[] = [
  spring("springs.smooth"),
  {
    name: "match",
    type: "MatchNodesOptions",
    description: (
      <>
        Steer the matcher. See <DocLink to="concepts/matching">How matching works</DocLink>.
      </>
    ),
  },
  {
    name: "announce",
    type: "boolean | (summary) => string",
    default: "false",
    description: "Read a summary of each change to screen-reader users.",
  },
  reducedMotion,
  loop,
];

interface ApiPage {
  title: string;
  description: string;
  demo?: ComponentType;
  usage: string;
  props?: PropRow[];
  propsLabel?: string;
  returns?: PropRow[];
  data?: { name: string; description: ReactNode }[];
  notes?: ReactNode;
}

export const REACT_PAGES: Record<string, ApiPage> = {
  layout: {
    title: "Layout",
    description: "Animates everything inside it whenever its trigger changes.",
    demo: FilesDemo,
    usage: `
<Remold.Layout trigger={view}>
  {view === "grid" ? <Grid items={items} /> : <List items={items} />}
</Remold.Layout>
`,
    props: [
      {
        name: "trigger",
        type: "unknown",
        description: "Animate whenever this changes (compared with Object.is): a view, a sort order, a route.",
      },
      { name: "disabled", type: "boolean", default: "false", description: "Leave changes unanimated." },
      {
        name: "onTransition",
        type: "(transition) => void",
        description: "Called as each transition starts. Await ready or finished, or call skip().",
      },
      ...transitionOptions,
      className,
      render,
    ],
    data: [{ name: "data-rm-animating", description: "Present while a transition is running." }],
    notes: (
      <p>
        Layout reads the page during the render in which <code>trigger</code> changes and animates after React commits, so it works with any
        state library. Renders a <code>div</code>.
      </p>
    ),
  },
  text: {
    title: "Text",
    description: "Text that changes letter by letter: shared letters slide, the rest fade.",
    demo: StatusDemo,
    usage: `<Remold.Text>{status}</Remold.Text>`,
    props: [
      { name: "children", type: "string", description: "The text." },
      spring("springs.snappy"),
      reducedMotion,
      loop,
      className,
      render,
    ],
    data: [{ name: "data-rm-animating", description: "Present while letters are moving." }],
    notes: (
      <p>
        Renders a <code>span</code>. Screen readers get the whole new text at once, not the letters in motion.
      </p>
    ),
  },
  icon: {
    title: "Icon",
    description: "An SVG icon that reshapes from one path into the next.",
    demo: IconDemo,
    usage: `<Remold.Icon d={playing ? pausePath : playPath} viewBox="0 0 24 24" />`,
    props: [
      { name: "d", type: "string", description: 'The icon\'s path data. Several strokes go in one path ("M4 6h16M4 12h16").' },
      spring("springs.snappy"),
      {
        name: "match",
        type: "MorphOptions",
        default: '{ padding: "merge" }',
        description: "How pieces are paired. The default suits outline icons.",
      },
      reducedMotion,
      loop,
      className,
      render,
    ],
    data: [{ name: "data-rm-animating", description: "Present while the icon is morphing." }],
    notes: (
      <p>
        Renders an <code>svg</code> with one <code>path</code>. Any other SVG attribute (fill, stroke, viewBox) is passed through.
      </p>
    ),
  },
  "path-group": {
    title: "PathGroup",
    description: "A multi-part SVG illustration whose parts each morph.",
    usage: `
<Remold.PathGroup
  viewBox="0 0 600 220"
  paths={[
    { id: "area", d: areaPath, fill: "url(#fade)" },
    { id: "line", d: linePath, stroke: "currentColor", fill: "none" },
  ]}
/>
`,
    props: [
      { name: "paths", type: "PathSpec[]", description: "The parts: an id, the path data, and any SVG attributes." },
      { name: "viewBox", type: "string", default: '"0 0 24 24"', description: "Shared by every part." },
      spring("springs.snappy"),
      { name: "match", type: "MorphOptions", description: "How pieces within each part are paired." },
      reducedMotion,
      loop,
      className,
      render,
    ],
    data: [{ name: "data-rm-paths", description: "The number of parts." }],
    notes: (
      <p>
        Give parts stable ids. A part keeps morphing from where it is when its path changes; new parts appear and removed ones go through
        React as usual.
      </p>
    ),
  },
  scene: {
    title: "Scene",
    description: "A canvas scene of objects that springs between layouts.",
    usage: `
<Remold.Scene
  label="Our architecture"
  objects={{ api: { look: "chip", label: "API" }, db: { look: "cylinder", label: "Database" } }}
  layouts={{
    simple: { objects: { api: { x: 0, y: 0, width: 80, depth: 80 }, db: { x: 160, y: 0, width: 80, depth: 80 } } },
    scaled: { objects: { api: { x: 0, y: -60, width: 80, depth: 80 }, db: { x: 200, y: 40, width: 120, depth: 120 } } },
  }}
  layout={layout}
/>
`,
    props: [
      { name: "objects", type: "Record<string, SceneObject>", description: "Every object: its look, label and description." },
      { name: "layouts", type: "Record<string, SceneLayout>", description: "Named arrangements: where each object sits, and the camera." },
      { name: "links", type: "SceneLink[]", description: "Lines between objects, optionally with flowing dots." },
      { name: "layout", type: "string", description: "The layout to show (controlled)." },
      { name: "defaultLayout", type: "string", default: "the first layout", description: "The first layout when not controlled." },
      { name: "focused", type: "string | null", description: "The focused object (controlled)." },
      { name: "defaultFocused", type: "string | null", description: "The first focused object when not controlled." },
      { name: "onFocusedChange", type: "(id) => void", description: "Called when the user focuses an object or clears focus." },
      { name: "label", type: "string", description: "The canvas's accessible name." },
      { name: "palette", type: "PaletteName | Palette", description: "Colours for every object." },
      { name: "interact", type: "{ hover, tap, drag, keyboard }", default: "all true", description: "Which interactions are on." },
      spring("{ duration: 0.8, bounce: 0.18 }"),
      { name: "actionsRef", type: "RefObject<Actions>", description: "Extra controls: points, pick, anchor, box and redraw." },
      reducedMotion,
      loop,
      className,
      render,
    ],
    data: [
      { name: "data-rm-layout", description: "The layout on screen." },
      { name: "data-rm-focused", description: "The focused object, if any." },
    ],
    notes: (
      <p>
        Without React, use <DocLink to="canvas/scene">scene()</DocLink>.
      </p>
    ),
  },
  story: {
    title: "Story",
    description: "A Scene told as chapters, each revealing a layout with an annotation.",
    usage: `
<Remold.Story
  objects={objects}
  layouts={layouts}
  chapters={[
    { id: "request", layout: "simple", focused: "api", title: "A request arrives" },
    { id: "scale", layout: "scaled", focused: "db", title: "The database grows" },
  ]}
/>
`,
    props: [
      {
        name: "chapters",
        type: "Chapter[]",
        description: "In order: an id, a layout, an optional focused object, title, description and annotation.",
      },
      { name: "chapter", type: "string", description: "The current chapter (controlled)." },
      { name: "defaultChapter", type: "string", default: "the first chapter", description: "The first chapter when not controlled." },
      { name: "onChapterChange", type: "(id) => void", description: "Called when a chapter is requested." },
      { name: "renderAnnotation", type: "(state) => ReactNode", description: "Your own annotation markup." },
      {
        name: "objects, layouts, links",
        type: "",
        description: (
          <>
            As for <DocLink to="react/scene">Scene</DocLink>.
          </>
        ),
      },
      { name: "actionsRef", type: "RefObject<Actions>", description: "go(id), anchor and redraw." },
      className,
      render,
    ],
  },
  ignore: {
    title: "Ignore",
    description: "Leaves its contents out of transitions.",
    usage: `
<Remold.Layout trigger={view}>
  <Remold.Ignore>
    <LiveChart />
  </Remold.Ignore>
</Remold.Layout>
`,
    props: [className, render],
    notes: (
      <p>
        Renders a <code>span</code> with <code>data-rm-ignore</code>. You can put that attribute on any element instead.
      </p>
    ),
  },
  "use-remold": {
    title: "useRemold",
    description: "Animate a state change you make from an event handler.",
    usage: `
const { ref, animate } = useRemold();

<ul ref={ref}>{items.map(renderItem)}</ul>
<button onClick={() => animate(() => setSort("price"))}>Sort by price</button>
`,
    propsLabel: "Option",
    props: transitionOptions,
    returns: [
      { name: "ref", type: "(node) => void", description: "Attach to the element whose contents change." },
      {
        name: "animate",
        type: "(update, options?) => Transition | null",
        description: "Runs update synchronously and animates what it changed. Use it in event handlers, not effects.",
      },
    ],
  },
  "use-view-transition": {
    title: "useViewTransition",
    description: "Run a change through the browser's View Transitions API, with Remold pairing the elements.",
    usage: `
const { ref, animate } = useViewTransition();

<main ref={ref}>
  <button onClick={() => animate(() => setPage("detail"))}>Open</button>
</main>
`,
    propsLabel: "Option",
    props: transitionOptions,
    returns: [
      { name: "ref", type: "(node) => void", description: "Attach to the element whose contents change." },
      { name: "animate", type: "(update, options?) => Transition | null", description: "Runs update and animates it." },
    ],
    notes: (
      <p>
        Best for large, route-sized changes, which the browser animates off the main thread. View transitions can't be interrupted, so it
        falls back to <DocLink to="react/use-remold">useRemold</DocLink> where the API is missing, when reduced motion is on, or
        for very large pages.
      </p>
    ),
  },
};

export function ReactPage({ id }: { id: string }) {
  const page = REACT_PAGES[id]!;
  const { demo: DemoComponent } = page;
  return (
    <>
      <PageHeader title={page.title}>{page.description}</PageHeader>
      {DemoComponent && (
        <Demo>
          <DemoComponent />
        </Demo>
      )}
      <H2>Usage</H2>
      <Code>{page.usage}</Code>
      {page.notes}
      {page.props && (
        <>
          <H2>{page.propsLabel === "Option" ? "Options" : "Props"}</H2>
          <PropsTable rows={page.props} label={page.propsLabel} />
        </>
      )}
      {page.returns && (
        <>
          <H2>Returns</H2>
          <PropsTable rows={page.returns} label="Value" />
        </>
      )}
      {page.data && (
        <>
          <H2>Data attributes</H2>
          <Definitions label={["Attribute", "Meaning"]} rows={page.data} />
        </>
      )}
    </>
  );
}
