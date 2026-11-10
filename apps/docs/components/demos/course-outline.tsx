"use client";

import { HugeiconsIcon, type IconSvgElement } from "@hugeicons/react";
import {
  ArrowRight01Icon,
  BookOpen01Icon,
  CheckmarkCircle01Icon,
  CircleIcon,
  HelpCircleIcon,
  Video01Icon,
} from "@hugeicons/core-free-icons";
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

type ConnectorMotion = ReturnType<typeof useConnectorMotion>;

function withToggled(ids: Set<string>, id: string) {
  const next = new Set(ids);
  if (next.has(id)) next.delete(id);
  else next.add(id);
  return next;
}

function visibleRows(open: Set<string>, done: Set<string>, show: Show) {
  const rows: Row[] = [];

  for (const courseModule of COURSE) {
    const left = courseModule.lessons.filter((lesson) => !done.has(lesson.id));
    if (show === "Remaining" && left.length === 0) continue;

    rows.push({ id: courseModule.id, parent: null, module: courseModule });
    if (!open.has(courseModule.id)) continue;

    for (const lesson of show === "Remaining" ? left : courseModule.lessons) {
      rows.push({ id: lesson.id, parent: courseModule.id, lesson });
    }
  }

  return rows;
}

function CourseHeader({ finished, total }: { finished: number; total: number }) {
  return (
    <div className="co-head">
      <div>
        <p className="co-eyebrow">Course</p>
        <h4>Product Design Foundations</h4>
      </div>
      <div className="co-progress" aria-label={`${finished} of ${total} lessons done`}>
        <span className="co-progress-count">{`${finished} of ${total} lessons`}</span>
        <span className="co-bar" aria-hidden="true">
          <span style={{ width: `${(finished / total) * 100}%` }} />
        </span>
      </div>
    </div>
  );
}

function ShowFilter({
  show,
  upNext,
  onChange,
}: {
  show: Show;
  upNext?: Lesson;
  onChange: (show: Show) => void;
}) {
  return (
    <div className="co-tools">
      <ToggleGroup
        className="co-seg"
        aria-label="Show"
        value={[show]}
        onValueChange={(values) => values[0] && onChange(values[0] as Show)}
      >
        {SHOW.map((option) => (
          <Toggle key={option} value={option}>
            {option}
          </Toggle>
        ))}
      </ToggleGroup>

      {upNext && (
        <span className="co-next">
          Up next: <span>{upNext.title}</span>
        </span>
      )}
    </div>
  );
}

function ModuleRow({
  courseModule,
  done,
  open,
  focused,
  connectorMotion,
  onToggle,
  onKeyDown,
}: {
  courseModule: Module;
  done: Set<string>;
  open: boolean;
  focused: boolean;
  connectorMotion: ConnectorMotion;
  onToggle: () => void;
  onKeyDown: (event: KeyboardEvent) => void;
}) {
  const count = courseModule.lessons.filter((lesson) => done.has(lesson.id)).length;
  const minutes = courseModule.lessons.reduce((total, lesson) => total + lesson.minutes, 0);

  return (
    <motion.button
      layout
      {...connectorMotion}
      transition={LAYOUT_SPRING}
      type="button"
      role="treeitem"
      aria-level={1}
      aria-expanded={open}
      data-co-row={courseModule.id}
      tabIndex={focused ? 0 : -1}
      className="co-module"
      onClick={onToggle}
      onKeyDown={onKeyDown}
    >
      <span className="co-chevron" aria-hidden="true">
        <HugeiconsIcon
          icon={ArrowRight01Icon}
          strokeWidth={2}
          aria-hidden="true"
          data-open={open ? "" : undefined}
        />
      </span>
      <span
        className="co-number"
        data-rm-anchor={courseModule.id}
        data-complete={count === courseModule.lessons.length || undefined}
      >
        {COURSE.indexOf(courseModule) + 1}
      </span>
      <span className="co-title">{courseModule.title}</span>
      <span className="co-meta">{`${count}/${courseModule.lessons.length} · ${minutes} min`}</span>
    </motion.button>
  );
}

