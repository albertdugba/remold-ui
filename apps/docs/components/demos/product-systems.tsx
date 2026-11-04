"use client";

import { extrude } from "@remold-ui/canvas";
import { Remold } from "@remold-ui/react";
import { useEffect, useState } from "react";
import { NIGHT } from "./night-stage";
import { PAPER } from "./day-stage";
import { useScene } from "./use-scene";
import "./product-systems.css";

type SceneProps = Remold.Scene.Props;
type Kind = "domain" | "privacy" | "upgrade" | "uptime" | "collaboration" | "workspace";

const SYSTEMS: Record<Kind, { title: string; phases: [string, string, string]; action: string }> = {
  domain: { title: "Domain connection", phases: ["DNS records discovered", "SSL certificate issued", "Your domain is live"], action: "Check domain" },
  privacy: { title: "Data privacy boundary", phases: ["Sensitive fields detected", "Data sealed in vault", "Only approved access remains"], action: "Review access" },
  upgrade: { title: "Subscription upgrade", phases: ["Compare plans", "Proration calculated", "New capacity is active"], action: "Preview upgrade" },
  uptime: { title: "Uptime routing", phases: ["Traffic is flowing", "Primary is degraded", "Traffic rerouted cleanly"], action: "Inspect route" },
  collaboration: { title: "Realtime collaboration", phases: ["A shared draft opens", "Edits arrive together", "One version stays in sync"], action: "Open draft" },
  workspace: { title: "Team workspace", phases: ["A new space starts with you", "Work gets a shared home", "The team joins with context"], action: "Invite team" },
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
  return extrude({ radius: emphasis ? 0.24 : 0.14, edge: true, ink, shadow: false, fillColor: fill, decal: { text: mark, size: emphasis ? 28 : 18, color: text } });
}

function makeObjects(kind: Kind, dark: boolean): SceneProps["objects"] {
  const labels: Record<Kind, [string, string][]> = {
    domain: [["root", "Root record"], ["www", "WWW alias"], ["api", "API route"], ["⌁", "DNS resolver"], ["✓", "Secure site"]],
    privacy: [["ID", "Customer data"], ["▣", "Encrypted vault"], ["↗", "Approved analyst"], ["↗", "Approved application"], ["×", "Blocked request"]],
    upgrade: [["S", "Starter plan"], ["P", "Pro plan"], ["B", "Business plan"], ["$", "Prorated credit"]],
    uptime: [["◎", "Traffic monitor"], ["A", "Primary region"], ["B", "Standby region"], ["C", "Edge cache"], ["→", "Visitor requests"]],
    collaboration: [["A", "Ama"], ["K", "Kofi"], ["E", "Esi"], ["✎", "Shared draft"], ["•", "Live cursor"]],
    workspace: [["↗", "You"], ["□", "Project brief"], ["▤", "Design files"], ["✓", "Launch checklist"], ["+", "Invite teammate"]],
  };
  return Object.fromEntries(labels[kind].map(([mark, label], index) => [`o${index}`, { look: look(mark, dark, index === 1 || (kind === "collaboration" && index === 3)), label }])) as SceneProps["objects"];
}

type Point = { x: number; y: number; width?: number; depth?: number };
const TOPOLOGY: Record<Kind, Point[]> = {
  domain: [{ x: -215, y: 85 }, { x: -42, y: -130 }, { x: 170, y: 40 }, { x: -16, y: 72, width: 135, depth: 135 }, { x: 174, y: -118 }],
  privacy: [{ x: -210, y: 68 }, { x: -22, y: 10, width: 170, depth: 170 }, { x: 198, y: -118 }, { x: 198, y: 118 }, { x: -35, y: -170 }],
  upgrade: [{ x: -195, y: 104 }, { x: 0, y: 0, width: 160, depth: 140 }, { x: 200, y: -104 }, { x: 0, y: 172, width: 72, depth: 72 }],
  uptime: [{ x: -192, y: -116 }, { x: 20, y: -82, width: 135, depth: 135 }, { x: 186, y: -136 }, { x: 170, y: 110 }, { x: -194, y: 123 }],
  collaboration: [{ x: -200, y: -98 }, { x: 205, y: -90 }, { x: -18, y: 158 }, { x: 0, y: 18, width: 190, depth: 135 }, { x: 4, y: -26, width: 46, depth: 46 }],
  workspace: [{ x: -212, y: -116 }, { x: -20, y: -104 }, { x: -212, y: 98 }, { x: -20, y: 104 }, { x: 192, y: 12 }],
};

