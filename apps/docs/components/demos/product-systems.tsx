"use client";

import { extrude } from "@remold-ui/canvas";
import { Remold } from "@remold-ui/react/canvas";
import { useEffect, useState } from "react";
import { NIGHT } from "./night-stage";
import { PAPER } from "./day-stage";
import { useScene } from "./use-scene";

type SceneProps = Remold.Scene.Props;
type Kind = "domain" | "privacy" | "upgrade" | "uptime" | "collaboration" | "workspace";

const SYSTEMS: Record<Kind, { title: string; phases: [string, string, string]; action: string }> = {
  domain: {
    title: "Domain connection",
    phases: ["DNS records discovered", "SSL certificate issued", "Your domain is live"],
    action: "Check domain",
  },
  privacy: {
    title: "Data privacy boundary",
    phases: ["Sensitive fields detected", "Data sealed in vault", "Only approved access remains"],
    action: "Review access",
  },
  upgrade: {
    title: "Subscription upgrade",
    phases: ["Compare plans", "Proration calculated", "New capacity is active"],
    action: "Preview upgrade",
  },
  uptime: {
    title: "Uptime routing",
    phases: ["Traffic is flowing", "Primary is degraded", "Traffic rerouted cleanly"],
    action: "Inspect route",
  },
  collaboration: {
    title: "Realtime collaboration",
    phases: ["A shared draft opens", "Edits arrive together", "One version stays in sync"],
    action: "Open draft",
  },
  workspace: {
    title: "Team workspace",
    phases: ["A new space starts with you", "Work gets a shared home", "The team joins with context"],
    action: "Invite team",
  },
};

function useDarkMode() {
  const [dark, setDark] = useState(false);
  useEffect(() => {
    const root = document.documentElement;
    const update = () => setDark(root.classList.contains("dark"));
    update();
    const observer = new MutationObserver(update);
    observer.observe(root, { attributes: true, attributeFilter: ["class"] });
    return () => observer.disconnect();
  }, []);
  return dark;
}

function look(mark: string, dark: boolean, emphasis = false) {
  const ink = dark ? "rgba(160, 142, 255, .62)" : "rgba(52, 116, 98, .42)";
  const fill = dark ? "#7c5cff" : "#5fd4a8";
  const text = dark ? "#f0eeff" : "#17352b";
  return extrude({
    radius: emphasis ? 0.24 : 0.14,
    edge: true,
    ink,
    shadow: false,
    fillColor: fill,
    decal: { text: mark, size: emphasis ? 28 : 18, color: text },
  });
}

function makeObjects(kind: Kind, dark: boolean): SceneProps["objects"] {
  const labels: Record<Kind, [string, string][]> = {
    domain: [
      ["root", "Root record"],
      ["www", "WWW alias"],
      ["api", "API route"],
      ["⌁", "DNS resolver"],
      ["✓", "Secure site"],
    ],
    privacy: [
      ["ID", "Customer data"],
      ["▣", "Encrypted vault"],
      ["↗", "Approved analyst"],
      ["↗", "Approved application"],
      ["×", "Blocked request"],
    ],
    upgrade: [
      ["S", "Starter plan"],
      ["P", "Pro plan"],
      ["B", "Business plan"],
      ["£", "Prorated credit"],
    ],
    uptime: [
      ["◎", "Traffic monitor"],
      ["A", "Primary region"],
      ["B", "Standby region"],
      ["C", "Edge cache"],
      ["→", "Visitor requests"],
    ],
    collaboration: [
      ["A", "Ama"],
      ["K", "Kofi"],
      ["E", "Esi"],
      ["✎", "Shared draft"],
      ["•", "Live cursor"],
    ],
    workspace: [
      ["↗", "You"],
      ["□", "Project brief"],
      ["▤", "Design files"],
      ["✓", "Launch checklist"],
      ["+", "Invite teammate"],
    ],
  };
  return Object.fromEntries(
    labels[kind].map(([mark, label], index) => [
      `o${index}`,
      { look: look(mark, dark, index === 1 || (kind === "collaboration" && index === 3)), label },
    ]),
  ) as SceneProps["objects"];
}

