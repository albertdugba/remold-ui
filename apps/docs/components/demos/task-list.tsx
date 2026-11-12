"use client";
import { HugeiconsIcon } from "@hugeicons/react";
import { ArrowRight01Icon } from "@hugeicons/core-free-icons";
import { LayoutGroup, motion } from "motion/react";
import { useEffect, useRef, useState, type CSSProperties, type Ref } from "react";
import { TaskStatusIcon } from "./demo-icons";
import { Frame } from "./frame";
import { Odometer } from "./odometer";
import { useControllableState } from "./use-controllable-state";
import { useScene } from "./use-scene";

type Status = "progress" | "todo" | "done";

interface Issue {
  id: string;
  title: string;
  label: string;

  hue: number;
  assignee: string;

  status: Status;
}

const ISSUES: readonly Issue[] = [
  {
    id: "ENG-148",
    title: "Search results flicker on refresh",
    label: "Bug",
    hue: 25,
    assignee: "MO",
    status: "progress",
  },
  {
    id: "ENG-142",
    title: "Empty state for saved views",
    label: "Design",
    hue: 300,
    assignee: "SL",
    status: "todo",
  },
  {
    id: "ENG-139",
    title: "Keyboard shortcut to archive",
    label: "Feature",
    hue: 250,
    assignee: "JL",
    status: "todo",
  },
  {
    id: "ENG-135",
    title: "Rate limit webhook retries",
    label: "Backend",
    hue: 150,
    assignee: "MO",
    status: "todo",
  },
  {
    id: "ENG-120",
    title: "Upgrade to Postgres 17",
    label: "Infra",
    hue: 200,
    assignee: "RS",
    status: "done",
  },
];

const GROUPS: readonly { status: Exclude<Status, "done">; name: string }[] = [
  { status: "progress", name: "In Progress" },
  { status: "todo", name: "Todo" },
];

export interface TaskListValue {
  done: readonly string[];

  open: boolean;
}

const START: readonly string[] = ISSUES.filter((issue) => issue.status === "done").map((issue) => issue.id);

const LAYOUT_SPRING = { type: "spring" as const, duration: 0.32, bounce: 0.08 };

const PEEK = 3;

const FRESH_FOR = 1400;
const LAND = 260;

const FRESH =
  "transition-[background-color,color] duration-700 data-fresh:bg-[color-mix(in_oklab,var(--tl-done)_12%,transparent)] data-fresh:text-(--tl-done) motion-reduce:transition-none";
const FRESH_ROW =
  "transition-[background-color] duration-700 data-fresh:bg-[color-mix(in_oklab,var(--tl-done)_8%,transparent)] motion-reduce:transition-none";

function Row({
  issue,
  status,
  fresh = false,
  onToggle,
}: {
  issue: Issue;
  status: Status;
  fresh?: boolean;
  onToggle: () => void;
}) {
  const done = status === "done";
  return (
    <motion.li
      layout
      layoutId={`issue-${issue.id}`}
      transition={LAYOUT_SPRING}
      className={`flex h-10 items-center gap-2.5 px-3.5 not-first:shadow-[0_-1px_0_var(--tl-line)] ${FRESH_ROW}`}
      data-fresh={fresh || undefined}
    >
      <span className="w-[58px] flex-none font-mono text-[11.5px] text-(--tl-faint) tabular-nums">
        {issue.id}
      </span>
      <button
        type="button"
        className="-mx-[3px] grid size-5 flex-none cursor-pointer place-items-center rounded-[5px] border-0 bg-transparent p-0 hover:bg-(--tl-head) focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-(--tl-done)"
        aria-label={done ? `Reopen ${issue.id}` : `Complete ${issue.id}`}
        onClick={onToggle}
      >
        <TaskStatusIcon status={status} />
      </button>
      <span className="min-w-0 flex-1 truncate font-[450]">{issue.title}</span>
      <span
        className="inline-flex h-[22px] flex-none items-center gap-1.5 rounded-full px-2 text-[12px] text-(--tl-muted) shadow-[inset_0_0_0_1px_var(--tl-line)] before:size-[7px] before:rounded-full before:bg-[oklch(0.66_0.15_var(--hue))] before:content-['']"
        style={{ "--hue": issue.hue } as CSSProperties}
      >
        {issue.label}
      </span>
      <span
        className="grid size-5 flex-none place-items-center rounded-full bg-(--tl-head) text-[8.5px] font-semibold text-(--tl-muted) shadow-[inset_0_0_0_1px_var(--tl-line)]"
        aria-label={`Assigned to ${issue.assignee}`}
      >
        {issue.assignee}
      </span>
    </motion.li>
  );
}

