"use client";
/** Scenes built from any shape: an adapter stack, a snapshot tray, and six outlines. */
import { adapters, outlines, snapshots } from "./build-anything-scenes";
import { SceneStage } from "./scene-stage";

export function BuildAnythingDemo() {
  return (
    <SceneStage
      scenes={[
        { key: "adapters", name: "Adapters", scene: adapters },
        { key: "snapshots", name: "Snapshot tray", scene: snapshots },
        { key: "outlines", name: "Any outline", scene: outlines },
      ]}
    />
  );
}