type Point = { x: number; y: number; width?: number; depth?: number };
const TOPOLOGY: Record<Kind, Point[]> = {
  domain: [
    { x: -215, y: 85 },
    { x: -42, y: -130 },
    { x: 170, y: 40 },
    { x: -16, y: 72, width: 135, depth: 135 },
    { x: 174, y: -118 },
  ],
  privacy: [
    { x: -210, y: 68 },
    { x: -22, y: 10, width: 170, depth: 170 },
    { x: 198, y: -118 },
    { x: 198, y: 118 },
    { x: -35, y: -170 },
  ],
  upgrade: [
    { x: -195, y: 104 },
    { x: 0, y: 0, width: 160, depth: 140 },
    { x: 200, y: -104 },
    { x: 0, y: 172, width: 72, depth: 72 },
  ],
  uptime: [
    { x: -192, y: -116 },
    { x: 20, y: -82, width: 135, depth: 135 },
    { x: 186, y: -136 },
    { x: 170, y: 110 },
    { x: -194, y: 123 },
  ],
  collaboration: [
    { x: -200, y: -98 },
    { x: 205, y: -90 },
    { x: -18, y: 158 },
    { x: 0, y: 18, width: 190, depth: 135 },
    { x: 4, y: -26, width: 46, depth: 46 },
  ],
  workspace: [
    { x: -212, y: -116 },
    { x: -20, y: -104 },
    { x: -212, y: 98 },
    { x: -20, y: 104 },
    { x: 192, y: 12 },
  ],
};

function layouts(kind: Kind, dark: boolean): SceneProps["layouts"] {
  const fill = dark ? "#7c5cff" : "#5fd4a8";
  const topology = TOPOLOGY[kind];
  return Object.fromEntries(
    [0, 1, 2].map((phase) => [
      String(phase),
      {
        camera: { zoom: kind === "workspace" ? 1.28 : 1.36, centerX: 0, centerY: 0 },
        objects: {
          ...Object.fromEntries(
            topology.map((point, index) => [
              `o${index}`,
              {
                x: point.x,
                y: point.y,
                z: index <= phase + 1 ? 28 : 6,
                width: point.width ?? (index === 1 ? 116 : 82),
                depth: point.depth ?? (index === 1 ? 116 : 82),
                height: index <= phase + 1 ? 22 : 8,
                fill: index <= phase + 1 ? 1 : 0,
                color: fill,
                ghost: index <= phase + 1 ? 0 : 0.72,
                arc: phase && index === phase + 1 ? 45 : 0,
              },
            ]),
          ),
        },
      },
    ]),
  );
}

const BEATS = [
  { phase: 0, ms: 1400 },
  { phase: 1, ms: 1400 },
  { phase: 2, ms: 2800 },
] as const;

const KIND_BACKDROP: Record<Kind, string> = {
  domain: "bg-[#f4efe6] bg-[radial-gradient(65%_60%_at_50%_44%,#f2fbf5,transparent_70%)]",
  privacy: "bg-[#f2ede3] bg-[radial-gradient(54%_58%_at_50%_48%,#f9f4ea,transparent_72%)]",
  upgrade: "bg-[#f5efe4] bg-[radial-gradient(65%_60%_at_50%_55%,#fff6df,transparent_70%)]",
  uptime: "bg-[#f2ede3] bg-[radial-gradient(62%_58%_at_54%_50%,#edf9f3,transparent_70%)]",
  collaboration: "bg-[#f5f0e7] bg-[radial-gradient(60%_55%_at_50%_52%,#f2f8f5,transparent_70%)]",
  workspace: "bg-[#f3eee5] bg-[radial-gradient(66%_62%_at_48%_48%,#f5fbf7,transparent_70%)]",
};

