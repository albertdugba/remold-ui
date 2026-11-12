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

const BUTTON =
  "cursor-pointer border-0 bg-transparent p-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--co-ink)";
const ROW =
  "grid min-h-[38px] items-center gap-2.5 rounded-lg px-2.5 text-left hover:bg-(--co-subtle) @max-[620px]:gap-2 @max-[620px]:px-2";

function CourseHeader({ finished, total }: { finished: number; total: number }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-x-5 gap-y-3 px-[18px] pt-4 pb-3 @max-[620px]:items-start @max-[620px]:px-3.5 @max-[620px]:pt-3.5 @max-[620px]:pb-2.5 @max-[420px]:block">
      <div>
        <p className="m-0 text-[12px] text-(--co-muted)">Course</p>
        <h4 className="m-0 mt-0.5 text-[17px] font-semibold tracking-[-0.01em]">Product Design Foundations</h4>
      </div>
      <div
        className="grid min-w-[180px] justify-items-end gap-1.5 @max-[620px]:w-[140px] @max-[620px]:min-w-0 @max-[420px]:hidden"
        aria-label={`${finished} of ${total} lessons done`}
      >
        <span className="text-[12.5px] text-(--co-muted) tabular-nums">{`${finished} of ${total} lessons`}</span>
        <span
          className="block h-1 w-[180px] overflow-hidden rounded-[2px] bg-(--co-subtle) @max-[620px]:w-[140px] @max-[620px]:min-w-0"
          aria-hidden="true"
        >
          <span
            className="block h-full rounded-[inherit] bg-(--co-ink) transition-[width] duration-500 ease-[cubic-bezier(0.2,0.9,0.3,1)] motion-reduce:transition-none"
            style={{ width: `${(finished / total) * 100}%` }}
          />
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
    <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-b border-solid border-(--co-border) px-[18px] pb-3 @max-[620px]:px-3.5 @max-[620px]:pb-2.5">
      <ToggleGroup
        className="inline-flex rounded-lg border border-solid border-(--co-border) p-0.5"
        aria-label="Show"
        value={[show]}
        onValueChange={(values) => values[0] && onChange(values[0] as Show)}
      >
        {SHOW.map((option) => (
          <Toggle
            key={option}
            value={option}
            className={`${BUTTON} rounded-md px-2.5 py-[3px] text-[12.5px] text-(--co-muted) data-pressed:bg-(--co-subtle) data-pressed:font-medium data-pressed:text-(--co-text)`}
          >
            {option}
          </Toggle>
        ))}
      </ToggleGroup>

      {upNext && (
        <span className="text-[12.5px] text-(--co-muted) @max-[420px]:hidden">
          Up next: <span className="font-medium text-(--co-text)">{upNext.title}</span>
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
      className={`${BUTTON} ${ROW} mt-1 grid-cols-[14px_24px_minmax(0,1fr)_auto] text-[14px] font-semibold @max-[420px]:grid-cols-[14px_24px_minmax(0,1fr)]`}
      onClick={onToggle}
      onKeyDown={onKeyDown}
    >
      <span
        className="grid place-items-center text-(--co-faint) [&_svg]:size-3.5 [&_svg]:transition-[rotate] [&_svg]:duration-200 [&_svg]:ease-out [&_svg[data-open]]:rotate-90"
        aria-hidden="true"
      >
        <HugeiconsIcon
          icon={ArrowRight01Icon}
          strokeWidth={2}
          aria-hidden="true"
          data-open={open ? "" : undefined}
        />
      </span>
      <span
        className="grid size-6 place-items-center rounded-[7px] border border-solid border-(--co-border) text-[12px] font-semibold text-(--co-muted) data-complete:border-(--co-ink) data-complete:bg-(--co-ink) data-complete:text-white"
        data-rm-anchor={courseModule.id}
        data-complete={count === courseModule.lessons.length || undefined}
      >
        {COURSE.indexOf(courseModule) + 1}
      </span>
      <span>{courseModule.title}</span>
      <span className="text-[12px] font-normal text-(--co-muted) tabular-nums @max-[420px]:hidden">{`${count}/${courseModule.lessons.length} · ${minutes} min`}</span>
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
      data-next={next || undefined}
      className={`group/lesson ${ROW} ml-[52px] grid-cols-[22px_minmax(0,1fr)_18px_52px] text-[13.5px] data-next:bg-(--co-subtle) @max-[620px]:grid-cols-[22px_minmax(0,1fr)_max-content] @max-[420px]:ml-12`}
    >
      <button
        type="button"
        className={`${BUTTON} grid size-[22px] place-items-center rounded-full text-(--co-faint) aria-pressed:text-(--co-done) [&_svg]:size-5`}
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
      <span className="truncate group-data-next/lesson:font-semibold [[aria-pressed=true]+&]:text-(--co-muted)">
        {lesson.title}
      </span>
      <span
        className="grid place-items-center text-(--co-faint) @max-[620px]:hidden [&_svg]:size-4 [&_svg]:fill-none [&_svg]:stroke-current [&_svg]:[stroke-linecap:round] [&_svg]:[stroke-linejoin:round] [&_svg]:[stroke-width:1.6]"
        aria-label={lesson.kind}
      >
        <HugeiconsIcon icon={KindIcon} aria-hidden="true" />
      </span>
      <span className="text-right text-[12px] text-(--co-muted) tabular-nums">{lesson.minutes} min</span>
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
    <div className="co not-prose @container my-6 w-full overflow-hidden rounded-[14px] border border-solid border-(--co-border) bg-white font-sans text-(--co-text) [--co-border:#e7e7ea] [--co-done:#16a34a] [--co-faint:#a1a1aa] [--co-ink:#18181b] [--co-muted:#71717a] [--co-subtle:#f6f6f7] [--co-text:#18181b]">
      <CourseHeader finished={finished} total={lessons.length} />
      <ShowFilter show={show} upNext={upNext} onChange={setShow} />

      <Remold.Connectors ref={connectorRoot} className="min-h-[470px] px-2 pt-2 pb-3 @max-[620px]:px-1 [&_.rm-connector]:stroke-[#dcdce0] [&_.rm-connector]:[stroke-width:1.4]" radius={10} gap={3}>
        <motion.div
          layout
          {...connectorMotion}
          transition={LAYOUT_SPRING}
          role="tree"
          aria-label="Course outline"
          className="grid"
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
