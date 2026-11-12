"use client";
import { HugeiconsIcon, type IconSvgElement } from "@hugeicons/react";
import {
  Cancel01Icon,
  Delete02Icon,
  FileAttachmentIcon,
  FileSpreadsheetIcon,
  Image01Icon,
  MinusSignIcon,
  CheckIcon,
} from "@hugeicons/core-free-icons";
import { Checkbox } from "@base-ui/react/checkbox";
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  useReactTable,
  type RowSelectionState,
  type Table,
  type Updater,
} from "@tanstack/react-table";
import { AnimatePresence, motion } from "motion/react";
import {
  useEffect,
  useMemo,
  useRef,
  type CSSProperties,
  type MouseEvent,
  type Ref,
} from "react";
import {
  useControllableState,
  type ChangeDetails,
} from "./use-controllable-state";
import { useScene } from "./use-scene";

interface File {
  id: string;
  name: string;
  size: string;
  edited: string;
  icon: IconSvgElement;
  color: string;
}

const FILES: File[] = [
  {
    id: "a",
    name: "Q3 board deck.pdf",
    size: "4.2 MB",
    edited: "Oct 24",
    icon: FileAttachmentIcon,
    color: "#ef4444",
  },
  {
    id: "b",
    name: "Hero shot final.png",
    size: "2.8 MB",
    edited: "Oct 22",
    icon: Image01Icon,
    color: "#8b5cf6",
  },
  {
    id: "c",
    name: "Pricing model.xlsx",
    size: "640 KB",
    edited: "Oct 21",
    icon: FileSpreadsheetIcon,
    color: "#10b981",
  },
  {
    id: "d",
    name: "Launch plan.pdf",
    size: "1.1 MB",
    edited: "Oct 18",
    icon: FileAttachmentIcon,
    color: "#ef4444",
  },
  {
    id: "e",
    name: "Team photo.png",
    size: "5.6 MB",
    edited: "Oct 12",
    icon: Image01Icon,
    color: "#8b5cf6",
  },
  {
    id: "f",
    name: "Invoices 2026.xlsx",
    size: "320 KB",
    edited: "Oct 3",
    icon: FileSpreadsheetIcon,
    color: "#10b981",
  },
];

export interface BulkSelectValue {
  gone: string[];
  selected: string[];
  anchor: string | null;
  undo: string[] | null;
}

const REST: BulkSelectValue = {
  gone: [],
  selected: [],
  anchor: null,
  undo: null,
};

const SPRING = { type: "spring" as const, duration: 0.45, bounce: 0.18 };

const PALETTE = [
  "[--bk-surface:#ffffff] [--bk-ink:#18181b] [--bk-muted:#71717a] [--bk-quiet:#a1a1aa] [--bk-line:rgb(24_24_27/0.07)] [--bk-hover:rgb(24_24_27/0.035)]",
  "[--bk-accent:#4f46e5] [--bk-band:rgb(79_70_229/0.07)] [--bk-box:rgb(24_24_27/0.22)]",
  "[--bk-bar:#18181b] [--bk-bar-ink:#fafafa] [--bk-bar-muted:#a1a1aa] [--bk-bar-hover:rgb(255_255_255/0.09)] [--bk-danger:#f87171]",
  "dark:[--bk-surface:#1f1f23] dark:[--bk-ink:#fafafa] dark:[--bk-muted:#a1a1aa] dark:[--bk-quiet:#71717a] dark:[--bk-line:rgb(255_255_255/0.07)] dark:[--bk-hover:rgb(255_255_255/0.04)]",
  "dark:[--bk-accent:#818cf8] dark:[--bk-band:rgb(129_140_248/0.12)] dark:[--bk-box:rgb(255_255_255/0.25)]",
  "dark:[--bk-bar:#fafafa] dark:[--bk-bar-ink:#18181b] dark:[--bk-bar-muted:#71717a] dark:[--bk-bar-hover:rgb(0_0_0/0.06)] dark:[--bk-danger:#dc2626]",
].join(" ");