export function ProductSystemIllustration({ kind, playing }: { kind: Kind; playing?: boolean }) {
  const dark = useDarkMode();
  const system = SYSTEMS[kind];
  const scene = useScene(BEATS, (step) => ({ phase: BEATS[step]!.phase }), playing);
  const { state, takeOver } = scene;
  const objects = makeObjects(kind, dark);
  const sceneLayouts = layouts(kind, dark);
  const links = Object.keys(objects)
    .slice(1)
    .map((to, index) => ({ from: "o0", to, flow: true, layouts: index < 2 ? ["1", "2"] : ["2"] }));

  useEffect(() => {
    if (scene.live || state.phase === 2) return;
    const timer = setTimeout(() => takeOver({ phase: (state.phase + 1) as 1 | 2 }), BEATS[state.phase]!.ms);
    return () => clearTimeout(timer);
  }, [scene.live, state.phase, takeOver]);

  return (
    <section
      ref={scene.ref}
      className={`not-prose relative grid min-h-[520px] w-full overflow-hidden font-sans text-[#2b2620] data-dark:bg-[#101015] data-dark:bg-[radial-gradient(60%_50%_at_50%_55%,rgb(124_92_255/0.14),transparent_70%)] data-dark:text-[#ecebf5] before:pointer-events-none before:absolute before:inset-0 before:bg-[radial-gradient(rgb(90_80_65/0.12)_1px,transparent_1.4px)] before:bg-size-[22px_22px] before:[mask-image:radial-gradient(70%_60%_at_50%_50%,#000,transparent)] before:content-[''] data-dark:before:bg-[linear-gradient(rgb(255_255_255/0.035)_1px,transparent_1px),linear-gradient(90deg,rgb(255_255_255/0.035)_1px,transparent_1px)] data-dark:before:bg-size-[32px_32px] ${KIND_BACKDROP[kind]}`}
      data-dark={dark || undefined}
      aria-label={system.title}
    >
      <Remold.Scene
        className="relative block h-[460px] w-full"
        label={system.title}
        objects={objects}
        links={links}
        layouts={sceneLayouts}
        layout={String(state.phase)}
        palette={dark ? NIGHT : PAPER}
        interact={{ drag: false }}
        spring={{ duration: 0.82, bounce: 0.2 }}
      />
      <div className="absolute top-5 left-1/2 inline-flex max-w-[calc(100%-32px)] -translate-x-1/2 items-center gap-2 rounded-xl bg-white/86 px-3 py-[9px] text-[12.5px] shadow-[0_8px_20px_-12px_rgb(50_35_15/0.35)] in-data-dark:bg-[rgb(26_24_36/0.86)] in-data-dark:text-[#ecebf5] in-data-dark:shadow-[inset_0_0_0_1px_rgb(255_255_255/0.08)]">
        <span className="size-[7px] rounded-full bg-[#39a97d] shadow-[0_0_0_3px_rgb(57_169_125/0.16)]" />
        <span>{system.phases[state.phase]}</span>
      </div>
      <div className="absolute right-[18px] bottom-4 left-[18px] flex items-center justify-between gap-3 text-[12px] text-[#8a7f70] in-data-dark:text-[#8f8ca3]">
        <span>{system.title}</span>
        <button
          type="button"
          className="h-8 cursor-pointer rounded-[9px] border-0 bg-[#2b2620] px-3.5 text-[12px] font-semibold text-[#fffaf1] in-data-dark:bg-[rgb(124_92_255/0.16)] in-data-dark:text-[#e6e0ff] in-data-dark:shadow-[inset_0_0_0_1px_rgb(124_92_255/0.5)]"
          onClick={() => takeOver({ phase: 0 })}>
          {state.phase === 2 ? "Replay" : system.action}
        </button>
      </div>
    </section>
  );
}

export const DomainConnection = (props: { playing?: boolean }) => (
  <ProductSystemIllustration kind="domain" {...props} />
);
export const DataPrivacyBoundary = (props: { playing?: boolean }) => (
  <ProductSystemIllustration kind="privacy" {...props} />
);
export const SubscriptionUpgrade = (props: { playing?: boolean }) => (
  <ProductSystemIllustration kind="upgrade" {...props} />
);
export const UptimeRouting = (props: { playing?: boolean }) => (
  <ProductSystemIllustration kind="uptime" {...props} />
);
export const RealtimeCollaboration = (props: { playing?: boolean }) => (
  <ProductSystemIllustration kind="collaboration" {...props} />
);
export const TeamWorkspace = (props: { playing?: boolean }) => (
  <ProductSystemIllustration kind="workspace" {...props} />
);
