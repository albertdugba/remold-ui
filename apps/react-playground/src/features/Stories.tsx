/**
 * Premium-template candidates. They are intentionally just data plus `<Remold.Story>`:
 * customers can start with a polished narrative and replace the objects and layouts with their
 * own domain model instead of being locked into an opaque editor.
 */
import { Remold } from "@remold-ui/react";
import { useState } from "react";
import { useAutoplay, type DemoProps, type Example } from "../examples/types";
import { useMotion } from "../motion";
import { Segmented } from "../ui/controls";

type StoryProps = Remold.Story.Props;
type Template = {
  label: string;
  palette: StoryProps["palette"];
  objects: StoryProps["objects"];
  layouts: StoryProps["layouts"];
  links?: StoryProps["links"];
  chapters: StoryProps["chapters"];
};

const B = (x: number, y: number, z: number, width: number, depth: number, extra: Record<string, unknown> = {}) => ({
  x,
  y,
  z,
  width,
  depth,
  ...extra,
});

function TemplateDemo({ template, preview, autoplay }: DemoProps & { template: Template }) {
  const { loop, reducedMotion } = useMotion();
  const [chapter, setChapter] = useState(template.chapters[0]!.id);
  useAutoplay(autoplay, 3800, (count) => setChapter(template.chapters[(count + 1) % template.chapters.length]!.id));
  const activeChapter = template.chapters.find((item) => item.id === chapter) ?? template.chapters[0]!;
  // Keep the narrative beside the journey controls instead of floating it over the thing it
  // describes. The underlying Story API still supports port-pinned annotations when needed.
  const storyChapters = template.chapters.map(({ annotation: _annotation, focused: _focused, ...storyChapter }) => storyChapter);
  return (
    <div className="demo-panel dark">
      <Remold.Story
        className="scene-story"
        canvasClassName="scene-canvas journey-canvas"
        label={template.label}
        chapter={chapter}
        onChapterChange={setChapter}
        chapters={storyChapters}
        objects={template.objects}
        layouts={template.layouts}
        links={template.links}
        palette={template.palette}
        loop={loop}
        reducedMotion={reducedMotion}
        interact={preview ? { hover: false, tap: false, drag: false, keyboard: false } : undefined}
      />
      {!preview && (
        <>
          <Segmented
            label="Story chapter"
            tone="dark"
            options={template.chapters.map((item) => ({ value: item.id, label: String(item.title ?? item.id) }))}
            value={chapter}
            onChange={setChapter}
          />
          <div className="journey-narration" aria-live="polite">
            <span>
              Chapter {template.chapters.findIndex((item) => item.id === activeChapter.id) + 1} · {activeChapter.title}
            </span>
            <p>{activeChapter.description}</p>
          </div>
        </>
      )}
    </div>
  );
}

function premiumTemplate(
  template: Template,
  page: Omit<Example, "category" | "frame" | "Demo" | "uses"> & { uses?: Example["uses"] },
): Example {
  const Demo = (props: DemoProps) => <TemplateDemo template={template} {...props} />;
  Demo.displayName = `StoryTemplate(${page.id})`;
  return {
    ...page,
    category: "Canvas",
    frame: "panel",
    uses: page.uses ?? [
      { name: "Remold.Story", role: "Coordinates the chapter's canvas layout, focus and the adjacent reading panel." },
      { name: "Remold.Scene", role: "Draws each template's objects, links and spring-driven camera." },
    ],
    Demo,
  };
}

