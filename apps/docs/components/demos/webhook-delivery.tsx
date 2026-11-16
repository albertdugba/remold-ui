"use client";

import type { Diagram, DiagramOptions } from "@remold-ui/canvas";
import { PAPER } from "./day-stage";
import { DiagramStage, type Say } from "./diagram-stage";

const EVENT = "invoice.paid";
const RETRIES = [2, 4];

const options = (): DiagramOptions => ({
  label: "Webhook delivery: an event is queued, fails twice, is retried with backoff and delivered.",
  palette: PAPER,
  camera: { zoom: 1.15, centerY: 10 },
  nodes: {
    app: { look: "browser", label: "Your app", at: [-330, 0], size: [150, 110] },
    queue: { look: "queue", label: "Delivery queue", at: [0, 0], size: [170, 90] },
    endpoint: { look: "server", label: "customer.com/webhooks", at: [330, 0], size: [120, 120] },
  },
  links: [
    { from: "app", to: "queue", route: "straight" },
    { from: "queue", to: "endpoint", route: "straight" },
  ],
  colors: { packet: "124, 92, 255", label: "#3a3128", surface: "251, 248, 242" },
});

async function deliver(diagram: Diagram, say: Say) {
  say(`Your app sends ${EVENT}`);
  await diagram.send("app", "queue", { label: EVENT });
  diagram.status("queue", "pending");

  for (const [attempt, delay] of RETRIES.entries()) {
    say(`Attempt ${attempt + 1}: delivering to customer.com`);
    await diagram.bounce("queue", "endpoint", { label: EVENT, duration: 1.2 });
    diagram.status("endpoint", "error");
    diagram.link("queue", "endpoint", "error");
    say(`Attempt ${attempt + 1} failed with a 503. Retrying in ${delay}s`);
    await diagram.countdown("queue", delay, { format: (seconds) => `Retry in ${seconds}s` });
    diagram.status("endpoint", null);
    diagram.link("queue", "endpoint", null);
  }

  say(`Attempt ${RETRIES.length + 1}: delivering to customer.com`);
  await diagram.send("queue", "endpoint", { label: EVENT });
  diagram.status("endpoint", "ok");
  diagram.status("queue", "ok");
  diagram.link("queue", "endpoint", "active");
  say("Delivered on attempt 3. 200 OK");
  await diagram.wait(2.4);
}

export function WebhookDelivery() {
  return <DiagramStage figure="0.1" title="Webhook delivery" tag="Webhooks" options={options} script={deliver} first={`Your app sends ${EVENT}`} />;
}
