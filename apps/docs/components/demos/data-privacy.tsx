"use client";

import type { Diagram, DiagramOptions } from "@remold-ui/canvas";
import { STREET } from "./day-stage";
import { NIGHT } from "./night-stage";
import { DiagramStage, type Say } from "./diagram-stage";

const options = (): DiagramOptions => ({
  label: "Data privacy boundary: card numbers go to a vault, analytics gets a token, and support only ever sees the last four digits.",
  palette: STREET,
  camera: { yaw: 32, pitch: 56, zoom: 1.1, centerX: 40 },
  nodes: {
    form: { look: "file", label: "Checkout form", at: [-400, 0], size: [110, 140] },
    api: { look: "server", label: "API", at: [-130, 0], size: 120 },
    vault: { look: "vault", label: "Card vault", at: [170, -190], size: 130, palette: NIGHT },
    analytics: { look: "database", label: "Analytics", at: [170, 190], size: 120 },
    agent: { look: "person", label: "Support agent", at: [460, -190], size: 90 },
  },
  links: [
    ["form", "api"],
    ["api", "vault"],
    ["api", "analytics"],
    ["agent", "vault"],
  ],
  colors: { packet: "194, 65, 12", label: "#3a3128", surface: "248, 244, 238" },
});

async function protect(diagram: Diagram, say: Say) {
  say("A customer pays with their card");
  await diagram.send("form", "api", { label: "4242 4242 4242 4242" });

  say("The card goes into the vault. Analytics only gets a token");
  await Promise.all([
    diagram.send("api", "vault", { label: "4242 4242 4242 4242", duration: 1 }),
    diagram.send("api", "analytics", { label: "tok_8f2a", duration: 1 }),
  ]);
  diagram.status("vault", "ok");
  diagram.status("analytics", "ok");

  say("Support asks to see the full card number");
  await diagram.bounce("agent", "vault", { label: "read card", duration: 1.2 });
  diagram.status("agent", "error");
  diagram.link("agent", "vault", "error");
  say("Denied: support never sees full card numbers");
  await diagram.wait(1.6);

  say("They get the last four digits instead");
  diagram.status("agent", null);
  diagram.link("agent", "vault", null);
  await diagram.send("vault", "agent", { label: "•••• 4242" });
  diagram.status("agent", "ok");
  await diagram.wait(2.4);
}

export function DataPrivacyBoundary() {
  return (
    <DiagramStage
      figure="0.4"
      title="Data privacy boundary"
      tag="Privacy"
      options={options}
      script={protect}
      first="A customer pays with their card"
    />
  );
}