const migrationTemplate: Template = {
  label: "A zero-downtime migration from a legacy data store to a new order store",
  palette: "teal",
  objects: {
    app: { look: "glass", label: "app", description: "The product that must stay available throughout the migration." },
    legacy: { look: "cylinder", label: "legacy store", description: "The original database, still handling all traffic at first." },
    changefeed: { look: "wire", label: "changefeed", description: "Streams each legacy change into the new store." },
    next: { look: "plate", label: "next store", description: "The replacement database, verified before becoming primary." },
    audit: { look: "chip", label: "verify", description: "Compares records and watches the replication lag." },
  },
  links: [
    {
      from: "app",
      to: "legacy",
      fromPort: "right",
      toPort: "left",
      route: "auto",
      arrow: "end",
      flow: true,
      layouts: ["Legacy", "Mirror"],
    },
    { from: "legacy", to: "changefeed", fromPort: "right", toPort: "left", route: "auto", arrow: "end", flow: true, layouts: ["Mirror"] },
    {
      from: "changefeed",
      to: "next",
      fromPort: "back",
      toPort: "front",
      route: "auto",
      arrow: "end",
      flow: true,
      layouts: ["Mirror", "Cutover"],
    },
    {
      from: "audit",
      to: "next",
      fromPort: "back",
      toPort: "front",
      route: "auto",
      arrow: "both",
      dashed: true,
      layouts: ["Mirror", "Cutover"],
    },
    { from: "app", to: "next", fromPort: "right", toPort: "left", route: "auto", arrow: "end", flow: true, layouts: ["Cutover"] },
    { from: "next", to: "legacy", fromPort: "right", toPort: "left", route: "auto", arrow: "both", dashed: true, layouts: ["Cutover"] },
  ],
  layouts: {
    Legacy: {
      caption: "The application still uses its original store.",
      camera: { yaw: 38, pitch: 58, zoom: 1.12 },
      objects: {
        app: B(-270, -45, 0, 170, 110),
        legacy: B(70, -60, 0, 190, 130),
        changefeed: B(100, -35, 0, 120, 70, { opacity: 0 }),
        next: B(100, -35, 0, 180, 120, { opacity: 0 }),
        audit: B(100, -35, 0, 96, 60, { opacity: 0 }),
      },
    },
    Mirror: {
      caption: "Every change now reaches both the legacy and new stores; verification makes the risk visible.",
      camera: { yaw: 35, pitch: 56, zoom: 0.97 },
      objects: {
        app: B(-500, -45, 0, 170, 110),
        legacy: B(-150, -60, 0, 180, 120),
        changefeed: B(150, -45, 0, 150, 90),
        next: B(450, -60, 0, 190, 130),
        audit: B(490, 150, 0, 120, 72),
      },
    },
    Cutover: {
      caption: "The new store becomes primary; the legacy store is retained only long enough to make rollback safe.",
      camera: "fit",
      objects: {
        app: B(-540, -55, 0, 180, 120),
        next: B(10, -70, 0, 240, 155, { label: "next · primary" }),
        changefeed: B(45, 170, 0, 155, 88, { opacity: 0.55 }),
        audit: B(305, 175, 0, 120, 76),
        legacy: B(505, -42, 0, 155, 98, { opacity: 0.32, label: "legacy · rollback" }),
      },
    },
  },
  chapters: [
    {
      id: "legacy",
      layout: "Legacy",
      focused: "legacy",
      title: "Baseline",
      description:
        "Start by naming the system that is currently responsible. A good migration story makes the risk explicit before it moves anything.",
      annotation: { object: "legacy", port: "top" },
    },
    {
      id: "mirror",
      layout: "Mirror",
      focused: "changefeed",
      title: "Mirror",
      description:
        "A changefeed creates a reversible bridge. Flowing links make the exact consistency path legible to everyone in the room.",
      annotation: { object: "changefeed", port: "top" },
    },
    {
      id: "cutover",
      layout: "Cutover",
      focused: "next",
      title: "Cut over",
      description: "The product switches once the new store has earned trust; the dim legacy store still tells the rollback story.",
      annotation: { object: "next", port: "top" },
    },
  ],
};

export const migrationMap = premiumTemplate(migrationTemplate, {
  id: "migration-map",
  title: "Migration map",
  summary: "A zero-downtime data migration told as baseline, mirrored replication and a controlled cutover.",
  headline: (
    <>
      <span>Make the risky</span>
      <br />
      change understandable.
    </>
  ),
  lead: "A premium Migration Map replaces a one-off technical diagram with a reusable product explanation. Engineers can drive it in docs and incident reviews; customer teams can use the same story to understand a safe rollout.",
  tries: [
    "Step through Baseline, Mirror and Cut over.",
    "Notice how the legacy store stays in view after cutover, giving rollback a concrete place in the model.",
    "Toggle Reduce motion to check that every chapter remains intelligible without animation.",
  ],
  code: `
<Remold.Story
  chapters={migrationChapters}
  objects={migrationObjects}
  layouts={migrationLayouts}
  links={migrationLinks}
  palette="teal"
/>
`,
});

