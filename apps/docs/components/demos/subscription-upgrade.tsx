"use client";

import type { Diagram, DiagramNode, DiagramOptions } from "@remold-ui/canvas";
import { PAPER, SUN } from "./day-stage";
import { DiagramStage, type Say } from "./diagram-stage";

const SEATS: readonly (readonly [number, number])[] = [
  [470, -60],
  [500, 70],
  [470, 200],
  [380, 290],
  [250, 320],
];

const seatId = (index: number) => `seat${index}`;

const seats = (): Record<string, DiagramNode> =>
  Object.fromEntries(SEATS.map((at, index) => [seatId(index), { look: "person", at, size: 56, palette: SUN, hidden: true }]));

const options = (): DiagramOptions => ({
  label: "Subscription upgrade: moving from Pro to Team is prorated, invoiced, and the plan grows to twenty seats.",
  palette: PAPER,
  camera: { yaw: 52, pitch: 60, zoom: 1.1, centerX: 40, centerY: 40 },
  nodes: {
    page: { look: "browser", label: "Billing page", at: [-400, 0], size: [150, 110] },
    billing: { look: "server", label: "Billing API", at: [-120, 0], size: 120 },
    invoice: { look: "file", label: "Invoice", at: [150, -210], size: [100, 130] },
    plan: { look: "plate", label: "Pro · 5 seats", at: [230, 90], size: [200, 140], palette: SUN, height: 22 },
    ...seats(),
  },
  links: [["page", "billing"], ["billing", "invoice"], ["billing", "plan"], ...SEATS.map((_, index) => ["plan", seatId(index)] as const)],
  colors: { packet: "21, 128, 61", label: "#3a2a00", surface: "253, 249, 238" },
});

async function upgrade(diagram: Diagram, say: Say) {
  say("You're on Pro, with 5 seats");
  await diagram.wait(1.2);

  say("You choose Team");
  await diagram.send("page", "billing", { label: "Upgrade to Team" });

  say("Billing works out what's left of this month");
  diagram.status("billing", "pending");
  await diagram.countdown("billing", 2, { format: () => "Prorating…" });
  diagram.status("billing", "ok");
  await diagram.send("billing", "invoice", { label: "+$48.20 today" });
  diagram.status("invoice", "ok");

  say("Your plan becomes Team, with 20 seats");
  await diagram.send("billing", "plan", { label: "Team" });
  diagram.relabel("plan", "Team · 20 seats");
  diagram.status("plan", "ok");

  for (const index of SEATS.keys()) {
    diagram.show(seatId(index));
    await diagram.wait(0.16);
  }

  await diagram.wait(2.4);
}

export function SubscriptionUpgrade() {
  return (
    <DiagramStage
      figure="0.5"
      title="Subscription upgrade"
      tag="Billing"
      options={options}
      script={upgrade}
      first="You're on Pro, with 5 seats"
    />
  );
}
