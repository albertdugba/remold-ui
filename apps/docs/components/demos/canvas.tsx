"use client";

import { useState } from "react";
import { Frame, Segmented } from "./frame";
import { VoiceOrb, type OrbState } from "./voice-orb";

const STATES: readonly OrbState[] = ["idle", "listening", "thinking", "speaking"];

export function CanvasDemo() {
  const [state, setState] = useState<OrbState>("listening");
  return (
    <Frame>
      <div style={{ display: "grid", justifyItems: "center", gap: 20 }}>
        <VoiceOrb state={state} size={220} />
        <Segmented label="State" value={state} onChange={setState} options={STATES} />
      </div>
    </Frame>
  );
}