const releaseTemplate: Template = {
  label: "A guarded software release moving from a build to a canary and promotion",
  palette: "amber",
  objects: {
    source: { look: "chip", label: "commit", description: "The change a team wants to put in front of customers." },
    checks: { look: "wire", label: "checks", description: "Build, tests and policy checks that gate the release." },
    canary: { look: "glass", label: "canary", description: "A small percentage of customer traffic on the new version." },
    metrics: { look: "tower", label: "signals", description: "Errors, latency and business health before a promotion." },
    production: { look: "plate", label: "production", description: "The stable release serving every customer." },
  },
  links: [
    { from: "source", to: "checks", fromPort: "right", toPort: "left", route: "straight", arrow: "end", flow: true },
    {
      from: "checks",
      to: "production",
      fromPort: "right",
      toPort: "left",
      route: "curve",
      arrow: "end",
      flow: true,
      layouts: ["Guardrail"],
    },
    {
      from: "checks",
      to: "canary",
      fromPort: "right",
      toPort: "left",
      route: "curve",
      arrow: "end",
      flow: true,
      layouts: ["Canary", "Promote"],
    },
    {
      from: "canary",
      to: "metrics",
      fromPort: "right",
      toPort: "left",
      route: "orthogonal",
      arrow: "both",
      dashed: true,
      flow: true,
      layouts: ["Canary", "Promote"],
    },
    { from: "canary", to: "production", fromPort: "right", toPort: "left", route: "curve", arrow: "end", flow: true, layouts: ["Promote"] },
  ],
  layouts: {
    Guardrail: {
      caption: "Before exposure, checks protect the stable production release.",
      camera: { yaw: 34, pitch: 58, zoom: 1.1 },
      objects: {
        source: B(-420, -45, 0, 120, 76),
        checks: B(-170, -52, 0, 170, 105),
        production: B(180, -70, 0, 230, 145),
        canary: B(200, -42, 0, 130, 82, { opacity: 0 }),
        metrics: B(200, -42, 0, 100, 100, { opacity: 0 }),
      },
    },
    Canary: {
      caption: "The new version gets 5% of traffic while health signals decide whether it earns a promotion.",
      camera: { yaw: 34, pitch: 56, zoom: 0.98 },
      objects: {
        source: B(-520, -45, 0, 120, 76),
        checks: B(-290, -52, 0, 170, 105),
        canary: B(30, -180, 0, 170, 105, { label: "canary · 5%" }),
        metrics: B(320, -180, 0, 110, 160),
        production: B(160, 110, 0, 230, 145),
      },
    },
    Promote: {
      caption: "Once signals remain healthy, the canary grows into the production path.",
      camera: "fit",
      objects: {
        source: B(-570, -40, 0, 120, 76, { opacity: 0.55 }),
        checks: B(-330, -52, 0, 170, 105, { opacity: 0.65 }),
        canary: B(-20, -60, 0, 200, 130, { label: "release · 100%" }),
        metrics: B(260, 130, 0, 110, 160),
        production: B(360, -70, 0, 230, 145, { opacity: 0.35, label: "previous · rollback" }),
      },
    },
  },
  chapters: [
    {
      id: "guard",
      layout: "Guardrail",
      focused: "checks",
      title: "Gate",
      description: "The first chapter shows why a release is trustworthy before it talks about speed.",
      annotation: { object: "checks", port: "top" },
    },
    {
      id: "canary",
      layout: "Canary",
      focused: "canary",
      title: "Canary",
      description: "A small release is meaningful only when the health signals that govern it are part of the same picture.",
      annotation: { object: "canary", port: "top" },
    },
    {
      id: "promote",
      layout: "Promote",
      focused: "canary",
      title: "Promote",
      description: "The canary grows into the primary path; the previous release is still visible as the rollback option.",
      annotation: { object: "canary", port: "top" },
    },
  ],
};

export const releaseControl = premiumTemplate(releaseTemplate, {
  id: "release-control",
  title: "Release control",
  summary: "A guarded software release: build checks, a health-observed canary, then a promotion with rollback context.",
  headline: (
    <>
      <span>Show how a release</span>
      <br />
      earns trust.
    </>
  ),
  lead: "Release Control turns the hand-wavy phrase “we use canaries” into a visual contract. It makes the checks, the exposure percentage, the decision signals and the rollback position understandable in a few chapters.",
  tries: [
    "Step from Gate to Canary to Promote.",
    "Watch the release change role without being replaced by a disconnected diagram.",
    "Use the story as a reference implementation for deployment docs or a live internal release page.",
  ],
  code: `
<Remold.Story
  chapters={releaseChapters}
  objects={releaseObjects}
  layouts={releaseLayouts}
  links={releaseLinks}
  palette="amber"
/>
`,
});
