"use client";

import { HugeiconsIcon } from "@hugeicons/react";
import { CheckIcon } from "@hugeicons/core-free-icons";
import { Checkbox } from "@base-ui/react/checkbox";
import { extrude } from "@remold-ui/canvas";
import { Remold } from "@remold-ui/react/canvas";
import { useEffect, useState, type Ref } from "react";
import { API_GLYPH, DATASTORE_GLYPH, GLOBE_GLYPH, TEAM_GLYPH } from "./demo-glyphs";
import { Frame } from "./frame";
import { useControllableState } from "./use-controllable-state";
import { useScene } from "./use-scene";

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

const IDS = STEPS.map((step) => step.id);

const nameOf = (done: ReadonlySet<string>) => IDS.filter((id) => done.has(id)).join("+") || "none";

const SETS: string[][] = Array.from({ length: 1 << IDS.length }, (_, mask) =>
  IDS.filter((_, index) => mask & (1 << index)),
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
            return [id, built.has(id) ? { ...box, z: 0, arc: 40 } : { ...box, z: 46, ghost: 1 }];
          }),
        ),
      },
    ];
  }),
);

const LINKS: SceneProps["links"] = LINES.map((line) => ({
  ...line,
  layouts: SETS.filter((done) => done.includes(line.from) && done.includes(line.to)).map((done) =>
    nameOf(new Set(done)),
  ),
}));

const NIGHT = {
  top: "#202022",
  sides: ["#161617", "#1c1c1e", "#242426"],
  line: "236, 236, 238",
  glow: "236, 236, 238",
  text: "#f5f5f5",
} as const;

export interface ProjectSetupValue {
  done: readonly string[];
}

export interface ProjectSetupProps {
  value?: ProjectSetupValue;
  defaultValue?: ProjectSetupValue;
  onValueChange?: (value: ProjectSetupValue) => void;
  ref?: Ref<HTMLElement>;
}

export function ProjectSetup({ value, defaultValue = { done: [] }, onValueChange, ref }: ProjectSetupProps) {
  const [setup, setSetup] = useControllableState({ value, defaultValue, onValueChange });
  const done = new Set(setup.done);
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
    setSetup((current) => ({
      done: current.done.includes(id)
        ? current.done.filter((stepId) => stepId !== id)
        : [...current.done, id],
    }));

  return (
    <section
      ref={ref}
      className="grid w-[min(100%,680px)] font-sans text-[13px] text-(--ps-ink) [--ps-faint:#a3a3a3] [--ps-fill:#f4f4f4] [--ps-ink:#111111] [--ps-line:rgb(0_0_0/0.08)] [--ps-muted:#737373] [--ps-surface:#ffffff] dark:[--ps-faint:#6b6b6b] dark:[--ps-fill:#222222] dark:[--ps-ink:#f5f5f5] dark:[--ps-line:rgb(255_255_255/0.1)] dark:[--ps-muted:#a3a3a3] dark:[--ps-surface:#171717]"
      aria-label="Project setup"
    >
      <div className="grid grid-cols-[minmax(0,250px)_minmax(0,1fr)] overflow-hidden rounded-[18px] bg-(--ps-surface) in-[.rm-stage]:shadow-[inset_0_0_0_1px_var(--ps-line)] max-[560px]:grid-cols-1">
        <div className="grid content-start gap-3.5 px-5 py-[22px] shadow-[1px_0_0_var(--ps-line)] max-[560px]:shadow-[0_1px_0_var(--ps-line)]">
          <header className="grid gap-0.5">
            <strong className="text-[15px] font-semibold">
              {finished ? "Lumen is ready" : "Set up Lumen"}
            </strong>
            <span className="text-(--ps-muted) tabular-nums">{`${done.size} of ${IDS.length} done`}</span>
          </header>
          <div className="h-[3px] overflow-hidden rounded-full bg-(--ps-fill)" aria-hidden="true">
            <span
              className="block h-full rounded-[inherit] bg-(--ps-ink) transition-[width] duration-600 ease-[cubic-bezier(0.22,1,0.36,1)]"
              style={{ width: `${(done.size / IDS.length) * 100}%` }}
            />
          </div>
          <ol className="-mx-2 mt-1 mb-0 grid list-none gap-0.5 p-0">
            {STEPS.map((step) => {
              const on = done.has(step.id);
              return (
                <li key={step.id}>
                  <Checkbox.Root
                    className="group/step flex w-full cursor-pointer items-start gap-3 rounded-[10px] border-0 bg-transparent px-2 py-[9px] text-left text-inherit hover:bg-(--ps-fill) focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-(--ps-ink)"
                    checked={on}
                    onCheckedChange={() => toggle(step.id)}
                  >
                    <Checkbox.Indicator
                      className="mt-px grid size-[18px] flex-none place-items-center rounded-full text-(--ps-surface) shadow-[inset_0_0_0_1.5px_var(--ps-faint)] transition-[background-color,box-shadow] duration-250 data-checked:bg-(--ps-ink) data-checked:shadow-none [&_svg]:size-[11px]"
                      keepMounted
                    >
                      <HugeiconsIcon icon={CheckIcon} strokeWidth={3} />
                    </Checkbox.Indicator>
                    <span className="grid gap-px">
                      <strong className="font-medium transition-colors duration-250 group-data-checked/step:text-(--ps-muted)">
                        {step.title}
                      </strong>
                      <span className="text-[12px] text-(--ps-muted)">{step.detail}</span>
                    </span>
                  </Checkbox.Root>
                </li>
              );
            })}
          </ol>
        </div>

        <Remold.Scene
          key={dark ? "dark" : "light"}
          className="block size-full min-h-80 max-[560px]:min-h-[260px]"
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
}

const BEATS: readonly (ProjectSetupValue & { ms: number })[] = [
  { done: [], ms: 1600 },
  { done: ["database"], ms: 1300 },
  { done: ["database", "api"], ms: 1300 },
  { done: ["database", "api", "domain"], ms: 1300 },
  { done: IDS, ms: 3000 },
];

const fromBeat = (step: number): ProjectSetupValue => ({ done: BEATS[step]!.done });

interface ProjectSetupDemoProps {
  framed?: boolean;

  playing?: boolean;
}

export function ProjectSetupDemo({ framed = true, playing }: ProjectSetupDemoProps) {
  const scene = useScene(BEATS, fromBeat, playing);
  const element = <ProjectSetup ref={scene.ref} value={scene.state} onValueChange={scene.onValueChange} />;
  return framed ? <Frame>{element}</Frame> : element;
}
