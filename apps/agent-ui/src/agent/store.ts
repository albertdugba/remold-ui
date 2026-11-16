import { useSyncExternalStore } from "react";

export type Phase = "idle" | "working" | "waiting" | "done" | "lost";
export type StepStatus = "running" | "waiting" | "done" | "denied" | "failed";
export type StepKind = "rename" | "region" | "role" | "switch" | "delete";

export interface Step {
  id: string;
  kind: StepKind;
  label: string;
  running: string;
  done: string;
  denied: string;
  detail?: string;
  status: StepStatus;
}

export interface Approval {
  step: string;
  reason: string;
}

export interface Mark {
  key: "value" | "checked";
  previous: unknown;
  kind: "preview" | "changed";
}

export interface Cursor {
  shown: boolean;
  target: string | null;
  pressing: boolean;
}

export interface AgentUi {
  phase: Phase;
  prompt: string;
  total: number;
  steps: readonly Step[];
  approval: Approval | null;
  marks: Readonly<Record<string, Mark>>;
  cursor: Cursor;
  focus: string | null;
  undone: boolean;
}

let state: AgentUi = {
  phase: "idle",
  prompt: "",
  total: 0,
  steps: [],
  approval: null,
  marks: {},
  cursor: { shown: false, target: null, pressing: false },
  focus: null,
  undone: false,
};

const listeners = new Set<() => void>();

export const read = () => state;

export function update(next: Partial<AgentUi> | ((current: AgentUi) => Partial<AgentUi>)) {
  state = { ...state, ...(typeof next === "function" ? next(state) : next) };
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);

  return () => {
    listeners.delete(listener);
  };
}

export function useAgentUi<T>(select: (current: AgentUi) => T) {
  return useSyncExternalStore(subscribe, () => select(state));
}

export function setStep(id: string, next: Partial<Step>) {
  update((current) => ({ steps: current.steps.map((step) => (step.id === id ? { ...step, ...next } : step)) }));
}
