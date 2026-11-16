import { createAgent, type AgentAction } from "@ui-sdk/react/agent";
import { createHistory } from "@ui-sdk/react/history";
import { elementOf } from "@ui-sdk/react/observe";
import { read, setStep, update, type Mark } from "./store";

const trust = { person: false, preview: false };
const pending: { step: string | null; settle: ((approved: boolean) => void) | null } = { step: null, settle: null };

export function ask(step: string, reason: string, signal?: AbortSignal) {
  return new Promise<boolean>((resolve) => {
    const settle = (approved: boolean) => {
      if (pending.settle !== settle) return;

      pending.settle = null;
      update({ phase: "working", approval: null });
      resolve(approved);
    };

    pending.settle = settle;
    signal?.addEventListener("abort", () => settle(false));
    setStep(step, { status: "waiting" });
    update({ phase: "waiting", approval: { step, reason } });
  });
}

export const answer = (approved: boolean) => pending.settle?.(approved);

export const follow = (step: string | null) => {
  pending.step = step;
};

function allow(step: AgentAction, { signal }: { signal: AbortSignal }) {
  if (!step.confirm || trust.person || trust.preview) return true;
  if (!pending.step) return false;

  return ask(pending.step, step.confirm, signal);
}

export const agent = createAgent({ allow });

export const history = createHistory(agent, {
  within: () => document.querySelector("[data-settings]"),
  keys: ["value", "checked"],
});

export async function trusted<T>(who: keyof typeof trust, work: () => Promise<T>) {
  trust[who] = true;

  try {
    return await work();
  } finally {
    trust[who] = false;
  }
}

agent.subscribe((change) => {
  const label = change.label;

  if (!label || (change.key !== "value" && change.key !== "checked")) return;

  const marks: Record<string, Mark> = { ...read().marks };
  const existing = marks[label];

  if (change.source !== "agent" || (existing && Object.is(existing.previous, change.value))) {
    if (!existing) return;

    delete marks[label];
  } else if (!existing) {
    marks[label] = { key: change.key, previous: change.previous, kind: trust.preview ? "preview" : "changed" };
  } else {
    return;
  }

  update({ marks });
});

export function keep(label: string) {
  const mark = read().marks[label];

  if (mark) update({ marks: { ...read().marks, [label]: { ...mark, kind: "changed" } } });
}

export function controlOf(ref: string): HTMLElement | null {
  const element = elementOf(ref) as HTMLElement | undefined;

  return element?.closest("[data-row]")?.querySelector<HTMLElement>("[data-target]") ?? element ?? null;
}

export async function undo(label: string) {
  const mark = read().marks[label];

  if (!mark) return;

  const entry = agent.snapshot().find((component) => component.label === label);

  await trusted("person", () =>
    agent.act({ steps: [{ ref: entry?.ref ?? label, action: mark.key === "checked" ? "setChecked" : "setValue", args: [mark.previous] }] }),
  );

  if (entry) controlOf(entry.ref)?.focus();
}

export async function undoAll() {
  await trusted("person", () => history.undoSource("agent"));
  update({ undone: true });
}
