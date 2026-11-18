import type { OrbState } from "./voice-orb";

export const ORB_STEPS: readonly { tab: string; state: OrbState; status: string }[] = [
  { tab: "Idle", state: "idle", status: "Ready when you are" },
  { tab: "Connecting", state: "connecting", status: "Connecting" },
  { tab: "Listening", state: "listening", status: "Listening" },
  { tab: "Thinking", state: "thinking", status: "Thinking" },
  { tab: "Searching", state: "searching", status: "Searching the web" },
  { tab: "Reading", state: "searching", status: "Reading 6 sources" },
  { tab: "Speaking", state: "speaking", status: "Speaking" },
];
