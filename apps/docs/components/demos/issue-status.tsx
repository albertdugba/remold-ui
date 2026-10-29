"use client";
/**
 * Changing an issue's status, the way issue trackers like Linear do it. The menu springs open from
 * the status button, a highlight glides to whatever you point at, and the status icon fills its ring
 * as work moves along: empty for todo, half for in progress, three quarters in review. Done and
 * canceled fill the circle and draw a check or a cross, which reshape into each other. Each change
 * lands in the activity below.
 *
 * Built on the shared `Picker` (Base UI's Select, with Motion on top), reused for priority too; the
 * check and cross reshape with Remold's `createMorph`. It plays a short scene
 * while it's on screen. Touch it and it's yours. The people and the issue are made up.
 */
import { AnimatePresence, motion } from "motion/react";
import { useRef } from "react";
import { MorphIcon } from "./morph-icon";
import { Picker } from "./picker";
import { useScene } from "./use-scene";
import "./issue-status.css";

const STATUSES = [
  { id: "backlog", label: "Backlog", fill: 0, color: "var(--is-quiet)" },
  { id: "todo", label: "Todo", fill: 0, color: "var(--is-todo)" },
  { id: "progress", label: "In Progress", fill: 0.5, color: "var(--is-progress)" },
  { id: "review", label: "In Review", fill: 0.75, color: "var(--is-review)" },
  { id: "done", label: "Done", fill: 1, color: "var(--is-done)" },
  { id: "canceled", label: "Canceled", fill: 1, color: "var(--is-quiet)" },
] as const;
type Status = (typeof STATUSES)[number]["id"];

const of = (id: Status) => STATUSES.find((s) => s.id === id)!;

const CHECK = "M8.2 12.4l2.4 2.4M10.6 14.8l5.2-5.4";
const CROSS = "M9.2 9.2l5.6 5.6M14.8 9.2l-5.6 5.6";

const SPRING = { type: "spring" as const, duration: 0.4, bounce: 0.15 };

/** The status glyph: a ring that fills like a pie, then a solid disc with a check or a cross. */
function StatusIcon({ status, size = 16 }: { status: Status; size?: number }) {
  const s = of(status);
  const closed = status === "done" || status === "canceled";
  return (
    <svg className="is-glyph" viewBox="0 0 24 24" width={size} height={size} aria-hidden="true" style={{ color: s.color }}>
      <motion.circle
        cx={12}
        cy={12}
        r={9}
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        initial={false}
        animate={{ strokeDasharray: status === "backlog" ? "3.2 3.2" : "56.6 0" }}
        transition={SPRING}
      />
      {/* The pie: a fat stroke on a small circle, drawn clockwise from twelve o'clock. */}
      <motion.circle
        cx={12}
        cy={12}
        r={3.5}
        fill="none"
        stroke="currentColor"
        strokeWidth={7}
        transform="rotate(-90 12 12)"
        initial={false}
        animate={{ pathLength: s.fill, opacity: s.fill ? 1 : 0 }}
        transition={SPRING}
      />
      <motion.circle
        cx={12}
        cy={12}
        r={9}
        fill="currentColor"
        initial={false}
        animate={{ scale: closed ? 1 : 0.4, opacity: closed ? 1 : 0 }}
        style={{ transformOrigin: "12px 12px" }}
        transition={SPRING}
      />
      <motion.g
        className="is-mark"
        initial={false}
        animate={{ opacity: closed ? 1 : 0, scale: closed ? 1 : 0.6 }}
        style={{ transformOrigin: "12px 12px" }}
        transition={SPRING}
      >
        <MorphIcon d={status === "canceled" ? CROSS : CHECK} strokeWidth={2.4} width={24} height={24} />
      </motion.g>
    </svg>
  );
}

const PRIORITIES = [
  { value: "urgent", label: "Urgent" },
  { value: "high", label: "High" },
  { value: "medium", label: "Medium" },
  { value: "low", label: "Low" },
  { value: "none", label: "No priority" },
] as const;
type Priority = (typeof PRIORITIES)[number]["value"];

/** Signal bars, filled up to the priority; urgent is a red square with a bang. */
function PriorityIcon({ priority }: { priority: Priority }) {
  if (priority === "urgent")
    return (
      <span className="is-urgent" aria-hidden="true">
        !
      </span>
    );
  const lit = { high: 3, medium: 2, low: 1, none: 0 }[priority];
  return (
    <span className="is-bars" data-none={priority === "none" || undefined} aria-hidden="true">
      {[0, 1, 2].map((i) => (
        <i key={i} data-on={i < lit || undefined} />
      ))}
    </span>
  );
}