function layouts(kind: Kind, dark: boolean): SceneProps["layouts"] {
  const fill = dark ? "#7c5cff" : "#5fd4a8";
  const topology = TOPOLOGY[kind];
  return Object.fromEntries([0, 1, 2].map((phase) => [
    String(phase),
    {
      camera: { zoom: kind === "workspace" ? 1.28 : 1.36, centerX: 0, centerY: 0 },
      objects: {
        ...Object.fromEntries(topology.map((point, index) => [
          `o${index}`,
          { x: point.x, y: point.y, z: index <= phase + 1 ? 28 : 6, width: point.width ?? (index === 1 ? 116 : 82), depth: point.depth ?? (index === 1 ? 116 : 82), height: index <= phase + 1 ? 22 : 8, fill: index <= phase + 1 ? 1 : 0, color: fill, ghost: index <= phase + 1 ? 0 : 0.72, arc: phase && index === phase + 1 ? 45 : 0 },
        ])),
      },
    },
  ]));
}

const BEATS = [{ phase: 0, ms: 1400 }, { phase: 1, ms: 1400 }, { phase: 2, ms: 2800 }] as const;

export function ProductSystemIllustration({ kind, playing }: { kind: Kind; playing?: boolean }) {
  const dark = useDarkMode();
  const system = SYSTEMS[kind];
  const scene = useScene(BEATS, (step) => ({ phase: BEATS[step]!.phase }), playing);
  const { state, take } = scene;
  const objects = makeObjects(kind, dark);
  const sceneLayouts = layouts(kind, dark);
  const links = Object.keys(objects).slice(1).map((to, index) => ({ from: "o0", to, flow: true, layouts: index < 2 ? ["1", "2"] : ["2"] }));

  useEffect(() => {
    if (scene.live || state.phase === 2) return;
    const timer = setTimeout(() => take({ phase: (state.phase + 1) as 1 | 2 }), BEATS[state.phase]!.ms);
    return () => clearTimeout(timer);
  }, [scene.live, state.phase, take]);

  return (
    <section ref={scene.ref} className={`psi psi-${kind} not-prose`} data-dark={dark || undefined} aria-label={system.title}>
      <Remold.Scene className="psi-scene" label={system.title} objects={objects} links={links} layouts={sceneLayouts} layout={String(state.phase)} palette={dark ? NIGHT : PAPER} interact={{ drag: false }} spring={{ duration: 0.82, bounce: 0.2 }} />
      <div className="psi-status"><span className="psi-dot" /><span>{system.phases[state.phase]}</span></div>
      <div className="psi-foot"><span>{system.title}</span><button type="button" onClick={() => take({ phase: 0 })}>{state.phase === 2 ? "Replay" : system.action}</button></div>
    </section>
  );
}

export const DomainConnection = (props: { playing?: boolean }) => <ProductSystemIllustration kind="domain" {...props} />;
export const DataPrivacyBoundary = (props: { playing?: boolean }) => <ProductSystemIllustration kind="privacy" {...props} />;
export const SubscriptionUpgrade = (props: { playing?: boolean }) => <ProductSystemIllustration kind="upgrade" {...props} />;
export const UptimeRouting = (props: { playing?: boolean }) => <ProductSystemIllustration kind="uptime" {...props} />;
export const RealtimeCollaboration = (props: { playing?: boolean }) => <ProductSystemIllustration kind="collaboration" {...props} />;
export const TeamWorkspace = (props: { playing?: boolean }) => <ProductSystemIllustration kind="workspace" {...props} />;
