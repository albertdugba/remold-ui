"use client";

import type { Diagram, DiagramOptions } from "@remold-ui/canvas";
import { NIGHT } from "./night-stage";
import { DiagramStage, type Say } from "./diagram-stage";

const options = (): DiagramOptions => ({
  label: "Realtime collaboration: two people edit one document at once, the edits merge, and a laptop that drops offline catches up.",
  palette: NIGHT,
  camera: { yaw: 45, pitch: 60, zoom: 1.15, centerX: -10 },
  nodes: {
    ama: { look: "phone", label: "Ama · phone", at: [-340, -170], size: [80, 130] },
    kofi: { look: "browser", label: "Kofi · laptop", at: [-340, 180], size: [150, 110] },
    sync: { look: "server", label: "Sync server", at: [0, 0], size: 120 },
    doc: { look: "file", label: "Q3 plan", at: [320, 0], size: [110, 140] },
  },
  links: [
    ["ama", "sync"],
    ["kofi", "sync"],
    ["sync", "doc"],
  ],
  colors: { packet: "236, 72, 153", label: "#ecebf5", surface: "26, 24, 36" },
});

async function collaborate(diagram: Diagram, say: Say) {
  say("Ama and Kofi edit the same doc at the same moment");
  await Promise.all([
    diagram.send("ama", "sync", { label: "+ Q3 goals" }),
    diagram.send("kofi", "sync", { label: "fix typo", duration: 1.1 }),
  ]);

  say("Both edits merge into one version");
  diagram.status("sync", "pending");
  await diagram.wait(0.6);
  await diagram.send("sync", "doc", { label: "v42" });
  diagram.status("sync", "ok");
  diagram.status("doc", "ok");

  say("Everyone sees version 42");
  await Promise.all([diagram.send("sync", "ama", { label: "v42" }), diagram.send("sync", "kofi", { label: "v42" })]);

  say("Kofi's laptop drops offline, and Ama keeps writing");
  diagram.status("kofi", "error");
  diagram.link("kofi", "sync", "error");
  await diagram.send("ama", "sync", { label: "+ budget" });
  await diagram.send("sync", "doc", { label: "v43" });

  say("Back online, Kofi catches up on what was missed");
  await diagram.countdown("kofi", 2, { format: () => "Reconnecting…" });
  diagram.link("kofi", "sync", null);
  diagram.status("kofi", "pending");
  await diagram.send("sync", "kofi", { label: "v43" });
  diagram.status("kofi", "ok");
  await diagram.wait(2.4);
}

export function RealtimeCollaboration() {
  return (
    <DiagramStage
      figure="0.6"
      title="Realtime collaboration"
      tag="Multiplayer"
      options={options}
      script={collaborate}
      first="Ama and Kofi edit the same doc at the same moment"
    />
  );
}
