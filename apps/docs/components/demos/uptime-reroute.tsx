"use client";

import type { Diagram, DiagramOptions } from "@remold-ui/canvas";
import { NIGHT } from "./night-stage";
import { DiagramStage, type Say } from "./diagram-stage";

const REGIONS = ["iad", "fra", "sin"] as const;
type Region = (typeof REGIONS)[number];

const REGION_NAMES: Record<Region, string> = { iad: "us-east · iad", fra: "eu-central · fra", sin: "ap-southeast · sin" };

const REQUEST_GAP = 0.32;

const options = (): DiagramOptions => ({
  label: "Uptime routing: traffic flows to three regions, one fails, traffic reroutes, and the region comes back.",
  palette: NIGHT,
  camera: { zoom: 1.2, yaw: 38, pitch: 58, centerX: 20 },
  nodes: {
    floor: { look: "grid", at: [0, 0], size: [1080, 800] },
    visitors: { look: "person", label: "Visitors", at: [-360, 0], size: 90 },
    balancer: { look: "queue", label: "Load balancer", at: [-110, 0], size: [130, 90] },
    iad: { look: "region", label: REGION_NAMES.iad, at: [300, -280], size: 110 },
    fra: { look: "region", label: REGION_NAMES.fra, at: [360, 0], size: 110 },
    sin: { look: "region", label: REGION_NAMES.sin, at: [300, 280], size: 110 },
  },
  links: [["visitors", "balancer"], ...REGIONS.map((region) => ["balancer", region] as const)],
  colors: {
    packet: "99, 102, 241",
    label: "#ecebf5",
    surface: "26, 24, 36",
    packetText: "#ffffff",
  },
});

function request(diagram: Diagram, region: Region) {
  return diagram.send("visitors", "balancer", { duration: 0.5 }).then(() => diagram.send("balancer", region, { duration: 0.6 }));
}

async function traffic(diagram: Diagram, regions: readonly Region[], count: number) {
  const trips: Promise<void>[] = [];

  for (let index = 0; index < count; index++) {
    const trip = request(diagram, regions[index % regions.length]!);

    trip.catch(() => undefined);
    trips.push(trip);
    await diagram.wait(REQUEST_GAP);
  }

  await Promise.all(trips);
}

const markHealthy = (diagram: Diagram, regions: readonly Region[]) => {
  for (const region of regions) diagram.status(region, "ok");
};

async function reroute(diagram: Diagram, say: Say) {
  say("Traffic is spread across three regions");
  markHealthy(diagram, REGIONS);
  await traffic(diagram, REGIONS, 9);

  say("us-east stopped answering health checks");
  diagram.status("iad", "error");
  diagram.link("balancer", "iad", "error");
  await diagram.wait(1);

  say("Its traffic moves to the two healthy regions");
  await traffic(diagram, ["fra", "sin"], 8);

  say("us-east is back. Warming up before it takes traffic");
  diagram.link("balancer", "iad", null);
  diagram.status("iad", "pending");
  await diagram.countdown("iad", 3, { format: (seconds) => `Warm-up ${seconds}s` });

  say("All three regions are serving again");
  diagram.status("iad", "ok");
  await traffic(diagram, REGIONS, 6);
  await diagram.wait(1.5);
}

export function UptimeReroute() {
  return <DiagramStage figure="0.2" title="Uptime routing" tag="Edge" options={options} script={reroute} first={"Traffic is spread across three regions"} />;
}
