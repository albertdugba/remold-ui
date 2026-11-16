import { stageChanges } from "@ui-sdk/react/history";
import { agent, ask, controlOf, follow, keep, trusted } from "./bridge";
import { plan, type Planned } from "./planner";
import { read, setStep, update, type StepStatus } from "./store";

const START = 320;
const TRAVEL = 640;
const PRESS = 150;
const SETTLE = 520;

const wait = (time: number) => new Promise((resolve) => setTimeout(resolve, time));

let round = 0;

async function perform(id: string, step: Planned): Promise<StepStatus> {
  if (step.confirm && step.key) {
    const staged = await trusted("preview", () => stageChanges(agent, [{ ref: step.ref, key: step.key, value: step.value }]));

    if (!staged.applied.length) return "failed";

    if (await ask(id, step.confirm)) {
      keep(step.label);

      return "done";
    }

    await trusted("preview", () => staged.revert());

    return "denied";
  }

  follow(id);

  const result = await agent.act({ steps: [{ ref: step.ref, action: step.action, args: step.action === "press" ? [] : [step.value] }] });

  follow(null);

  if (result.ok) return "done";

  return /said no/i.test(result.error?.message ?? "") ? "denied" : "failed";
}

export async function run(prompt: string) {
  const phase = read().phase;

  if (phase === "working" || phase === "waiting") return;

  const steps = plan(prompt, agent.snapshot());

  if (!steps.length) {
    update({ phase: "lost", prompt: "", steps: [], total: 0, undone: false });

    return;
  }

  const name = `r${++round}`;

  update({ phase: "working", prompt, steps: [], total: steps.length, undone: false, focus: null, cursor: { shown: true, target: "home", pressing: false } });

  for (const [index, step] of steps.entries()) {
    const id = `${name}-${index}`;

    update((current) => ({
      steps: [...current.steps, { id, kind: step.kind, label: step.label, running: step.running, done: step.done, denied: step.denied, detail: step.detail, status: "running" }],
    }));

    if (!index) await wait(START);

    update({ cursor: { shown: true, target: step.ref, pressing: false }, focus: step.label });
    controlOf(step.ref)?.scrollIntoView({ block: "nearest", behavior: "smooth" });
    await wait(TRAVEL);
    update((current) => ({ cursor: { ...current.cursor, pressing: true } }));
    await wait(PRESS);
    update((current) => ({ cursor: { ...current.cursor, pressing: false } }));

    setStep(id, { status: await perform(id, step) });

    if (!controlOf(step.ref)?.isConnected) update({ focus: null, cursor: { shown: true, target: "home", pressing: false } });

    await wait(SETTLE);
  }

  update({ focus: null, cursor: { shown: true, target: "home", pressing: false } });
  await wait(TRAVEL - 180);
  update({ phase: "done", prompt: "", cursor: { shown: false, target: "home", pressing: false } });
}