export interface TaskListProps {
  value?: TaskListValue;
  defaultValue?: TaskListValue;
  onValueChange?: (value: TaskListValue) => void;
  ref?: Ref<HTMLElement>;
}

export function TaskList({
  value,
  defaultValue = { done: START, open: false },
  onValueChange,
  ref,
}: TaskListProps) {
  const [list, setList] = useControllableState({ value, defaultValue, onValueChange });
  const done = list.done.map((id) => ISSUES.find((issue) => issue.id === id)!);
  const isDone = new Set(list.done);
  const [fresh, setFresh] = useState<string | null>(null);
  const [doneCount, setDoneCount] = useState(done.length);
  const doneBefore = useRef(list.done.length);

  useEffect(() => {
    const grew = list.done.length > doneBefore.current;
    doneBefore.current = list.done.length;
    if (!grew) return;
    setFresh(list.done[0]!);
    const timer = setTimeout(() => setFresh(null), FRESH_FOR);
    return () => clearTimeout(timer);
  }, [list.done]);

  useEffect(() => {
    const timer = setTimeout(() => setDoneCount(done.length), done.length > doneCount ? LAND : 0);
    return () => clearTimeout(timer);
  }, [done.length, doneCount]);

  const toggle = (id: string) =>
    setList((current) => ({
      ...current,
      done: current.done.includes(id)
        ? current.done.filter((issueId) => issueId !== id)
        : [id, ...current.done],
    }));
  const fold = () => setList((current) => ({ ...current, open: !current.open }));

  return (
    <section
      ref={ref}
      className="grid min-h-[330px] w-[min(100%,560px)] grid-cols-[minmax(0,1fr)] content-start font-sans text-[13px] text-(--tl-ink) [--tl-done:#5e6ad2] [--tl-faint:#a1a1aa] [--tl-head:#f7f7f8] [--tl-ink:#18181b] [--tl-line:rgb(24_24_27/0.06)] [--tl-muted:#6b6b76] [--tl-progress:#e2a33b] [--tl-surface:#ffffff] [--tl-todo:#b4b4bd] dark:[--tl-done:#7d86e6] dark:[--tl-faint:#6b6b76] dark:[--tl-head:#222226] dark:[--tl-ink:#ededef] dark:[--tl-line:rgb(255_255_255/0.06)] dark:[--tl-muted:#9b9ba5] dark:[--tl-progress:#f0b44c] dark:[--tl-surface:#1c1c1f] dark:[--tl-todo:#6b6b76]"
      aria-label="Issues"
    >
      <LayoutGroup id="task-list">
        <motion.div
          layout
          transition={LAYOUT_SPRING}
          className="grid min-w-0 grid-cols-[minmax(0,1fr)] rounded-xl bg-(--tl-surface) in-[.rm-stage]:shadow-[inset_0_0_0_1px_rgb(24_24_27/0.08)] dark:in-[.rm-stage]:shadow-[inset_0_0_0_1px_rgb(255_255_255/0.08)]"
        >
          {GROUPS.map(({ status, name }) => {
            const issues = ISSUES.filter((issue) => issue.status === status && !isDone.has(issue.id));
            if (!issues.length) return null;
            return (
              <motion.div
                layout
                transition={LAYOUT_SPRING}
                key={status}
                className="group/section not-first:shadow-[0_-1px_0_var(--tl-line)]"
              >
                <header className="flex h-[34px] w-full items-center gap-2 border-0 bg-(--tl-head) px-3.5 text-left text-inherit group-first/section:rounded-t-xl group-last/section:last:rounded-b-xl [&>strong]:font-medium">
                  <TaskStatusIcon status={status} />
                  <strong>{name}</strong>
                  <Odometer className="text-(--tl-faint)" value={String(issues.length)} />
                </header>
                <ul className="m-0 grid list-none grid-cols-[minmax(0,1fr)] p-0">
                  {issues.map((issue) => (
                    <Row key={issue.id} issue={issue} status={status} onToggle={() => toggle(issue.id)} />
                  ))}
                </ul>
              </motion.div>
            );
          })}

          <motion.div
            layout
            transition={LAYOUT_SPRING}
            className="group/section not-first:shadow-[0_-1px_0_var(--tl-line)]"
          >
            <button
              type="button"
              className="group/fold cursor-pointer pl-2 flex h-[34px] w-full items-center gap-2 border-0 bg-(--tl-head) px-3.5 text-left text-inherit group-first/section:rounded-t-xl group-last/section:last:rounded-b-xl [&>strong]:font-medium focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-(--tl-done)"
              aria-expanded={list.open}
              onClick={fold}
            >
              <HugeiconsIcon
                icon={ArrowRight01Icon}
                aria-hidden="true"
                className="-mr-0.5 size-[13px] text-(--tl-faint) transition-[rotate] duration-200 group-aria-expanded/fold:rotate-90"
              />
              <TaskStatusIcon status="done" />
              <strong>Done</strong>
              <Odometer className="text-(--tl-faint)" value={String(doneCount)} />
              {!list.open && (
                <span className="ml-auto flex items-center gap-2.5">
                  {done.slice(0, PEEK).map((issue) => (
                    <motion.span
                      layoutId={`issue-${issue.id}`}
                      key={issue.id}
                      className={`flex-none rounded-[5px] px-1 -mx-1 font-mono text-[11.5px] text-(--tl-faint) tabular-nums ${FRESH}`}
                      data-fresh={issue.id === fresh || undefined}
                    >
                      {issue.id}
                    </motion.span>
                  ))}
                  {done.length > PEEK && (
                    <span className="text-[12px] text-(--tl-faint)">{`+${done.length - PEEK}`}</span>
                  )}
                </span>
              )}
            </button>
            {list.open && (
              <ul className="m-0 grid list-none grid-cols-[minmax(0,1fr)] p-0">
                {done.map((issue) => (
                  <Row
                    key={issue.id}
                    issue={issue}
                    status="done"
                    fresh={issue.id === fresh}
                    onToggle={() => toggle(issue.id)}
                  />
                ))}
              </ul>
            )}
          </motion.div>
        </motion.div>
      </LayoutGroup>
    </section>
  );
}

const BEATS: readonly (TaskListValue & { ms: number })[] = [
  { done: START, open: false, ms: 1700 },
  { done: ["ENG-142", ...START], open: false, ms: 1200 },
  { done: ["ENG-139", "ENG-142", ...START], open: false, ms: 1500 },
  { done: ["ENG-139", "ENG-142", ...START], open: true, ms: 2400 },
  { done: ["ENG-139", "ENG-142", ...START], open: false, ms: 1100 },
];

const fromBeat = (step: number): TaskListValue => {
  const { ms: _, ...state } = BEATS[step]!;
  return state;
};

interface TaskListDemoProps {
  framed?: boolean;

  playing?: boolean;
}

export function TaskListDemo({ framed = true, playing }: TaskListDemoProps) {
  const scene = useScene(BEATS, fromBeat, playing);
  const element = <TaskList ref={scene.ref} value={scene.state} onValueChange={scene.onValueChange} />;
  return framed ? <Frame>{element}</Frame> : element;
}
