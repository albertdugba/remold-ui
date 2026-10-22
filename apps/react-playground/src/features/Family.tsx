/**
 * A family graph is more than a horizontal tree: the same headless data can
 * become a lineage, an era-filtered migration map, or a person's archive.
 */
import { familyRelations, matchFamilyNames, peopleInFamilyEra, type FamilyGraph } from "@remold-ui/canvas";
import { Remold } from "@remold-ui/react";
import { useState } from "react";
import { useAutoplay, type DemoProps, type Example } from "../examples/types";
import { useMotion } from "../motion";
import { Segmented } from "../ui/controls";

type SceneProps = Remold.Scene.Props;
type Box = SceneProps["layouts"][string]["objects"][string];
type FamilyView = "Lineage" | "1858–1910" | "1910–1970" | "Archive";

const B = (x: number, y: number, z: number, width: number, depth: number, extra: Partial<Box> = {}): Box => ({
  x,
  y,
  z,
  width,
  depth,
  ...extra,
});
const VIEWS: readonly FamilyView[] = ["Lineage", "1858–1910", "1910–1970", "Archive"];

const alderFamily: FamilyGraph = {
  people: [
    { id: "elise", name: "Élise Durant", aliases: ["Elise Duran", "Élise O'Rourke"], born: 1858, died: 1931 },
    { id: "micah", name: "Micah Okafor", born: 1854, died: 1922 },
    { id: "marie", name: "Marie Durant", aliases: ["Marie Okafor"], born: 1885, died: 1964 },
    { id: "tomas", name: "Tomás Vega", aliases: ["Tomas Vega"], born: 1880, died: 1959 },
    { id: "clara", name: "Clara Vega", born: 1912, died: 1994 },
    { id: "noor", name: "Noor Vega", born: 1916, died: 2004 },
    { id: "eden", name: "Eden Vale", born: 1910, died: 1987 },
    { id: "imogen", name: "Imogen Vale", born: 1940 },
  ],
  unions: [
    { id: "elise-micah", partners: ["elise", "micah"], children: ["marie"] },
    { id: "marie-tomas", partners: ["marie", "tomas"], children: ["clara", "noor"] },
    { id: "clara-eden", partners: ["clara", "eden"], children: ["imogen"] },
  ],
};

const familyObjects: SceneProps["objects"] = {
  world: { look: "atlas", interactive: false },
  elise: {
    look: "portrait",
    label: "Élise",
    description: "Born in 1858. Her alternate surnames remain searchable in the headless record.",
  },
  micah: {
    look: "portrait",
    label: "Micah",
    description: "Born in 1854. His parent link is a directed edge, not a visual grouping trick.",
  },
  marie: { look: "portrait", label: "Marie", description: "The ancestor whose life joins the first migration to a document archive." },
  tomas: {
    look: "portrait",
    label: "Tomás",
    description: "Marie's partner. Their partnership is separate from their children's directed ancestry.",
  },
  clara: { look: "portrait", label: "Clara", description: "A second-generation branch that continues the family graph." },
  noor: { look: "portrait", label: "Noor", description: "Clara's sibling, kept as a separate branch rather than collapsed into a row." },
  eden: { look: "portrait", label: "Eden", description: "Clara's partner and Imogen's other parent." },
  imogen: { look: "portrait", label: "Imogen", description: "A third-generation descendant in the same directed acyclic graph." },
  census: { look: "wire", label: "1911 census", description: "A household record tied to Marie's archive." },
  passage: { look: "chip", label: "passage", description: "A passenger-list record connected to the migration." },
  letters: { look: "wire", label: "letters", description: "Scanned correspondence from the family collection." },
};

const relations = familyRelations(alderFamily);
const lineageLinks: NonNullable<SceneProps["links"]> = [
  ...relations
    .filter((relation) => relation.kind === "partner")
    .map((relation) => ({
      from: relation.from,
      to: relation.to,
      fromPort: "right" as const,
      toPort: "left" as const,
      route: "auto" as const,
      arrow: "both" as const,
      dashed: true,
      layouts: ["Lineage"],
    })),
  ...relations
    .filter((relation) => relation.kind === "parent")
    .map((relation) => ({
      from: relation.from,
      to: relation.to,
      fromPort: "front" as const,
      toPort: "back" as const,
      route: "auto" as const,
      arrow: "end" as const,
      layouts: ["Lineage"],
    })),
  {
    from: "elise",
    to: "marie",
    fromPort: "right",
    toPort: "left",
    route: "curve",
    arrow: "end",
    dashed: true,
    flow: true,
    layouts: ["1858–1910"],
  },
  {
    from: "micah",
    to: "marie",
    fromPort: "left",
    toPort: "right",
    route: "curve",
    arrow: "end",
    dashed: true,
    flow: true,
    layouts: ["1858–1910"],
  },
  {
    from: "marie",
    to: "clara",
    fromPort: "right",
    toPort: "left",
    route: "curve",
    arrow: "end",
    dashed: true,
    flow: true,
    layouts: ["1910–1970"],
  },
  {
    from: "tomas",
    to: "clara",
    fromPort: "left",
    toPort: "right",
    route: "curve",
    arrow: "end",
    dashed: true,
    flow: true,
    layouts: ["1910–1970"],
  },
  { from: "marie", to: "census", fromPort: "right", toPort: "left", route: "auto", arrow: "end", layouts: ["Archive"] },
  { from: "marie", to: "passage", fromPort: "right", toPort: "left", route: "auto", arrow: "end", layouts: ["Archive"] },
  { from: "marie", to: "letters", fromPort: "right", toPort: "left", route: "auto", arrow: "end", layouts: ["Archive"] },
];

