"use client";

import { extrude } from "@remold-ui/canvas";
import { Remold } from "@remold-ui/react";
import { useEffect } from "react";
import { PAPER } from "./day-stage";
import { useScene } from "./use-scene";

type SceneProps = Remold.Scene.Props;
type Step = 0 | 1 | 2 | 3;

const MILESTONES = ["Intake", "Visit", "Care plan", "Follow-up"] as const;
const OBJECTS: SceneProps["objects"] = {
  path: { look: extrude({ radius: 0.12, edge: true, ink: "rgba(47, 174, 132, .42)", shadow: false, passive: true, decal: { text: "" } }), interactive: false },
  ...Object.fromEntries(MILESTONES.map((label, index) => [
    `m${index}`,
    { look: extrude({ shape: "ellipse", sides: "sheen", edge: true, fillColor: "#5fd4a8", decal: { text: String(index + 1), size: 16, color: "#17352b" } }), label },
  ])),
  marker: { look: extrude({ shape: "ellipse", sides: "sheen", edge: true, fillColor: "#4fa865", decal: { text: "✓", size: 20, color: "#fff" } }), label: "Current care step" },
};

const slots = [{ x: -270, y: -100 }, { x: -80, y: -10 }, { x: 100, y: -70 }, { x: 270, y: 10 }];
function layoutFor(step: Step): SceneProps["layouts"][string] {
  const point = slots[step]!;
  return {
    camera: { zoom: 1.45, centerX: -10, centerY: -20 },
    caption: `${MILESTONES[step]} is the current step in this care journey.`,
    objects: {
      path: { x: -320, y: 80, z: 0, width: 650, depth: 110, height: 10, fill: (step + 1) / 4, color: "#5fd4a8" },
      ...Object.fromEntries(slots.map((slot, index) => [`m${index}`, { x: slot.x, y: slot.y, z: index <= step ? 24 : 10, width: 66, depth: 66, height: index <= step ? 14 : 7, fill: index <= step ? 1 : 0, color: index <= step ? "#5fd4a8" : "#dfe6f2" }])),
      marker: { x: point.x + 11, y: point.y + 11, z: 58, width: 44, depth: 44, height: 8, arc: 26 },
    },
  };
}

const STEPS: readonly Step[] = [0, 1, 2, 3];
const LAYOUTS: SceneProps["layouts"] = Object.fromEntries(STEPS.map((step) => [`${step}`, layoutFor(step)]));
const BEATS: readonly ({ step: Step; ms: number })[] = [{ step: 0, ms: 1200 }, { step: 1, ms: 1200 }, { step: 2, ms: 1300 }, { step: 3, ms: 2800 }];

export function CareJourney({ playing }: { playing?: boolean } = {}) {
  const scene = useScene(BEATS, (index) => ({ step: BEATS[index]!.step }), playing);
  const { state, take } = scene;
  useEffect(() => {
    if (scene.live || state.step === 3) return;
    const timer = setTimeout(() => take({ step: (state.step + 1) as Step }), BEATS[state.step]!.ms);
    return () => clearTimeout(timer);
  }, [scene.live, state.step, take]);
  return (
    <section ref={scene.ref} className="day-stage cj not-prose" aria-label="Care journey">
      <Remold.Scene className="day-scene" label="A calm care journey from intake to follow-up" objects={OBJECTS} layouts={LAYOUTS} layout={String(state.step)} palette={PAPER} interact={{ drag: false }} spring={{ duration: 0.82, bounce: 0.2 }} />
      <div className="day-chip cj-chip" role="status"><span className="bg-[#d8f3e7] text-[#23785a]">✚</span><span className="day-chip-copy"><span>Care journey</span><b>{MILESTONES[state.step]}</b></span></div>
      <div className="day-foot"><div className="flex min-w-0 gap-1 overflow-hidden">{MILESTONES.map((label, index) => <button key={label} type="button" className="h-7 whitespace-nowrap rounded-[7px] px-[7px] text-[11px] text-[#8a7f70] max-[420px]:px-[5px] max-[420px]:text-[10px] data-[current]:bg-[#dff5e6] data-[current]:font-semibold data-[current]:text-[#23785a]" data-current={index === state.step || undefined} onClick={() => take({ step: index as Step })}>{label}</button>)}</div><span className="day-readout"><b>{state.step + 1}</b> of 4</span></div>
    </section>
  );
}
