"use client";

import { HugeiconsIcon, type IconSvgElement } from "@hugeicons/react";
import { ArrowRight01Icon, BookOpen01Icon, CheckmarkCircle01Icon, CircleIcon, HelpCircleIcon, Video01Icon } from "@hugeicons/core-free-icons";
import { Remold, useConnectorMotion } from "@remold-ui/react";
import { Toggle } from "@base-ui/react/toggle";
import { ToggleGroup } from "@base-ui/react/toggle-group";
import { motion } from "motion/react";
import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from "react";
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

const L = (id: string, title: string, kind: Kind, minutes: number): Lesson => ({
  id,
  title,
  kind,
  minutes,
});

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

const KIND_ICONS: Record<Kind, IconSvgElement> = {
  video: Video01Icon,
  reading: BookOpen01Icon,
  quiz: HelpCircleIcon,
};

interface Row {
  id: string;
  parent: string | null;
  module?: Module;
  lesson?: Lesson;
}

const SCENES: { open: string[]; done: string[]; show: Show }[] = [
  {
    open: ["research", "interface"],
    done: ["welcome", "how", "setup", "users", "jobs"],
    show: "All",
  },
  {
    open: ["research", "interface"],
    done: ["welcome", "how", "setup", "users", "jobs", "synthesis", "quiz-1"],
    show: "All",
  },
  {
    open: ["research", "interface"],
    done: ["welcome", "how", "setup", "users", "jobs", "synthesis", "quiz-1"],
    show: "Remaining",
  },
  {
    open: [],
    done: ["welcome", "how", "setup", "users", "jobs", "synthesis", "quiz-1"],
    show: "All",
  },
];

const LAYOUT_SPRING = { type: "spring" as const, duration: 0.32, bounce: 0.08 };

export function CourseOutlineDemo({ scene }: { scene?: number } = {}) {
  const connectorRoot = useRef<HTMLDivElement>(null);
  const connectorMotion = useConnectorMotion(connectorRoot);
  const [open, setOpen] = useState<Set<string>>(
    () => new Set(["research", "interface"]),
  );
  const [done, setDone] = useState<Set<string>>(
    () => new Set(["welcome", "how", "setup", "users", "jobs"]),
  );
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

      if (show === "Remaining" && left.length === 0) continue;
      out.push({ id: module.id, parent: null, module });
      if (!open.has(module.id)) continue;
      for (const lesson of show === "Remaining" ? left : module.lessons)
        out.push({ id: lesson.id, parent: module.id, lesson });
    }
    return out;
  }, [open, done, show]);

  const toggle = (
    set: (f: (s: Set<string>) => Set<string>) => void,
    id: string,
  ) =>
    set((current) => {
      const nextSet = new Set(current);
      if (nextSet.has(id)) nextSet.delete(id);
      else nextSet.add(id);
      return nextSet;
    });

  const onKey = (event: KeyboardEvent, row: Row) => {
    const i = rows.findIndex((r) => r.id === row.id);
    const move = (id: string) => {
      setFocus(id);
      requestAnimationFrame(
        () =>
          document
            .querySelector<HTMLElement>(`[data-co-row="${CSS.escape(id)}"]`)
            ?.focus(),
      );
    };
    if (event.key === "ArrowDown" && rows[i + 1]) move(rows[i + 1]!.id);
    else if (event.key === "ArrowUp" && rows[i - 1]) move(rows[i - 1]!.id);
    else if (event.key === "ArrowRight" && row.module && !open.has(row.id))
      toggle(setOpen, row.id);
    else if (event.key === "ArrowLeft" && row.module && open.has(row.id))
      toggle(setOpen, row.id);
    else if (event.key === "ArrowLeft" && row.parent) move(row.parent);
    else return;
    event.preventDefault();
  };

  const finished = lessons.filter((l) => done.has(l.id)).length;
  return (
    <div className="co not-prose">
      <div className="co-head">
        <div>
          <p className="co-eyebrow">Course</p>
          <h4>Product Design Foundations</h4>
        </div>
        <div
          className="co-progress"
          aria-label={`${finished} of ${lessons.length} lessons done`}
        >
          <span className="co-progress-count">{`${finished} of ${lessons.length} lessons`}</span>
          <span className="co-bar" aria-hidden="true">
            <span style={{ width: `${(finished / lessons.length) * 100}%` }} />
          </span>
        </div>
      </div>
      <div className="co-tools">
        <ToggleGroup
          className="co-seg"
          aria-label="Show"
          value={[show]}
          onValueChange={(values) => {
            const next = values[0] as Show | undefined;
            if (next) setShow(next);
          }}
        >
          {SHOW.map((option) => (
            <Toggle
              key={option}
              value={option}
            >
              {option}
            </Toggle>
          ))}
        </ToggleGroup>
        {next && (
          <span className="co-next">
            Up next: <span>{next.title}</span>
          </span>
        )}
      </div>

      <Remold.Connectors ref={connectorRoot} className="co-lines" radius={10} gap={3}>
        <motion.div
          layout
          {...connectorMotion}
          transition={LAYOUT_SPRING}
          role="tree"
          aria-label="Course outline"
          className="co-tree"
        >
          {rows.map((row) => {
            if (row.module) {
              const m = row.module;
              const count = m.lessons.filter((l) => done.has(l.id)).length;
              const isOpen = open.has(m.id);
              const minutes = m.lessons.reduce((n, l) => n + l.minutes, 0);
              return (
                <motion.button
                  layout
                  {...connectorMotion}
                  transition={LAYOUT_SPRING}
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
                  onKeyDown={(event) => onKey(event, row)}
                >
                  <span className="co-chevron" aria-hidden="true">
                    <HugeiconsIcon icon={ArrowRight01Icon} strokeWidth={2} aria-hidden="true" data-open={isOpen ? "" : undefined} />
                  </span>
                  <span
                    className="co-number"
                    data-rm-anchor={m.id}
                    data-complete={count === m.lessons.length || undefined}
                  >
                    {COURSE.indexOf(m) + 1}
                  </span>
                  <span className="co-title">{m.title}</span>
                  <span className="co-meta">{`${count}/${m.lessons.length} · ${minutes} min`}</span>
                </motion.button>
              );
            }
            const l = row.lesson!;
            const isDone = done.has(l.id);
            const KindIcon = KIND_ICONS[l.kind];
            return (
              <motion.div
                layout
                {...connectorMotion}
                transition={LAYOUT_SPRING}
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
                  aria-label={
                    isDone
                      ? `Mark "${l.title}" not done`
                      : `Mark "${l.title}" done`
                  }
                  aria-pressed={isDone}
                  data-rm-anchor={l.id}
                  data-rm-link={row.parent!}
                  onClick={() => {
                    setFocus(l.id);
                    toggle(setDone, l.id);
                  }}
                  onKeyDown={(event) => onKey(event, row)}
                >
                  <Remold.Icon
                    icon={<HugeiconsIcon icon={isDone ? CheckmarkCircle01Icon : CircleIcon} />}
                    strokeWidth={1.8}
                    aria-hidden="true"
                  />
                </button>
                <span className="co-lesson-title">{l.title}</span>
                <span className="co-kind" aria-label={l.kind}>
                  <HugeiconsIcon icon={KindIcon} aria-hidden="true" />
                </span>
                <span className="co-minutes">{l.minutes} min</span>
              </motion.div>
            );
          })}
        </motion.div>
      </Remold.Connectors>
    </div>
  );
}