const hiddenDocuments = {
  census: B(0, 0, 0, 160, 72, { opacity: 0 }),
  passage: B(0, 0, 0, 130, 62, { opacity: 0 }),
  letters: B(0, 0, 0, 150, 72, { opacity: 0 }),
};

const familyLayouts: SceneProps["layouts"] = {
  Lineage: {
    caption: "Eight people, three partnerships and three generations are one directed acyclic graph—not a linear family chart.",
    camera: "fit",
    objects: {
      world: B(-640, -390, 0, 1280, 760, { opacity: 0 }),
      elise: B(-470, -290, 0, 108, 108),
      micah: B(-250, -290, 0, 108, 108),
      marie: B(-365, -80, 0, 122, 122),
      tomas: B(-105, -80, 0, 108, 108),
      clara: B(-320, 150, 0, 112, 112),
      noor: B(-60, 150, 0, 112, 112),
      eden: B(-495, 150, 0, 106, 106),
      imogen: B(-410, 380, 0, 114, 114),
      ...hiddenDocuments,
    },
  },
  "1858–1910": {
    caption:
      "The era filter keeps people whose recorded lives overlap these years, then moves those same identities onto their places of origin and arrival.",
    camera: "fit",
    objects: {
      world: B(-640, -350, 0, 1280, 700),
      elise: B(-360, -115, 0, 106, 106),
      micah: B(55, 115, 0, 106, 106),
      marie: B(-75, 12, 0, 120, 120),
      tomas: B(150, 65, 0, 104, 104, { opacity: 0.68 }),
      clara: B(175, -92, 0, 92, 92, { opacity: 0.14 }),
      noor: B(300, 125, 0, 92, 92, { opacity: 0.14 }),
      eden: B(-480, 118, 0, 92, 92, { opacity: 0.08 }),
      imogen: B(-270, 235, 0, 92, 92, { opacity: 0 }),
      ...hiddenDocuments,
    },
  },
  "1910–1970": {
    caption:
      "The next era redraws neither the people nor the data model; it filters lifetimes and reroutes the meaningful migration paths over the map.",
    camera: "fit",
    objects: {
      world: B(-640, -350, 0, 1280, 700),
      elise: B(-360, -115, 0, 92, 92, { opacity: 0.16 }),
      micah: B(55, 115, 0, 92, 92, { opacity: 0.12 }),
      marie: B(-85, 5, 0, 120, 120),
      tomas: B(125, 70, 0, 108, 108),
      clara: B(205, -112, 0, 112, 112),
      noor: B(310, 105, 0, 112, 112),
      eden: B(-255, -210, 0, 102, 102, { opacity: 0.62 }),
      imogen: B(-75, -240, 0, 105, 105, { opacity: 0.44 }),
      ...hiddenDocuments,
    },
  },
  Archive: {
    caption: "Semantic zoom keeps Marie identifiable while her related evidence becomes the primary level of detail.",
    camera: { yaw: 0, pitch: 0, zoom: 1.42, centerX: 20, centerY: 15 },
    objects: {
      world: B(-640, -350, 0, 1280, 700, { opacity: 0 }),
      elise: B(-430, -160, 0, 90, 90, { opacity: 0 }),
      micah: B(-290, -160, 0, 90, 90, { opacity: 0 }),
      marie: B(-245, -145, 0, 230, 230, { label: "Marie Durant" }),
      tomas: B(100, 150, 0, 90, 90, { opacity: 0 }),
      clara: B(220, -150, 0, 90, 90, { opacity: 0 }),
      noor: B(220, 10, 0, 90, 90, { opacity: 0 }),
      eden: B(-430, 150, 0, 90, 90, { opacity: 0 }),
      imogen: B(-250, 190, 0, 90, 90, { opacity: 0 }),
      census: B(120, -190, 0, 230, 95),
      passage: B(145, -35, 0, 205, 84),
      letters: B(105, 105, 0, 250, 102),
    },
  },
};

