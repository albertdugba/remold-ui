/**
 * "Markup rewritten from scratch": the same tasks rendered four completely different ways.
 * Every switch replaces the HTML wholesale (no keys, no ids); `transition()` works out what
 * became what and animates it. Plus a status label that morphs letter by letter.
 */
import { morphText, transition, viewTransition, type ReducedMotion } from "@remold-ui/dom";

type Task = { title: string; rewrite: string; who: string; status: "todo" | "doing" | "done" };

const TASKS: Task[] = [
  { title: "Update pricing page", rewrite: "Refresh the pricing page copy", who: "Ama", status: "todo" },
  { title: "Audit colour tokens", rewrite: "Review our colour tokens", who: "Kofi", status: "todo" },
  { title: "Fix login redirect", rewrite: "Login redirect bug", who: "Ama", status: "doing" },
  { title: "Migrate billing webhooks", rewrite: "Move billing webhooks over", who: "Esi", status: "doing" },
  { title: "Ship dark mode", rewrite: "Dark mode is live", who: "Kofi", status: "done" },
];
const STATUS = { todo: "To do", doing: "In progress", done: "Done" } as const;
const escape = (s: string) => s.replace(/[&<>"]/g, (c) => `&#${c.charCodeAt(0)};`);

const card = (t: Task, title = t.title) =>
  `<div class="task"><span class="task-title">${escape(title)}</span><span class="who">${t.who}</span></div>`;

const views: Record<string, () => string> = {
  List: () => `<div class="v-list">${TASKS.map((t) => card(t)).join("")}</div>`,
  "By person": () =>
    `<div class="v-people">${["Ama", "Kofi", "Esi"]
      .map(
        (who) =>
          `<section class="group"><h3>${who}</h3>${TASKS.filter((t) => t.who === who)
            .map((t) => card(t))
            .join("")}</section>`,
      )
      .join("")}</div>`,
  Board: () =>
    `<div class="v-board">${(Object.keys(STATUS) as Task["status"][])
      .map(
        (s) =>
          `<section class="column"><h3>${STATUS[s]}</h3>${TASKS.filter((t) => t.status === s)
            .map((t) => card(t))
            .join("")}</section>`,
      )
      .join("")}</div>`,
  "AI rewrite": () =>
    `<table class="v-table"><tbody>${TASKS.map(
      (t) =>
        `<tr><td><span class="task-title">${escape(t.rewrite)}</span></td><td><span class="who">${
          t.who
        }</span></td><td><span class="pill">${STATUS[t.status]}</span></td></tr>`,
    ).join("")}</tbody></table>`,
};

export function setUpPage() {
  const stage = document.getElementById("stage")!;
  const buttons = document.getElementById("views")!;
  const useViewTransitions = document.getElementById("use-vt") as HTMLInputElement;
  const reducedSelect = document.getElementById("reduced") as HTMLSelectElement;
  const info = document.getElementById("page-info")!;

  let current = "List";
  stage.innerHTML = views[current]!();

  for (const name of Object.keys(views)) {
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = name;
    button.setAttribute("aria-pressed", String(name === current));
    button.addEventListener("click", () => {
      current = name;
      for (const b of buttons.children) b.setAttribute("aria-pressed", String(b === button));
      const run = useViewTransitions.checked ? viewTransition : transition;
      const t = run(
        stage,
        () => {
          stage.innerHTML = views[name]!();
        },
        { reducedMotion: reducedSelect.value as ReducedMotion, announce: true },
      );
      t.ready.then(({ matches, summary }) => {
        info.textContent =
          `${matches.pairs.length} pairs matched, ${summary.added} added, ${summary.removed} removed. ` +
          `Click again before it settles: it turns round mid-flight.`;
      });
    });
    buttons.append(button);
  }

  // Status label
  const status = document.getElementById("status")!;
  const steps = ["Connecting…", "Listening", "Thinking…", "Saving changes", "Saved"];
  let step = 0;
  status.textContent = steps[0]!;
  document.getElementById("next-status")!.addEventListener("click", () => {
    step = (step + 1) % steps.length;
    void morphText(status, steps[step]!, { reducedMotion: reducedSelect.value as ReducedMotion });
  });
}
