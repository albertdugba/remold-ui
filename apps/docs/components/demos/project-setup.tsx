"use client";

import { HugeiconsIcon } from "@hugeicons/react";
import { Tick01Icon } from "@hugeicons/core-free-icons";
import { Checkbox } from "@base-ui/react/checkbox";
import { extrude } from "@remold-ui/canvas";
import { Remold } from "@remold-ui/react";
import { useEffect, useState } from "react";
import {
  API_GLYPH,
  DATASTORE_GLYPH,
  GLOBE_GLYPH,
  TEAM_GLYPH,
} from "./demo-glyphs";
import { Frame } from "./frame";
import { useScene } from "./use-scene";
import "./project-setup.css";

type SceneProps = Remold.Scene.Props;

interface Step {
  id: string;
  title: string;
  detail: string;

  icon: string;
}

const STEPS: readonly Step[] = [
  {
    id: "database",
    title: "Create a database",
    detail: "Postgres, in your region",
    icon: DATASTORE_GLYPH,
  },
  {
    id: "api",
    title: "Deploy the API",
    detail: "From your main branch",
    icon: API_GLYPH,
  },
  {
    id: "domain",
    title: "Connect a domain",
    detail: "lumen.app, with HTTPS",
    icon: GLOBE_GLYPH,
  },
  {
    id: "team",
    title: "Invite your team",
    detail: "Three people, as admins",
    icon: TEAM_GLYPH,
  },
];

const PLACES: Record<
  string,
  {
    x: number;
    y: number;
    width: number;
    depth: number;
    height: number;
    shape: "rect" | "ellipse";
  }
> = {
  api: { x: -70, y: -70, width: 140, depth: 140, height: 26, shape: "rect" },
  database: {
    x: -270,
    y: -40,
    width: 110,
    depth: 110,
    height: 64,
    shape: "ellipse",
  },
  domain: {
    x: 150,
    y: -210,
    width: 100,
    depth: 100,
    height: 18,
    shape: "ellipse",
  },
  team: { x: 130, y: 120, width: 110, depth: 80, height: 18, shape: "rect" },
};

const LINES: readonly NonNullable<SceneProps["links"]>[number][] = [
  { from: "api", to: "database", dashed: true, arrow: "both" },
  { from: "domain", to: "api", arrow: "end", flow: true },
  { from: "team", to: "api", arrow: "end" },
];

const IDS = STEPS.map((s) => s.id);

const nameOf = (done: ReadonlySet<string>) =>
  IDS.filter((id) => done.has(id)).join("+") || "none";

const SETS: string[][] = Array.from({ length: 1 << IDS.length }, (_, mask) =>
  IDS.filter((_, i) => mask & (1 << i)),
);

const OBJECTS: SceneProps["objects"] = Object.fromEntries(
  STEPS.map((step) => [
    step.id,
    {
      look: extrude({
        shape: PLACES[step.id]!.shape,
        ink: true,
        sides: "flat",
        radius: 0.16,
        decal: { icon: step.icon, text: "", size: 34 },
      }),
      label: step.title,
      description: step.detail,
    },
  ]),
);

const LAYOUTS: SceneProps["layouts"] = Object.fromEntries(
  SETS.map((done) => {
    const built = new Set(done);
    return [
      nameOf(built),
      {
        camera: { zoom: 1.2 },
        caption:
          built.size === IDS.length
            ? "The whole project: domain, API, database and team."
            : `${built.size} of ${IDS.length} pieces built.`,
        objects: Object.fromEntries(
          IDS.map((id) => {
            const { shape: _, ...box } = PLACES[id]!;
            return [
              id,
              built.has(id)
                ? { ...box, z: 0, arc: 40 }
                : { ...box, z: 46, ghost: 1 },
            ];
          }),
        ),
      },
    ];
  }),
);

const LINKS: SceneProps["links"] = LINES.map((line) => ({
  ...line,
  layouts: SETS.filter(
    (done) => done.includes(line.from) && done.includes(line.to),
  ).map((done) => nameOf(new Set(done))),
}));

const NIGHT = {
  top: "#202022",
  sides: ["#161617", "#1c1c1e", "#242426"],
  line: "236, 236, 238",
  glow: "236, 236, 238",
  text: "#f5f5f5",
} as const;

interface State {
  done: readonly string[];
}

const BEATS: readonly (State & { ms: number })[] = [
  { done: [], ms: 1600 },
  { done: ["database"], ms: 1300 },
  { done: ["database", "api"], ms: 1300 },
  { done: ["database", "api", "domain"], ms: 1300 },
  { done: IDS, ms: 3000 },
];

const fromBeat = (step: number): State => ({ done: BEATS[step]!.done });

interface ProjectSetupDemoProps {
  framed?: boolean;

  playing?: boolean;
}

export function ProjectSetupDemo({
  framed = true,
  playing,
}: ProjectSetupDemoProps) {
  const scene = useScene(BEATS, fromBeat, playing);
  const { state, take } = scene;
  const done = new Set(state.done);
  const finished = done.size === IDS.length;
  const [dark, setDark] = useState(false);

  useEffect(() => {
    const root = document.documentElement;
    const read = () => setDark(root.classList.contains("dark"));
    read();
    const watch = new MutationObserver(read);
    watch.observe(root, { attributes: true, attributeFilter: ["class"] });
    return () => watch.disconnect();
  }, []);

  const toggle = (id: string) =>
    take((s) => ({
      done: s.done.includes(id)
        ? s.done.filter((x) => x !== id)
        : [...s.done, id],
    }));

  const body = (
    <section ref={scene.ref} className="ps" aria-label="Project setup">
      <div className="ps-card">
        <div className="ps-steps">
          <header className="ps-head">
            <strong>{finished ? "Lumen is ready" : "Set up Lumen"}</strong>
            <span>{`${done.size} of ${IDS.length} done`}</span>
          </header>
          <div className="ps-meter" aria-hidden="true">
            <span style={{ width: `${(done.size / IDS.length) * 100}%` }} />
          </div>
          <ol className="ps-list">
            {STEPS.map((step) => {
              const on = done.has(step.id);
              return (
                <li key={step.id}>
                  <Checkbox.Root
                    className="ps-step"
                    checked={on}
                    onCheckedChange={() => toggle(step.id)}
                  >
                    <Checkbox.Indicator className="ps-check" keepMounted>
                      <HugeiconsIcon icon={Tick01Icon} strokeWidth={3} />
                    </Checkbox.Indicator>
                    <span className="ps-copy">
                      <strong>{step.title}</strong>
                      <span>{step.detail}</span>
                    </span>
                  </Checkbox.Root>
                </li>
              );
            })}
          </ol>
        </div>

        <Remold.Scene
          key={dark ? "dark" : "light"}
          className="ps-scene"
          label="Your project, as you set it up"
          objects={OBJECTS}
          links={LINKS}
          layouts={LAYOUTS}
          layout={nameOf(done)}
          palette={dark ? NIGHT : "sketch"}
          interact={{ drag: false }}
        />
      </div>
    </section>
  );

  return framed ? <Frame>{body}</Frame> : body;
}