const viewSummaries: Record<FamilyView, string> = {
  Lineage:
    "Relationships are distinct from parentage: double-ended dashed links represent a partnership; directed links represent ancestry.",
  "1858–1910":
    "The headless era filter selects every recorded life that overlaps these inclusive years, while name matching still recognises alternate spellings.",
  "1910–1970": "The same family graph now makes a second generation's movement visible without replacing anyone with a separate diagram.",
  Archive: "The camera settles onto one ancestor, then document nodes arrive as the relevant semantic detail.",
};

function FamilyTreeDemo({ preview, autoplay }: DemoProps) {
  const { loop, reducedMotion } = useMotion();
  const [view, setView] = useState<FamilyView>("Lineage");
  const [focused, setFocused] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  useAutoplay(autoplay, 3500, (count) => {
    setView(VIEWS[(count + 1) % VIEWS.length]!);
    setFocused(null);
  });

  const era = view === "1858–1910" ? { from: 1858, to: 1910 } : view === "1910–1970" ? { from: 1910, to: 1970 } : null;
  const peopleInView = era ? peopleInFamilyEra(alderFamily, era) : alderFamily.people;
  const matches = matchFamilyNames(alderFamily, query);
  const object = focused ? familyObjects[focused] : undefined;
  const searchResult = query
    ? matches.length
      ? `Matches: ${matches.map((person) => person.name).join(" · ")}`
      : "No matching recorded name."
    : "Search accepts accents, punctuation, and recorded alternate surnames.";

  return (
    <div className="demo-panel dark family-demo">
      <Remold.Scene
        key={reducedMotion}
        className="scene-canvas family-canvas"
        label="The Durant family: an explorable lineage, migration map, and ancestor archive"
        objects={familyObjects}
        layouts={familyLayouts}
        links={lineageLinks}
        palette="teal"
        layout={view}
        focused={focused}
        onFocusedChange={setFocused}
        interact={preview ? { hover: false, tap: false, drag: false, keyboard: false } : undefined}
        loop={loop}
        reducedMotion={reducedMotion}
      />
      {!preview && (
        <div className="family-tools">
          <Segmented
            label="Family view"
            tone="dark"
            options={VIEWS}
            value={view}
            onChange={(next) => {
              setView(next);
              setFocused(null);
            }}
          />
          <label className="family-search">
            <span>Find an ancestor</span>
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Try Elise or Durant" />
          </label>
        </div>
      )}
      {!preview && (
        <div className="journey-narration family-narration" aria-live="polite">
          <span>
            {focused ? object?.label : view} · {era ? `${peopleInView.length} people in this era` : "all recorded generations"}
          </span>
          <p>{object?.description ?? viewSummaries[view]}</p>
          <small>{searchResult}</small>
        </div>
      )}
    </div>
  );
}

export const familyTree: Example = {
  id: "family-tree",
  category: "Canvas",
  title: "Family tree",
  summary: "A headless family DAG that becomes a lineage, migration map, and ancestor-level evidence archive.",
  headline: (
    <>
      <span>Every family has more</span>
      <br />
      than one route through history.
    </>
  ),
  lead: "Visual Family Tree treats partnerships, parentage, migrations and documents as related views of one graph. The canvas moves from the whole lineage to an era map and down into a single person's evidence—without losing their identity.",
  tries: [
    "Switch from Lineage to each era to see the same people become a migration story.",
    "Search an alternate spelling such as “Durant” or “Elise”, then tap a portrait to focus it.",
    "Open Archive to follow semantic zoom from the family graph into Marie's census, passage and letters.",
  ],
  uses: [
    { name: "familyRelations", role: "Materialises parent and partnership edges from a validated directed acyclic graph." },
    {
      name: "matchFamilyNames / peopleInFamilyEra",
      role: "Keeps name search and multi-generational timeline filtering headless and reusable.",
    },
    { name: "portrait + atlas looks", role: "Draws people and a quiet map in the same canvas scene as relationship and migration paths." },
    { name: "Remold.Scene", role: "Springs every identity, link and camera between lineage, map and archive levels of detail." },
  ],
  frame: "panel",
  Demo: FamilyTreeDemo,
  code: `
const family = { people, unions };
validateFamilyGraph(family);

const links = familyRelations(family);
const peopleIn1910 = peopleInFamilyEra(family, { from: 1910, to: 1970 });
const matches = matchFamilyNames(family, "Durant");

<Remold.Scene
  objects={{ ancestor: { look: "portrait" }, world: { look: "atlas" } }}
  links={links}
  layouts={{ lineage, migrationEra, archive }}
/>
`,
};