const GRID = "grid grid-cols-[16px_minmax(0,1fr)_62px_52px] items-center gap-3 px-2.5";
const CELL = "flex min-w-0 items-center";
const FIGURE = "ml-auto text-right text-[12px] whitespace-nowrap text-(--bk-muted) tabular-nums";
const CHECK =
  "grid size-4 cursor-pointer place-items-center rounded-[5px] border-0 bg-transparent p-0 text-white shadow-[inset_0_0_0_1.5px_var(--bk-box)] transition-[background-color,box-shadow] duration-150 group-hover/inner:not-data-checked:not-data-indeterminate:shadow-[inset_0_0_0_1.5px_color-mix(in_oklab,var(--bk-ink)_45%,transparent)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--bk-accent) data-checked:bg-(--bk-accent) data-checked:shadow-none data-indeterminate:bg-(--bk-accent) data-indeterminate:shadow-none";
const TICK =
  "grid place-items-center [transition:scale_0.18s_cubic-bezier(0.3,1.5,0.5,1),opacity_0.12s] data-ending-style:scale-50 data-ending-style:opacity-0 data-starting-style:scale-50 data-starting-style:opacity-0 [&_svg]:size-[11px] [&_svg]:[stroke-width:3.2]";
const BAR_BUTTON =
  "inline-flex h-[34px] flex-none cursor-pointer items-center justify-center gap-1.5 rounded-[9px] border-0 bg-transparent text-[13px] font-medium transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-(--bk-accent) [&_svg]:size-4";
const BAR_ROW_CLASS = "flex h-full items-center gap-0.5 px-1.5 [grid-area:1/1]";
const COUNT = "inline-flex items-center gap-[5px] pr-1.5 pl-0.5 text-[13px] whitespace-nowrap text-(--bk-bar-muted)";

const column = createColumnHelper<File>();

const DATA_COLUMNS = [
  column.accessor("name", {
    header: ({ table }) => (
      <span className="text-[13px] font-semibold text-(--bk-ink)">
        Files <span className="ml-1 font-medium text-(--bk-quiet) tabular-nums">{table.getRowCount()}</span>
      </span>
    ),
    cell: ({ row }) => {
      const Icon = row.original.icon;
      return (
        <span className="flex min-w-0 items-center gap-2.5 text-[13.5px]">
          <span
            className="grid size-[26px] flex-none place-items-center rounded-[7px] bg-[color-mix(in_oklab,var(--tint)_13%,transparent)] text-(--tint)"
            style={{ "--tint": row.original.color } as CSSProperties}
          >
            <HugeiconsIcon icon={Icon} strokeWidth={2} className="size-3.5" aria-hidden="true" />
          </span>
          <span className="truncate">{row.original.name}</span>
        </span>
      );
    },
  }),
  column.accessor("size", {
    header: () => <span className="ml-auto text-right">Size</span>,
    cell: (info) => <span className={FIGURE}>{info.getValue()}</span>,
  }),
  column.accessor("edited", {
    header: () => <span className="ml-auto text-right">Edited</span>,
    cell: (info) => <span className={FIGURE}>{info.getValue()}</span>,
  }),
];

export interface BulkSelectProps {
  value?: BulkSelectValue;
  defaultValue?: BulkSelectValue;
  onValueChange?: (value: BulkSelectValue, details: ChangeDetails) => void;
  ref?: Ref<HTMLElement>;
}

const BAR_ROW = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -8 },
  transition: { duration: 0.18 },
};

function SelectAllCheckbox({ table }: { table: Table<File> }) {
  return (
    <Checkbox.Root
      className={CHECK}
      checked={table.getIsAllRowsSelected()}
      indeterminate={table.getIsSomeRowsSelected()}
      onCheckedChange={(on) => table.toggleAllRowsSelected(on)}
      aria-label="Select all files"
    >
      <Checkbox.Indicator
        className={TICK}
        render={(props, state) => (
          <span {...props}>
            <HugeiconsIcon
              icon={state.indeterminate ? MinusSignIcon : CheckIcon}
              aria-hidden="true"
            />
          </span>
        )}
      />
    </Checkbox.Root>
  );
}

