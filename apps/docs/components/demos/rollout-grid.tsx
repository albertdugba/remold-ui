"use client";

import type { Diagram, DiagramNode, DiagramOptions } from "@remold-ui/canvas";
import { PAPER } from "./day-stage";
import { DiagramStage, type Say } from "./diagram-stage";

const FLAG = "new-checkout";
const COLUMNS = 12;
const ROWS = 8;
const TILE = 44;
const PITCH = 56;
const GRID_CENTRE = [90, 0] as const;
const STAGES = [1, 10, 50, 100] as const;
const FAILING = 2;
const BATCH = 6;
const SEED = 7;

const tileId = (index: number) => `tile${index}`;
const TILES = Array.from({ length: COLUMNS * ROWS }, (_, index) => tileId(index));

function shuffled<T>(items: readonly T[], seed: number): T[] {
  let state = seed;
  const random = () => {
    state = (state * 16807) % 2147483647;

    return state / 2147483647;
  };

  return items
    .map((item) => ({ item, key: random() }))
    .sort((a, b) => a.key - b.key)
    .map(({ item }) => item);
}

const ORDER = shuffled(TILES, SEED);
const share = (percent: number) => Math.max(1, Math.round((ORDER.length * percent) / 100));

const tilePosition = (index: number): readonly [number, number] => [
  GRID_CENTRE[0] + ((index % COLUMNS) - (COLUMNS - 1) / 2) * PITCH,
  GRID_CENTRE[1] + (Math.floor(index / COLUMNS) - (ROWS - 1) / 2) * PITCH,
];

const tiles = (): Record<string, DiagramNode> =>
  Object.fromEntries(TILES.map((id, index) => [id, { look: "chip", at: tilePosition(index), size: TILE, height: 6 }]));

const options = (): DiagramOptions => ({
  label: `Rollout grid: the ${FLAG} flag reaches 1%, 10%, 50% and then all users, pausing when two cohorts show errors.`,
  palette: PAPER,
  camera: { zoom: 1.08, yaw: 40, pitch: 58, centerX: -30, centerY: 20 },
  nodes: {
    flag: { look: "queue", label: `${FLAG} · 0%`, at: [-520, 0], size: [130, 80] },
    ...tiles(),
  },
  colors: { packet: "202, 138, 4", label: "#27272a", surface: "255, 255, 255" },
});

async function reach(diagram: Diagram, from: number, to: number) {
  for (let start = from; start < to; start += BATCH) {
    diagram.light(ORDER.slice(start, Math.min(start + BATCH, to)), "on");
    await diagram.wait(0.05);
  }
}

async function rollout(diagram: Diagram, say: Say) {
  let reached = 0;

  for (const percent of STAGES) {
    const target = share(percent);

    say(`Rolling ${FLAG} out to ${percent}% of users`);
    diagram.relabel("flag", `${FLAG} · ${percent}%`);
    await reach(diagram, reached, target);
    reached = target;
    await diagram.wait(1.2);

    if (percent !== 10) continue;

    const failing = ORDER.slice(0, target).slice(-FAILING);

    say(`Errors on ${FAILING} cohorts. The rollout pauses itself`);
    diagram.light(failing, "error");
    diagram.status("flag", "error");
    await diagram.wait(1.6);

    say("A fix ships, errors clear, and the rollout carries on");
    await diagram.countdown("flag", 2, { format: () => "Fixing…" });
    diagram.light(failing, "on");
    diagram.status("flag", null);
    await diagram.wait(0.6);
  }

  diagram.status("flag", "ok");
  say(`${FLAG} is live for everyone`);
  await diagram.wait(2.4);
}

export function RolloutGrid() {
  return (
    <DiagramStage
      figure="0.9"
      title="Rollout grid"
      tag="Feature flags"
      options={options}
      script={rollout}
      first={`Rolling ${FLAG} out to 1% of users`}
    />
  );
}
