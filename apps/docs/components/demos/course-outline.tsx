"use client";
/**
 * A course outline whose lines stay attached. Open and close modules, tick lessons off, and show
 * only what's left: `Remold.Layout` moves every lesson to its new place,
 * `Remold.Connectors` keeps each module's line joined to its lessons the whole way, and
 * `Remold.Text` and `Remold.Icon` update progress and ticks in place.
 *
 * The course and its lessons are made up.
 */
import { Remold } from "@remold-ui/react";
import { useEffect, useMemo, useState, type KeyboardEvent } from "react";
import "./course-outline.css";

type Kind = "video" | "reading" | "quiz";

interface Lesson {
  id: string;
  title: string;
  kind: Kind;
  minutes: number;
}

interface Module {
  id: string;
  title: string;
  lessons: Lesson[];
}

const L = (id: string, title: string, kind: Kind, minutes: number): Lesson => ({ id, title, kind, minutes });

const COURSE: Module[] = [
  {
    id: "start",
    title: "Getting started",
    lessons: [
      L("welcome", "Welcome", "video", 3),
      L("how", "How this course works", "reading", 4),
      L("setup", "Set up your tools", "video", 8),
    ],
  },
  {
    id: "research",
    title: "Research",
    lessons: [
      L("users", "Talking to users", "video", 12),
      L("jobs", "Jobs to be done", "reading", 10),
      L("synthesis", "Making sense of notes", "video", 14),
      L("quiz-1", "Check your understanding", "quiz", 5),
    ],
  },
  {
    id: "interface",
    title: "Interface",
    lessons: [
      L("grids", "Layout and grids", "video", 11),
      L("type", "Type that reads well", "video", 9),
      L("colour", "Colour with purpose", "reading", 13),
      L("motion", "Motion basics", "video", 7),
    ],
  },
  {
    id: "ship",
    title: "Ship it",
    lessons: [
      L("handoff", "Handing off to engineers", "reading", 8),
      L("measure", "Measuring what changed", "video", 10),
      L("quiz-2", "Final quiz", "quiz", 6),
    ],
  },
];

const SHOW = ["All", "Remaining"] as const;
type Show = (typeof SHOW)[number];

const CHEVRON_RIGHT = "M10 7l5 5-5 5";
const CHEVRON_DOWN = "M7 10l5 5 5-5";
const CIRCLE = "M12 4a8 8 0 1 1 0 16a8 8 0 1 1 0-16Z";
const TICK = "M12 4a8 8 0 1 1 0 16a8 8 0 1 1 0-16ZM8.3 12.3l2.6 2.6 4.9-5.4";
const KIND_ICON: Record<Kind, string> = {
  video: "M5 6.5h10a1.5 1.5 0 0 1 1.5 1.5v8a1.5 1.5 0 0 1-1.5 1.5H5A1.5 1.5 0 0 1 3.5 16V8A1.5 1.5 0 0 1 5 6.5ZM16.5 10.5l4-2.5v8l-4-2.5",
  reading: "M4 5.5h6a2 2 0 0 1 2 2v11a1.5 1.5 0 0 0-1.5-1.5H4ZM20 5.5h-6a2 2 0 0 0-2 2v11a1.5 1.5 0 0 1 1.5-1.5H20Z",
  quiz: "M12 3.5a8.5 8.5 0 1 1 0 17a8.5 8.5 0 1 1 0-17ZM9.6 9.5a2.5 2.5 0 1 1 3.4 2.3c-.6.3-1 .8-1 1.5v.4M12 16.6v.01",
};

interface Row {
  id: string;
  parent: string | null;
  module?: Module;
  lesson?: Lesson;
}

/** Moments a page can step the outline through: open, two more lessons ticked, only what's left, all closed. */
const SCENES: { open: string[]; done: string[]; show: Show }[] = [
  { open: ["research", "interface"], done: ["welcome", "how", "setup", "users", "jobs"], show: "All" },
  { open: ["research", "interface"], done: ["welcome", "how", "setup", "users", "jobs", "synthesis", "quiz-1"], show: "All" },
  { open: ["research", "interface"], done: ["welcome", "how", "setup", "users", "jobs", "synthesis", "quiz-1"], show: "Remaining" },
  { open: [], done: ["welcome", "how", "setup", "users", "jobs", "synthesis", "quiz-1"], show: "All" },
];

/**
 * `scene` steps the outline from outside (0 to 3, see `SCENES`); each new value sets which modules
 * are open, what's done and what's shown. Leave it out and the outline is only driven by its own controls.
 */
