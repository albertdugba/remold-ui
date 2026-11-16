"use client";

import type { Diagram, DiagramOptions } from "@remold-ui/canvas";
import { LEAF, SKY } from "./day-stage";
import { DiagramStage, type Say } from "./diagram-stage";

const DOMAIN = "acme.com";

const options = (): DiagramOptions => ({
  label: `Domain connection: DNS for ${DOMAIN} propagates, an SSL certificate is issued, and secure traffic reaches the app.`,
  palette: SKY,
  camera: "flat",
  nodes: {
    visitor: { look: "browser", label: "Visitor", at: [-400, 40], size: [150, 110] },
    dns: { look: "region", label: `DNS · ${DOMAIN}`, at: [-110, -190], size: 110 },
    edge: { look: "server", label: "Edge network", at: [-80, 80], size: 130 },
    cert: { look: "vault", label: "SSL certificate", at: [-80, 330], size: 100, palette: LEAF, hidden: true },
    app: { look: "server", label: "Your app", at: [300, 80], size: 130 },
  },
  links: [
    ["visitor", "dns"],
    ["visitor", "edge"],
    ["edge", "app"],
    ["edge", "cert"],
  ],
  colors: { packet: "37, 99, 235", label: "#24324a", surface: "243, 247, 252" },
});

async function connect(diagram: Diagram, say: Say) {
  say(`You point ${DOMAIN} at us. Waiting for DNS`);
  diagram.status("dns", "pending");
  await diagram.countdown("dns", 3, { format: (seconds) => `Propagating ${seconds}s` });
  diagram.status("dns", "ok");

  say(`DNS now answers for ${DOMAIN}`);
  await diagram.send("visitor", "dns", { label: `${DOMAIN}?` });
  await diagram.send("dns", "visitor", { label: "76.76.21.21" });

  say("Issuing an SSL certificate");
  diagram.show("cert");
  diagram.status("cert", "pending");
  await diagram.send("edge", "cert", { label: "ACME challenge", duration: 1.1 });
  diagram.status("cert", "ok");
  diagram.relabel("cert", "SSL · valid to Feb 2027");

  say("Secure traffic reaches your app");
  diagram.link("visitor", "edge", "active");
  await diagram.send("visitor", "edge", { label: `https://${DOMAIN}` });
  diagram.status("edge", "ok");
  await diagram.send("edge", "app");
  diagram.status("app", "ok");
  diagram.link("edge", "app", "active");
  await diagram.wait(2.4);
}

export function DomainConnection() {
  return (
    <DiagramStage
      figure="0.3"
      title="Domain connection"
      tag="Domains"
      options={options}
      script={connect}
      first={`You point ${DOMAIN} at us. Waiting for DNS`}
    />
  );
}