function LessonRow({
  lesson,
  parent,
  done,
  next,
  focused,
  connectorMotion,
  onToggle,
  onKeyDown,
}: {
  lesson: Lesson;
  parent: string;
  done: boolean;
  next: boolean;
  focused: boolean;
  connectorMotion: ConnectorMotion;
  onToggle: () => void;
  onKeyDown: (event: KeyboardEvent) => void;
}) {
  const KindIcon = KIND_ICONS[lesson.kind];

  return (
    <motion.div
      layout
      {...connectorMotion}
      transition={LAYOUT_SPRING}
      role="treeitem"
      aria-level={2}
      aria-selected={focused}
      className={`co-lesson${next ? " next" : ""}`}
    >
      <button
        type="button"
        className="co-tick"
        data-co-row={lesson.id}
        tabIndex={focused ? 0 : -1}
        aria-label={done ? `Mark "${lesson.title}" not done` : `Mark "${lesson.title}" done`}
        aria-pressed={done}
        data-rm-anchor={lesson.id}
        data-rm-link={parent}
        onClick={onToggle}
        onKeyDown={onKeyDown}
      >
        <Remold.Icon
          icon={<HugeiconsIcon icon={done ? CheckmarkCircle01Icon : CircleIcon} />}
          strokeWidth={1.8}
          aria-hidden="true"
        />
      </button>
      <span className="co-lesson-title">{lesson.title}</span>
      <span className="co-kind" aria-label={lesson.kind}>
        <HugeiconsIcon icon={KindIcon} aria-hidden="true" />
      </span>
      <span className="co-minutes">{lesson.minutes} min</span>
    </motion.div>
  );
}

export function CourseOutlineDemo({ scene }: { scene?: number } = {}) {
  const connectorRoot = useRef<HTMLDivElement>(null);
  const connectorMotion = useConnectorMotion(connectorRoot);
  const [open, setOpen] = useState<Set<string>>(() => new Set(["research", "interface"]));
  const [done, setDone] = useState<Set<string>>(() => new Set(["welcome", "how", "setup", "users", "jobs"]));
  const [show, setShow] = useState<Show>("All");
  const [focus, setFocus] = useState("synthesis");

  useEffect(() => {
    if (scene === undefined) return;
    const preset = SCENES[scene % SCENES.length]!;
    setOpen(new Set(preset.open));
    setDone(new Set(preset.done));
    setShow(preset.show);
  }, [scene]);

  const lessons = COURSE.flatMap((courseModule) => courseModule.lessons);
  const upNext = lessons.find((lesson) => !done.has(lesson.id));
  const finished = lessons.filter((lesson) => done.has(lesson.id)).length;
  const rows = useMemo(() => visibleRows(open, done, show), [open, done, show]);

  const toggleOpen = (id: string) => setOpen((current) => withToggled(current, id));
  const toggleDone = (id: string) => setDone((current) => withToggled(current, id));

  const moveFocus = (id: string) => {
    setFocus(id);
    requestAnimationFrame(() =>
      document.querySelector<HTMLElement>(`[data-co-row="${CSS.escape(id)}"]`)?.focus(),
    );
  };

  const onKey = (event: KeyboardEvent, row: Row) => {
    const index = rows.findIndex((candidate) => candidate.id === row.id);

    if (event.key === "ArrowDown" && rows[index + 1]) moveFocus(rows[index + 1]!.id);
    else if (event.key === "ArrowUp" && rows[index - 1]) moveFocus(rows[index - 1]!.id);
    else if (event.key === "ArrowRight" && row.module && !open.has(row.id)) toggleOpen(row.id);
    else if (event.key === "ArrowLeft" && row.module && open.has(row.id)) toggleOpen(row.id);
    else if (event.key === "ArrowLeft" && row.parent) moveFocus(row.parent);
    else return;

    event.preventDefault();
  };

  return (
    <div className="co not-prose">
      <CourseHeader finished={finished} total={lessons.length} />
      <ShowFilter show={show} upNext={upNext} onChange={setShow} />

      <Remold.Connectors ref={connectorRoot} className="co-lines" radius={10} gap={3}>
        <motion.div
          layout
          {...connectorMotion}
          transition={LAYOUT_SPRING}
          role="tree"
          aria-label="Course outline"
          className="co-tree"
        >
          {rows.map((row) =>
            row.module ? (
              <ModuleRow
                key={row.id}
                courseModule={row.module}
                done={done}
                open={open.has(row.id)}
                focused={focus === row.id}
                connectorMotion={connectorMotion}
                onToggle={() => {
                  setFocus(row.id);
                  toggleOpen(row.id);
                }}
                onKeyDown={(event) => onKey(event, row)}
              />
            ) : (
              <LessonRow
                key={row.id}
                lesson={row.lesson!}
                parent={row.parent!}
                done={done.has(row.id)}
                next={upNext?.id === row.id}
                focused={focus === row.id}
                connectorMotion={connectorMotion}
                onToggle={() => {
                  setFocus(row.id);
                  toggleDone(row.id);
                }}
                onKeyDown={(event) => onKey(event, row)}
              />
            ),
          )}
        </motion.div>
      </Remold.Connectors>
    </div>
  );
}
