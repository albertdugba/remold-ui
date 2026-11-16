"use client";

import type { Diagram, DiagramNode, DiagramOptions } from "@remold-ui/canvas";
import { MINT, PAPER } from "./day-stage";
import { DiagramStage, type Say } from "./diagram-stage";

const MEMBERS = [
  { id: "efua", name: "Efua", at: [300, -230] },
  { id: "kwame", name: "Kwame", at: [390, 0] },
  { id: "lena", name: "Lena", at: [300, 230] },
] as const;

const members = (): Record<string, DiagramNode> =>
  Object.fromEntries(MEMBERS.map((member) => [member.id, { look: "person", label: member.name, at: member.at, size: 84, hidden: true }]));

const options = (): DiagramOptions => ({
  label: "Team workspace: you create a workspace, invite three teammates who join one by one, and a shared plan reaches all of them.",
  palette: PAPER,
  camera: { yaw: 28, pitch: 52, zoom: 1.1, centerX: 20 },
  nodes: {
    you: { look: "person", label: "You", at: [-380, 0], size: 90, palette: MINT },
    workspace: { look: "plate", label: "Remold workspace", at: [0, 0], size: 190, palette: MINT, height: 20, hidden: true },
    plan: { look: "file", label: "Launch plan", at: [-120, -260], size: [100, 130], hidden: true },
    ...members(),
  },
  links: [["you", "workspace"], ["workspace", "plan"], ...MEMBERS.map((member) => ["workspace", member.id] as const)],
  colors: { packet: "13, 148, 136", label: "#163a2e", surface: "244, 250, 246" },
});

async function invite(diagram: Diagram, member: (typeof MEMBERS)[number]) {
  diagram.show(member.id);
  diagram.status(member.id, "pending");
  await diagram.send("workspace", member.id, { label: "invite" });
}

async function gather(diagram: Diagram, say: Say) {
  say("You create a workspace");
  diagram.show("workspace");
  await diagram.wait(0.6);
  diagram.status("workspace", "ok");

  say("and invite three teammates");
  await diagram.send("you", "workspace", { label: "invite ×3" });
  await Promise.all(MEMBERS.map((member, index) => diagram.wait(index * 0.25).then(() => invite(diagram, member))));

  say("They accept, one by one");

  for (const member of MEMBERS) {
    await diagram.send(member.id, "workspace", { label: "joined", duration: 0.7 });
    diagram.status(member.id, "ok");
  }

  say("Anything you share reaches the whole team");
  diagram.show("plan");
  await diagram.send("workspace", "plan", { label: "share" });
  await Promise.all(MEMBERS.map((member) => diagram.send("workspace", member.id, { label: "Launch plan" })));
  await diagram.wait(2.4);
}

export function TeamWorkspace() {
  return (
    <DiagramStage
      figure="0.7"
      title="Team workspace"
      tag="Teams"
      options={options}
      script={gather}
      first="You create a workspace"
    />
  );
}