function RowCheckbox({
  name,
  checked,
  onChange,
}: {
  name: string;
  checked: boolean;
  onChange: (on: boolean) => void;
}) {
  return (
    <Checkbox.Root
      className={CHECK}
      checked={checked}
      onCheckedChange={onChange}
      aria-label={`Select ${name}`}
    >
      <Checkbox.Indicator className={TICK}>
        <HugeiconsIcon icon={CheckIcon} aria-hidden="true" />
      </Checkbox.Indicator>
    </Checkbox.Root>
  );
}

function RollingCount({ count }: { count: number }) {
  return (
    <span className="relative grid h-[18px] overflow-hidden leading-[18px] font-semibold text-(--bk-bar-ink) tabular-nums [&>span]:[grid-area:1/1]">
      <AnimatePresence initial={false}>
        <motion.span
          key={count}
          initial={{ y: "100%" }}
          animate={{ y: "0%" }}
          exit={{ y: "-100%" }}
          transition={{ duration: 0.32, ease: [0.32, 0.72, 0, 1] }}
        >
          {count}
        </motion.span>
      </AnimatePresence>
    </span>
  );
}

function SelectionBar({
  count,
  onClear,
  onDelete,
  ref,
}: {
  count: number;
  onClear: () => void;
  onDelete: () => void;
  ref?: Ref<HTMLDivElement>;
}) {
  return (
    <motion.div ref={ref} className={BAR_ROW_CLASS} {...BAR_ROW}>
      <button
        type="button"
        className={`${BAR_BUTTON} w-[34px] text-(--bk-bar-muted) hover:bg-(--bk-bar-hover) hover:text-(--bk-bar-ink)`}
        onClick={onClear}
        aria-label="Clear selection"
      >
        <HugeiconsIcon icon={Cancel01Icon} aria-hidden="true" />
      </button>
      <span className={COUNT}>
        <RollingCount count={count} />
        selected
      </span>
      <span className="flex-1" />
      <button
        type="button"
        className={`${BAR_BUTTON} ml-1 pr-3 pl-2.5 text-(--bk-danger) hover:bg-[color-mix(in_oklab,var(--bk-danger)_16%,transparent)]`}
        onClick={onDelete}
      >
        <HugeiconsIcon icon={Delete02Icon} aria-hidden="true" />
        Delete
      </button>
    </motion.div>
  );
}

function UndoBar({
  deleted,
  onUndo,
  ref,
}: {
  deleted: number;
  onUndo: () => void;
  ref?: Ref<HTMLDivElement>;
}) {
  return (
    <motion.div ref={ref} className={BAR_ROW_CLASS} {...BAR_ROW}>
      <span className={COUNT}>
        {deleted} {deleted === 1 ? "file" : "files"} deleted
      </span>
      <span className="flex-1" />
      <button
        type="button"
        className={`${BAR_BUTTON} px-3 font-semibold! text-(--bk-bar-ink) hover:bg-(--bk-bar-hover)`}
        onClick={onUndo}
      >
        Undo
      </button>
    </motion.div>
  );
}

