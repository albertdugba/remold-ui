"use client";
import { HugeiconsIcon } from "@hugeicons/react";
import { ArrowRight01Icon } from "@hugeicons/core-free-icons";
import { LayoutGroup, motion } from "motion/react";
import type { CSSProperties } from "react";
import { TaskStatusIcon } from "./demo-icons";
import { Frame } from "./frame";
import { useScene } from "./use-scene";
import "./task-list.css";

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

interface State {
  done: readonly string[];

  open: boolean;
}

const START: readonly string[] = ISSUES.filter((i) => i.status === "done").map(
  (i) => i.id,
);

const BEATS: readonly (State & { ms: number })[] = [
  { done: START, open: false, ms: 1700 },
  { done: ["ENG-142", ...START], open: false, ms: 1200 },
  { done: ["ENG-139", "ENG-142", ...START], open: false, ms: 1500 },
  { done: ["ENG-139", "ENG-142", ...START], open: true, ms: 2400 },
  { done: ["ENG-139", "ENG-142", ...START], open: false, ms: 1100 },
];

const fromBeat = (step: number): State => {
  const { ms: _, ...state } = BEATS[step]!;
  return state;
};

const LAYOUT_SPRING = { type: "spring" as const, duration: 0.32, bounce: 0.08 };

const PEEK = 3;

function Row({
  issue,
  status,
  onToggle,
}: {
  issue: Issue;
  status: Status;
  onToggle: () => void;
}) {
  const done = status === "done";
  return (
    <motion.li
      layout
      layoutId={`issue-${issue.id}`}
      transition={LAYOUT_SPRING}
      className="tl-row"
    >
      <span className="tl-id">{issue.id}</span>
      <button
        type="button"
        className="tl-status"
        aria-label={done ? `Reopen ${issue.id}` : `Complete ${issue.id}`}
        onClick={onToggle}
      >
        <TaskStatusIcon status={status} />
      </button>
      <span className="tl-title">{issue.title}</span>
      <span
        className="tl-label"
        style={{ "--hue": issue.hue } as CSSProperties}
      >
        {issue.label}
      </span>
      <span className="tl-avatar" aria-label={`Assigned to ${issue.assignee}`}>
        {issue.assignee}
      </span>
    </motion.li>
  );
}

interface TaskListDemoProps {
  framed?: boolean;

  playing?: boolean;
}

export function TaskListDemo({ framed = true, playing }: TaskListDemoProps) {
  const scene = useScene(BEATS, fromBeat, playing);
  const { state, take } = scene;
  const done = state.done.map((id) => ISSUES.find((i) => i.id === id)!);
  const isDone = new Set(state.done);

  const toggle = (id: string) =>
    take((s) => ({
      ...s,
      done: s.done.includes(id)
        ? s.done.filter((x) => x !== id)
        : [id, ...s.done],
    }));
  const fold = () => take((s) => ({ ...s, open: !s.open }));

  const body = (
    <section ref={scene.ref} className="tl" aria-label="Issues">
      <LayoutGroup id="task-list">
        <motion.div layout transition={LAYOUT_SPRING} className="tl-card">
          {GROUPS.map(({ status, name }) => {
            const issues = ISSUES.filter(
              (i) => i.status === status && !isDone.has(i.id),
            );
            if (!issues.length) return null;
            return (
              <motion.div
                layout
                transition={LAYOUT_SPRING}
                key={status}
                className="tl-group"
              >
                <header className="tl-head">
                  <TaskStatusIcon status={status} />
                  <strong>{name}</strong>
                  <span className="tl-count">{issues.length}</span>
                </header>
                <ul className="tl-rows">
                  {issues.map((issue) => (
                    <Row
                      key={issue.id}
                      issue={issue}
                      status={status}
                      onToggle={() => toggle(issue.id)}
                    />
                  ))}
                </ul>
              </motion.div>
            );
          })}

        <motion.div layout transition={LAYOUT_SPRING} className="tl-group">
          <button
            type="button"
            className="tl-head tl-fold"
            aria-expanded={state.open}
            onClick={fold}
          >
            <HugeiconsIcon icon={ArrowRight01Icon} aria-hidden="true" className="tl-chevron" />
            <TaskStatusIcon status="done" />
            <strong>Done</strong>
            <span className="tl-count">{done.length}</span>
            {!state.open && (
              <span className="tl-peek">
                {done.slice(0, PEEK).map((issue) => (
                  <motion.span
                    layoutId={`issue-${issue.id}`}
                    key={issue.id}
                    className="tl-id"
                  >
                    {issue.id}
                  </motion.span>
                ))}
                {done.length > PEEK && (
                  <span className="tl-more">{`+${done.length - PEEK}`}</span>
                )}
              </span>
            )}
          </button>
          {state.open && (
            <ul className="tl-rows">
              {done.map((issue) => (
                <Row
                  key={issue.id}
                  issue={issue}
                  status="done"
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

  return framed ? <Frame>{body}</Frame> : body;
}
