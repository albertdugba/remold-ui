"use client";
import { Remold } from "@remold-ui/react";
import { useState } from "react";
import { Frame, Segmented } from "./frame";
import "./scene.css";

type Layouts = Remold.Scene.Props["layouts"];
type Box = Layouts[string]["objects"][string];

function box(x: number, y: number, z: number, width: number, depth: number): Box {
  return { x, y, z, width, depth };
}

export const SCENE = {
  label: "A small app: web and mobile clients, an API and a database",
  objects: {
    db: {
      look: "cylinder",
      label: "database",
      description: "Where the data lives.",
    },
    api: {
      look: "glass",
      label: "api",
      description: "Reads and writes the data.",
    },
    web: { look: "chip", label: "web", description: "The web client." },
    mobile: { look: "chip", label: "mobile", description: "The phone client." },
  },
  links: [
    { from: "web", to: "api", arrow: "end", flow: true },
    { from: "mobile", to: "api", arrow: "end", flow: true },
    { from: "api", to: "db", arrow: "both", dashed: true },
  ],
  layouts: {
    Simple: {
      caption: "Two clients talk to one API, which owns the database.",
      camera: { yaw: 45, pitch: 60, zoom: 1 },
      objects: {
        db: box(-60, -60, 0, 120, 120),
        api: box(-60, -60, 110, 120, 120),
        web: box(-260, -40, 0, 80, 80),
        mobile: box(-40, 200, 0, 80, 80),
      },
    },
    Scaled: {
      caption: "At scale the database grows and the API moves out in front.",
      camera: { yaw: 45, pitch: 55, zoom: 0.8 },
      objects: {
        db: box(80, -120, 0, 200, 200),
        api: box(-170, -70, 0, 140, 140),
        web: box(-420, -150, 0, 80, 80),
        mobile: box(-420, 60, 0, 80, 80),
      },
    },
  },
} satisfies Pick<Remold.Scene.Props, "label" | "objects" | "links" | "layouts">;

export function SceneDemo({
  framed = true,
  index,
}: {
  framed?: boolean;
  index?: number;
}) {
  const [own, setLayout] = useState<keyof typeof SCENE.layouts>("Simple");

  const layout = index === undefined ? own : (["Simple", "Scaled"] as const)[index % 2]!;

  const body = (
    <div className="rm-scene">
      <Remold.Scene
        {...SCENE}
        palette="slate"
        layout={layout}
        className="rm-scene-canvas"
      />
      <div className="rm-scene-foot">
        {index === undefined && (
          <Segmented
            label="Layout"
            value={layout}
            onChange={setLayout}
            options={["Simple", "Scaled"] as const}
          />
        )}
        <p>{SCENE.layouts[layout].caption}</p>
      </div>
    </div>
  );

  return framed ? <Frame tone="dark">{body}</Frame> : body;
}
