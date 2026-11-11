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
import "./bulk-select.css";

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
  /** The last row ticked on its own, where a shift-click range starts. */
  anchor: string | null;
  /** What the last delete took, while it can still be undone. */
  undo: string[] | null;
}

const REST: BulkSelectValue = {
  gone: [],
  selected: [],
  anchor: null,
  undo: null,
};

const SPRING = { type: "spring" as const, duration: 0.45, bounce: 0.18 };

const column = createColumnHelper<File>();

const DATA_COLUMNS = [
  column.accessor("name", {
    header: ({ table }) => (
      <span className="bk-title">
        Files <span>{table.getRowCount()}</span>
      </span>
    ),
    cell: ({ row }) => {
      const Icon = row.original.icon;
      return (
        <span className="bk-name">
          <span
            className="bk-icon"
            style={{ "--tint": row.original.color } as CSSProperties}
          >
            <HugeiconsIcon icon={Icon} aria-hidden="true" />
          </span>
          <span className="bk-file">{row.original.name}</span>
        </span>
      );
    },
  }),
  column.accessor("size", {
    header: () => <span className="bk-col-size">Size</span>,
    cell: (info) => <span className="bk-size">{info.getValue()}</span>,
  }),
  column.accessor("edited", {
    header: () => <span className="bk-col-date">Edited</span>,
    cell: (info) => <span className="bk-date">{info.getValue()}</span>,
  }),
];

export interface BulkSelectProps {
  /** Which files are deleted and ticked, where a shift-click range starts, and what the last delete can undo. */
  value?: BulkSelectValue;
  defaultValue?: BulkSelectValue;
  onValueChange?: (value: BulkSelectValue, details: ChangeDetails) => void;
  ref?: Ref<HTMLElement>;
}

/** A file table with bulk selection: tick rows or shift-click a range, delete them together, then undo. */
const BAR_ROW = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -8 },
  transition: { duration: 0.18 },
};

function SelectAllCheckbox({ table }: { table: Table<File> }) {
  return (
    <Checkbox.Root
      className="bk-check"
      checked={table.getIsAllRowsSelected()}
      indeterminate={table.getIsSomeRowsSelected()}
      onCheckedChange={(on) => table.toggleAllRowsSelected(on)}
      aria-label="Select all files"
    >
      <Checkbox.Indicator
        className="bk-tick"
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
      className="bk-check"
      checked={checked}
      onCheckedChange={onChange}
      aria-label={`Select ${name}`}
    >
      <Checkbox.Indicator className="bk-tick">
        <HugeiconsIcon icon={CheckIcon} aria-hidden="true" />
      </Checkbox.Indicator>
    </Checkbox.Root>
  );
}

function RollingCount({ count }: { count: number }) {
  return (
    <span className="bk-roll">
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
    <motion.div ref={ref} className="bk-bar-row" {...BAR_ROW}>
      <button
        type="button"
        className="bk-clear"
        onClick={onClear}
        aria-label="Clear selection"
      >
        <HugeiconsIcon icon={Cancel01Icon} aria-hidden="true" />
      </button>
      <span className="bk-count">
        <RollingCount count={count} />
        selected
      </span>
      <span className="bk-bar-gap" />
      <button type="button" className="bk-delete" onClick={onDelete}>
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
    <motion.div ref={ref} className="bk-bar-row" {...BAR_ROW}>
      <span className="bk-count">
        {deleted} {deleted === 1 ? "file" : "files"} deleted
      </span>
      <span className="bk-bar-gap" />
      <button type="button" className="bk-undo" onClick={onUndo}>
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
    <div className="bk-dock" aria-live="polite">
      <AnimatePresence initial={false}>
        {!bar && (
          <motion.p
            key="hint"
            className="bk-hint"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1, transition: { delay: 0.15 } }}
            exit={{ opacity: 0, transition: { duration: 0.1 } }}
          >
            <kbd>⇧</kbd> Shift-click to select a range
          </motion.p>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {bar && (
          <motion.div
            key="bar"
            className="bk-bar"
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
    <section ref={ref} className="bk bk-layer not-prose" aria-label="Files">
      <div role="table" aria-label="Files" aria-rowcount={tableRows.length}>
        {table.getHeaderGroups().map((group) => (
          <div key={group.id} role="row" className="bk-head">
            {group.headers.map((header) => (
              <span key={header.id} role="columnheader" className="bk-cell">
                {flexRender(
                  header.column.columnDef.header,
                  header.getContext(),
                )}
              </span>
            ))}
          </div>
        ))}

        <ul role="rowgroup" className="bk-rows">
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
                  className="bk-row"
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
                  <label className="bk-row-inner">
                    {row.getVisibleCells().map((cell) => (
                      <span key={cell.id} role="cell" className="bk-cell">
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

// The docs demo: a short scripted scene that plays the element above. Your app doesn't need it.

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
