"use client";

import { extrude } from "@remold-ui/canvas";
import { Remold } from "@remold-ui/react/canvas";
import { useState } from "react";
import { PAPER } from "./day-stage";
import { CREDIT_CARD_GLYPH } from "./demo-glyphs";
import "./center-flow.css";

type SceneProps = Remold.Scene.Props;
type Phase = "ready" | "flowing";
const ink = "rgba(52, 116, 98, .48)";
const hubTile = () =>
  extrude({
    radius: 0.24,
    edge: true,
    ink,
    shadow: false,
    fillColor: "#405bff",
    decal: { icon: CREDIT_CARD_GLYPH, text: "", size: 52, color: "#ffffff", weight: 2.2 },
  });
const NETFLIX_N = "M3 2h5l8 12V2h5v20h-5L8 10v12H3Z";
const SPOTIFY_WAVES = "M4.5 9.5c5-1.7 10.8-.9 15 1.2M5.5 13c4.6-1.3 9-.7 12.5 1M6.5 16.4c3.5-.8 6.7-.4 9.3.8";
const YOUTUBE_PLAY = "M10 7.5 17 12l-7 4.5Z";
const brand = (
  shape: "ellipse" | { path: string },
  color: string,
  decal: { icon?: string; text?: string; color?: string; size?: number },
) =>
  extrude({
    shape,
    sides: "sheen",
    edge: false,
    shadow: false,
    fillColor: color,
    decal: { text: "", size: 34, color: "#fff", weight: 1.9, ...decal },
  });
const OBJECTS: SceneProps["objects"] = {
  hub: { look: hubTile(), label: "Subscription wallet" },
  netflix: { look: brand({ path: NETFLIX_N }, "#e50914", {}), label: "Netflix" },
  spotify: { look: brand("ellipse", "#1db954", { icon: SPOTIFY_WAVES, size: 42 }), label: "Spotify" },
  youtube: {
    look: brand({ path: "M3 6Q3 3 6 3h12q3 0 3 3v12q0 3-3 3H6q-3 0-3-3Z" }, "#ff0033", {
      icon: YOUTUBE_PLAY,
      size: 38,
      color: "#fff",
    }),
    label: "YouTube Premium",
  },
  prime: {
    look: brand("ellipse", "#00a8e1", { text: "prime", size: 24, color: "#fff" }),
    label: "Prime Video",
  },
  disney: {
    look: brand("ellipse", "#113ccf", { text: "Disney+", size: 20, color: "#fff" }),
    label: "Disney+",
  },
};
const POSITIONS = {
  netflix: { x: -38, y: -288 },
  spotify: { x: 238, y: -168 },
  youtube: { x: 238, y: 136 },
  prime: { x: -314, y: 136 },
  disney: { x: -314, y: -168 },
};
function layout(phase: Phase): SceneProps["layouts"][string] {
  return {
    camera: { yaw: 0, pitch: 48, zoom: 1.38, centerX: 0, centerY: -8 },
    objects: {
      hub: {
        x: -79,
        y: -66,
        z: 0,
        width: 158,
        depth: 132,
        height: phase === "flowing" ? 50 : 38,
        fill: 1,
        color: "#405bff",
      },
      ...Object.fromEntries(
        Object.entries(POSITIONS).map(([id, point], index) => [
          id,
          {
            ...point,
            z: 0,
            width: id === "netflix" ? 58 : 74,
            depth: 74,
            height: phase === "flowing" && index === 2 ? 30 : 22,
            fill: 1,
            color: ["#e50914", "#1db954", "#ff0033", "#00a8e1", "#113ccf"][index],
            arc: phase === "flowing" && index === 2 ? 32 : 0,
          },
        ]),
      ),
    },
  };
}
const LAYOUTS = { ready: layout("ready"), flowing: layout("flowing") };
const LINKS: SceneProps["links"] = Object.keys(POSITIONS).flatMap((id) => [
  { from: "hub", to: id, route: "curve", dashed: true, layouts: ["ready"] },
  { from: "hub", to: id, route: "curve", flow: true, layouts: ["flowing"] },
]);

export function CenterFlow() {
  const [phase, setPhase] = useState<Phase>("flowing");
  return (
    <section className="center-flow not-prose" aria-label="Subscription wallet">
      <Remold.Scene
        className="cf-remold-scene"
        label="A subscription wallet connected to Netflix, Spotify, YouTube Premium, Prime Video, and Disney Plus"
        objects={OBJECTS}
        links={LINKS}
        layouts={LAYOUTS}
        layout={phase}
        palette={PAPER}
        interact={{ drag: false }}
        spring={{ duration: 0.86, bounce: 0.16 }}
      />
      <div className="cf-footer">
        <span>Subscription wallet</span>
        <button
          type="button"
          onClick={() => setPhase((current) => (current === "flowing" ? "ready" : "flowing"))}
        >
          {phase === "flowing" ? "Pause flow" : "Replay"}
        </button>
      </div>
    </section>
  );
}