function Dock({
  count,
  undo,
  onClear,
  onDelete,
  onUndo,
}: {
  count: number;
  undo: string[] | null;
  onClear: () => void;
  onDelete: () => void;
  onUndo: () => void;
}) {
  const bar = count > 0 ? "select" : undo ? "undo" : null;

  return (
    <div className="relative mt-2 grid h-12 [&>*]:[grid-area:1/1]" aria-live="polite">
      <AnimatePresence initial={false}>
        {!bar && (
          <motion.p
            key="hint"
            className="m-0 flex items-center gap-1.5 px-2.5 text-[12px] text-(--bk-quiet)"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1, transition: { delay: 0.15 } }}
            exit={{ opacity: 0, transition: { duration: 0.1 } }}
          >
            <kbd className="grid h-[18px] min-w-[18px] place-items-center rounded-[5px] px-1 font-[inherit] text-[11px] shadow-[inset_0_0_0_1px_var(--bk-line),0_1px_0_var(--bk-line)]">
              ⇧
            </kbd> Shift-click to select a range
          </motion.p>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {bar && (
          <motion.div
            key="bar"
            className="grid h-12 items-center overflow-hidden rounded-[14px] bg-(--bk-bar) text-(--bk-bar-ink) shadow-[0_10px_24px_-12px_rgb(0_0_0/0.45)]"
            initial={{ y: 14, opacity: 0, scale: 0.97 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{
              y: 10,
              opacity: 0,
              scale: 0.98,
              transition: { duration: 0.16 },
            }}
            transition={SPRING}
          >
            <AnimatePresence initial={false} mode="popLayout">
              {bar === "select" ? (
                <SelectionBar
                  key="select"
                  count={count}
                  onClear={onClear}
                  onDelete={onDelete}
                />
              ) : (
                <UndoBar key="undo" deleted={undo!.length} onUndo={onUndo} />
              )}
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function selectionWithShift(
  current: BulkSelectValue,
  id: string,
  on: boolean,
  shift: boolean,
): BulkSelectValue {
  const visible = FILES.filter((file) => !current.gone.includes(file.id)).map(
    (file) => file.id,
  );

  if (shift && current.anchor && on) {
    const [from, to] = [
      visible.indexOf(current.anchor),
      visible.indexOf(id),
    ].sort((a, b) => a - b);
    const range = visible.slice(from, to + 1);
    return {
      ...current,
      selected: [...new Set([...current.selected, ...range])],
      undo: null,
    };
  }

  return {
    ...current,
    selected: on
      ? [...current.selected, id]
      : current.selected.filter((selected) => selected !== id),
    anchor: id,
    undo: null,
  };
}

export function BulkSelect({
  value,
  defaultValue = REST,
  onValueChange,
  ref,
}: BulkSelectProps) {
  const [files, setFiles] = useControllableState({
    value,
    defaultValue,
    onValueChange,
  });
  const shift = useRef(false);

  useEffect(() => {
    if (!files.undo) return;
    const timer = setTimeout(
      () => setFiles((current) => ({ ...current, undo: null }), "timer"),
      4500,
    );
    return () => clearTimeout(timer);
  }, [files.undo, setFiles]);

  const rows = useMemo(
    () => FILES.filter((file) => !files.gone.includes(file.id)),
    [files.gone],
  );
  const rowSelection = useMemo<RowSelectionState>(
    () => Object.fromEntries(files.selected.map((id) => [id, true])),
    [files.selected],
  );

  const tick = (id: string, on: boolean) =>
    setFiles((current) => selectionWithShift(current, id, on, shift.current));

  const remove = () =>
    setFiles((current) => ({
      gone: [...current.gone, ...current.selected],
      selected: [],
      anchor: null,
      undo: current.selected,
    }));

  const restore = () =>
    setFiles((current) => ({
      ...current,
      gone: current.gone.filter((gone) => !current.undo?.includes(gone)),
      undo: null,
    }));

  const onRowSelectionChange = (updater: Updater<RowSelectionState>) =>
    setFiles((current) => {
      const previous = Object.fromEntries(
        current.selected.map((id) => [id, true]),
      );
      const selection =
        typeof updater === "function" ? updater(previous) : updater;
      return {
        ...current,
        selected: Object.keys(selection).filter((id) => selection[id]),
        undo: null,
      };
    });

  const columns = [
    column.display({
      id: "select",
      header: ({ table }) => <SelectAllCheckbox table={table} />,
      cell: ({ row }) => (
        <RowCheckbox
          name={row.original.name}
          checked={row.getIsSelected()}
          onChange={(on) => tick(row.id, on)}
        />
      ),
    }),
    ...DATA_COLUMNS,
  ];

  const table = useReactTable({
    data: rows,
    columns,
    getRowId: (file) => file.id,
    getCoreRowModel: getCoreRowModel(),
    state: { rowSelection },
    onRowSelectionChange,
    enableRowSelection: true,
  });
  const tableRows = table.getRowModel().rows;

  return (
    <section
      ref={ref}
      className={`not-prose grid w-[min(100%,440px)] rounded-[20px] bg-(--bk-surface) px-2.5 pt-2.5 pb-3 font-sans text-(--bk-ink) ${PALETTE}`}
      aria-label="Files"
    >
      <div role="table" aria-label="Files" aria-rowcount={tableRows.length}>
        {table.getHeaderGroups().map((group) => (
          <div key={group.id} role="row" className={`${GRID} mb-0.5 h-9 text-[11.5px] font-medium text-(--bk-quiet)`}>
            {group.headers.map((header) => (
              <span key={header.id} role="columnheader" className={CELL}>
                {flexRender(
                  header.column.columnDef.header,
                  header.getContext(),
                )}
              </span>
            ))}
          </div>
        ))}

        <ul role="rowgroup" className="m-0 grid list-none p-0">
          <AnimatePresence initial={false}>
            {tableRows.map((row, index) => {
              const on = row.getIsSelected();
              const order = files.undo?.indexOf(row.id) ?? -1;

              return (
                <motion.li
                  key={row.id}
                  role="row"
                  aria-selected={on}
                  layout="position"
                  className="relative overflow-hidden rounded-[10px] transition-[background-color,border-radius] duration-[180ms] not-first:before:absolute not-first:before:top-0 not-first:before:right-2.5 not-first:before:left-[38px] not-first:before:h-px not-first:before:bg-(--bk-line) not-first:before:transition-opacity not-first:before:duration-[180ms] not-first:before:content-[''] hover:bg-(--bk-hover) data-joins-down:rounded-b-none data-joins-up:rounded-t-none data-selected:bg-(--bk-band)! data-selected:before:opacity-0 [[data-selected]+&]:before:opacity-0"
                  data-selected={on || undefined}
                  data-joins-up={
                    (on && tableRows[index - 1]?.getIsSelected()) || undefined
                  }
                  data-joins-down={
                    (on && tableRows[index + 1]?.getIsSelected()) || undefined
                  }
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{
                    opacity: 0,
                    height: 0,
                    transition: {
                      duration: 0.28,
                      delay: Math.max(0, order) * 0.06,
                      ease: [0.4, 0, 0.2, 1],
                    },
                  }}
                  transition={SPRING}
                  onClickCapture={(event: MouseEvent) => {
                    shift.current = event.shiftKey;
                  }}
                >
                  <label className={`group/inner ${GRID} h-11 cursor-pointer`}>
                    {row.getVisibleCells().map((cell) => (
                      <span key={cell.id} role="cell" className={CELL}>
                        {flexRender(
                          cell.column.columnDef.cell,
                          cell.getContext(),
                        )}
                      </span>
                    ))}
                  </label>
                </motion.li>
              );
            })}
          </AnimatePresence>
        </ul>
      </div>

      <Dock
        count={files.selected.length}
        undo={files.undo}
        onClear={() => setFiles((current) => ({ ...current, selected: [] }))}
        onDelete={remove}
        onUndo={restore}
      />
    </section>
  );
}

const BEATS: readonly (BulkSelectValue & { ms: number })[] = [
  { ...REST, ms: 1300 },
  { ...REST, selected: ["a"], anchor: "a", ms: 700 },
  { ...REST, selected: ["a", "b", "c"], anchor: "a", ms: 900 },
  { ...REST, selected: ["a", "b", "c", "e"], anchor: "e", ms: 1400 },
  { ...REST, gone: ["a", "b", "c", "e"], undo: ["a", "b", "c", "e"], ms: 2000 },
  { ...REST, ms: 1300 },
];

const fromBeat = (step: number): BulkSelectValue => {
  const { ms: _, ...state } = BEATS[step]!;
  return state;
};

interface BulkSelectDemoProps {
  playing?: boolean;
}

export function BulkSelectDemo({ playing }: BulkSelectDemoProps = {}) {
  const scene = useScene(BEATS, fromBeat, playing);
  return (
    <BulkSelect
      ref={scene.ref}
      value={scene.state}
      onValueChange={scene.onValueChange}
    />
  );
}
