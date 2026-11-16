import type { AgentComponent } from "@ui-sdk/react/agent";
import type { StepKind } from "./store";

export interface Planned {
  kind: StepKind;
  ref: string;
  label: string;
  action: "setValue" | "setChecked" | "press";
  value?: unknown;
  key?: "value" | "checked";
  confirm?: string;
  running: string;
  done: string;
  denied: string;
  detail?: string;
}

const PLACES: Record<string, readonly string[]> = {
  "west-africa": ["west africa", "africa", "accra", "ghana"],
  europe: ["europe", "london", "frankfurt"],
  "north-america": ["north america", "america", "virginia"],
  "asia-pacific": ["asia pacific", "asia", "singapore"],
};

const OFF = /\b(off|disable|stop|mute|silence|quieten|pause)\b/;
const ON = /\b(on|enable|start|unmute|resume)\b/;

const has = (text: string, word: string) => new RegExp(`\\b${word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`).test(text);
const labelOf = (component: AgentComponent, value: unknown) => component.items?.find((item) => item.value === value)?.label ?? String(value ?? "");

export function plan(prompt: string, page: readonly AgentComponent[]): Planned[] {
  const live = page.filter((component) => !component.offPage && !component.disabled && component.label);
  const steps = new Map<string, Planned>();
  let turnOn: boolean | null = null;

  for (const raw of prompt.split(/[,;.]|\band\b|\bthen\b/i)) {
    const clause = raw.trim();
    const text = clause.toLowerCase();

    if (!text) continue;

    if (OFF.test(text)) turnOn = false;
    else if (ON.test(text)) turnOn = true;

    for (const component of live) {
      const label = component.label as string;
      const name = label.toLowerCase();

      if (component.component === "button" && /\b(delete|destroy|remove)\b/.test(text) && has(text, "project") && has(name, "delete")) {
        steps.set(label, {
          kind: "delete",
          ref: component.ref,
          label,
          action: "press",
          confirm: component.confirm,
          running: "Deleting project",
          done: "Deleted project",
          denied: "Kept the project",
        });
      }

      if (component.component === "input" && /\b(rename|call|name)\b/.test(text)) {
        const next = /\bto\s+["'“]?(.+?)["'”]?$/i.exec(clause)?.[1]?.trim();

        if (next && next !== component.value) {
          steps.set(label, {
            kind: "rename",
            ref: component.ref,
            label,
            action: "setValue",
            key: "value",
            value: next,
            confirm: component.confirm,
            running: "Renaming project",
            done: "Renamed project",
            denied: "Kept the name",
            detail: `${String(component.value)} → ${next}`,
          });
        }
      }

      if (component.component === "select" && name === "region") {
        const next = component.items?.find((item) => (PLACES[item.value] ?? [item.label.toLowerCase()]).some((place) => has(text, place)));

        if (next && next.value !== component.value) {
          steps.set(label, {
            kind: "region",
            ref: component.ref,
            label,
            action: "setValue",
            key: "value",
            value: next.value,
            confirm: component.confirm,
            running: "Moving region",
            done: "Moved region",
            denied: "Kept the region",
            detail: `${labelOf(component, component.value)} → ${next.label}`,
          });
        }
      }

      if (component.component === "select" && name.startsWith("role for ")) {
        const person = label.slice("Role for ".length).split(" ")[0];
        const next = component.items?.find((item) => has(text, item.label.toLowerCase()));

        if (has(text, person.toLowerCase()) && next && next.value !== component.value) {
          steps.set(label, {
            kind: "role",
            ref: component.ref,
            label,
            action: "setValue",
            key: "value",
            value: next.value,
            confirm: component.confirm,
            running: `Changing ${person}’s role`,
            done: `Changed ${person}’s role`,
            denied: `Kept ${person}’s role`,
            detail: `${labelOf(component, component.value)} → ${next.label}`,
          });
        }
      }

      if (component.component === "switch" && turnOn !== null) {
        const named = name.split(" ").some((word) => word.length > 4 && has(text, word));
        const every = /\b(notifications|everything|all)\b/.test(text);

        if ((named || every) && component.checked !== turnOn) {
          steps.set(label, {
            kind: "switch",
            ref: component.ref,
            label,
            action: "setChecked",
            key: "checked",
            value: turnOn,
            confirm: component.confirm,
            running: `Turning ${turnOn ? "on" : "off"} ${name}`,
            done: `Turned ${turnOn ? "on" : "off"} ${name}`,
            denied: `Left ${name} ${turnOn ? "off" : "on"}`,
          });
        }
      }
    }
  }

  return [...steps.values()];
}