export function CourseOutlineDemo({ scene }: { scene?: number } = {}) {
  const [open, setOpen] = useState<Set<string>>(() => new Set(["research", "interface"]));
  const [done, setDone] = useState<Set<string>>(() => new Set(["welcome", "how", "setup", "users", "jobs"]));
  const [show, setShow] = useState<Show>("All");
  useEffect(() => {
    if (scene === undefined) return;
    const s = SCENES[scene % SCENES.length]!;
    setOpen(new Set(s.open));
    setDone(new Set(s.done));
    setShow(s.show);
  }, [scene]);
  const [focus, setFocus] = useState("synthesis");

  const lessons = COURSE.flatMap((m) => m.lessons);
  const next = lessons.find((l) => !done.has(l.id));
  const rows = useMemo(() => {
    const out: Row[] = [];
    for (const module of COURSE) {
      const left = module.lessons.filter((l) => !done.has(l.id));
      // Showing what's left hides finished modules entirely.
      if (show === "Remaining" && left.length === 0) continue;
      out.push({ id: module.id, parent: null, module });
      if (!open.has(module.id)) continue;
      for (const lesson of show === "Remaining" ? left : module.lessons) out.push({ id: lesson.id, parent: module.id, lesson });
    }
    return out;
  }, [open, done, show]);

  const toggle = (set: (f: (s: Set<string>) => Set<string>) => void, id: string) =>
    set((s) => {
      const nextSet = new Set(s);
      if (nextSet.has(id)) nextSet.delete(id);
      else nextSet.add(id);
      return nextSet;
    });

  // Arrow keys move through the rows; right and left open and close modules.
  const onKey = (e: KeyboardEvent, row: Row) => {
    const i = rows.findIndex((r) => r.id === row.id);
    const move = (id: string) => {
      setFocus(id);
      requestAnimationFrame(() => document.querySelector<HTMLElement>(`[data-co-row="${CSS.escape(id)}"]`)?.focus());
    };
    if (e.key === "ArrowDown" && rows[i + 1]) move(rows[i + 1]!.id);
    else if (e.key === "ArrowUp" && rows[i - 1]) move(rows[i - 1]!.id);
    else if (e.key === "ArrowRight" && row.module && !open.has(row.id)) toggle(setOpen, row.id);
    else if (e.key === "ArrowLeft" && row.module && open.has(row.id)) toggle(setOpen, row.id);
    else if (e.key === "ArrowLeft" && row.parent) move(row.parent);
    else return;
    e.preventDefault();
  };

  const finished = lessons.filter((l) => done.has(l.id)).length;
  return (
    <div className="co not-prose">
      <div className="co-head">
        <div>
          <p className="co-eyebrow">Course</p>
          <h4>Product Design Foundations</h4>
        </div>
        <div className="co-progress" aria-label={`${finished} of ${lessons.length} lessons done`}>
          <Remold.Text className="co-progress-count">{`${finished} of ${lessons.length} lessons`}</Remold.Text>
          <span className="co-bar" aria-hidden="true">
            <span style={{ width: `${(finished / lessons.length) * 100}%` }} />
          </span>
        </div>
      </div>
      <div className="co-tools">
        <div className="co-seg" role="group" aria-label="Show">
          {SHOW.map((s) => (
            <button key={s} type="button" aria-pressed={show === s} onClick={() => setShow(s)}>
              {s}
            </button>
          ))}
        </div>
        {next && (
          <span className="co-next">
            Up next: <Remold.Text>{next.title}</Remold.Text>
          </span>
        )}
      </div>

      <Remold.Connectors className="co-lines" radius={10} gap={3}>
        <Remold.Layout trigger={`${rows.map((r) => r.id).join("|")}`} role="tree" aria-label="Course outline" className="co-tree">
          {rows.map((row) => {
            if (row.module) {
              const m = row.module;
              const count = m.lessons.filter((l) => done.has(l.id)).length;
              const isOpen = open.has(m.id);
              const minutes = m.lessons.reduce((n, l) => n + l.minutes, 0);
              return (
                <button
                  key={m.id}
                  type="button"
                  role="treeitem"
                  aria-level={1}
                  aria-expanded={isOpen}
                  data-co-row={m.id}
                  tabIndex={focus === m.id ? 0 : -1}
                  className="co-module"
                  onClick={() => {
                    setFocus(m.id);
                    toggle(setOpen, m.id);
                  }}
                  onKeyDown={(e) => onKey(e, row)}
                >
                  <span className="co-chevron" aria-hidden="true">
                    <Remold.Icon
                      d={isOpen ? CHEVRON_DOWN : CHEVRON_RIGHT}
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth={2}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </span>
                  <span className="co-number" data-rm-anchor={m.id} data-complete={count === m.lessons.length || undefined}>
                    {COURSE.indexOf(m) + 1}
                  </span>
                  <span className="co-title">{m.title}</span>
                  <Remold.Text className="co-meta">{`${count}/${m.lessons.length} · ${minutes} min`}</Remold.Text>
                </button>
              );
            }
            const l = row.lesson!;
            const isDone = done.has(l.id);
            return (
              <div
                key={l.id}
                role="treeitem"
                aria-level={2}
                aria-selected={focus === l.id}
                className={`co-lesson${next?.id === l.id ? " next" : ""}`}
              >
                <button
                  type="button"
                  className="co-tick"
                  data-co-row={l.id}
                  tabIndex={focus === l.id ? 0 : -1}
                  aria-label={isDone ? `Mark "${l.title}" not done` : `Mark "${l.title}" done`}
                  aria-pressed={isDone}
                  data-rm-anchor={l.id}
                  data-rm-link={row.parent!}
                  onClick={() => {
                    setFocus(l.id);
                    toggle(setDone, l.id);
                  }}
                  onKeyDown={(e) => onKey(e, row)}
                >
                  <Remold.Icon
                    d={isDone ? TICK : CIRCLE}
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={1.8}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </button>
                <span className="co-lesson-title">{l.title}</span>
                <span className="co-kind" aria-label={l.kind}>
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <path d={KIND_ICON[l.kind]} />
                  </svg>
                </span>
                <span className="co-minutes">{l.minutes} min</span>
              </div>
            );
          })}
        </Remold.Layout>
      </Remold.Connectors>
    </div>
  );
}