const STATUS_OPTIONS = STATUSES.map((s) => ({ value: s.id, label: s.label }));

interface Entry {
  key: string;
  who: string;
  from?: Status;
  to: Status;
}

interface State {
  status: Status;
  open: boolean;
  /** The option the highlight sits on while the menu is open. */
  hover: number;
  priority: Priority;
  log: readonly Entry[];
}

const START: Entry[] = [{ key: "made", who: "Ama", to: "todo" }];
const MOVED: Entry = { key: "m1", who: "You", from: "todo", to: "progress" };
const SHIPPED: Entry = { key: "m2", who: "You", from: "progress", to: "done" };

const index = (id: Status) => STATUSES.findIndex((s) => s.id === id);

const BEATS: readonly (State & { ms: number })[] = [
  { status: "todo", open: false, hover: 1, log: START, priority: "high", ms: 1300 },
  { status: "todo", open: true, hover: 1, log: START, priority: "high", ms: 650 },
  { status: "todo", open: true, hover: 2, log: START, priority: "high", ms: 600 },
  { status: "progress", open: false, hover: 2, log: [...START, MOVED], priority: "high", ms: 1700 },
  { status: "progress", open: true, hover: 2, log: [...START, MOVED], priority: "high", ms: 550 },
  { status: "progress", open: true, hover: 3, log: [...START, MOVED], priority: "high", ms: 380 },
  { status: "progress", open: true, hover: 4, log: [...START, MOVED], priority: "high", ms: 600 },
  { status: "done", open: false, hover: 4, log: [...START, MOVED, SHIPPED], priority: "high", ms: 2600 },
];

const fromBeat = (step: number): State => {
  const { ms: _, ...state } = BEATS[step]!;
  return state;
};

interface IssueStatusDemoProps {
  /** Plays and pauses the scene from outside, as the home page's card does. Leave it out to play until touched. */
  playing?: boolean;
}

export function IssueStatusDemo({ playing }: IssueStatusDemoProps = {}) {
  const scene = useScene(BEATS, fromBeat, playing);
  const { state, take } = scene;
  const counter = useRef(2);

  const choose = (next: Status) =>
    take((s) => {
      if (next === s.status) return { ...s, open: false };
      const entry = { key: `u${counter.current++}`, who: "You", from: s.status, to: next };
      return { ...s, status: next, open: false, log: [...s.log, entry].slice(-3) };
    });

  return (
    <section ref={scene.ref} className="is not-prose" aria-label="Issue">
      <header className="is-head">
        <span className="is-key">ENG-142</span>
        <img
          className="is-owner"
          src="https://api.dicebear.com/9.x/notionists/svg?seed=Ama%20Mensah&backgroundColor=e0e7ff"
          alt="Assigned to Ama Mensah"
          width={24}
          height={24}
          draggable={false}
        />
      </header>
      <h4 className="is-title">Onboarding checklist collapses into a pill when finished</h4>

      <div className="is-props">
        <Picker
          label="Status"
          heading="Change status…"
          options={STATUS_OPTIONS}
          value={state.status}
          onValueChange={choose}
          icon={(status) => <StatusIcon status={status} size={15} />}
          open={state.open}
          onOpenChange={(open) => take((s) => ({ ...s, open, hover: index(s.status) }))}
          preview={scene.live && state.open ? STATUSES[state.hover]!.id : null}
          layerClassName="is-tokens"
        />
        <Picker
          label="Priority"
          heading="Change priority…"
          options={PRIORITIES}
          value={state.priority}
          onValueChange={(priority) => take((s) => ({ ...s, priority }))}
          icon={(priority) => <PriorityIcon priority={priority} />}
          layerClassName="is-tokens"
        />
        <span className="is-chip">
          <i className="is-dot" aria-hidden="true" />
          Onboarding
        </span>
      </div>

      <ol className="is-log" aria-label="Activity">
        <AnimatePresence initial={false}>
          {state.log.map((entry) => (
            <motion.li
              key={entry.key}
              layout="position"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={SPRING}
            >
              <span className="is-log-row">
                <StatusIcon status={entry.to} size={14} />
                <span>
                  <b>{entry.who}</b>
                  {entry.from ? (
                    <>
                      {" moved this from "}
                      <b>{of(entry.from).label}</b>
                      {" to "}
                      <b>{of(entry.to).label}</b>
                    </>
                  ) : (
                    " created this issue"
                  )}
                </span>
                <time>{entry.from ? "now" : "2d"}</time>
              </span>
            </motion.li>
          ))}
        </AnimatePresence>
      </ol>
    </section>
  );
}
