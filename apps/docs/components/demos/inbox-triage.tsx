"use client";

import { Avatar } from "@base-ui/react/avatar";
import { Checkbox } from "@base-ui/react/checkbox";
import { Tabs } from "@base-ui/react/tabs";
import { Toast } from "@base-ui/react/toast";
import { Toolbar } from "@base-ui/react/toolbar";
import { Tooltip } from "@base-ui/react/tooltip";
import { Archive02Icon, CheckIcon, Delete02Icon, InboxIcon, MinusSignIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon, type IconSvgElement } from "@hugeicons/react";
import { Remold, useDust } from "@remold-ui/react/canvas";
import { AnimatePresence, MotionConfig, motion, type PanInfo } from "motion/react";
import { useLayoutEffect, useRef, useState, type CSSProperties, type Ref, type RefObject } from "react";
import { usePortalContainer } from "./portal-container";
import { useControllableState } from "./use-controllable-state";
import { useScene } from "./use-scene";
import "./inbox-triage.css";

type Box = "inbox" | "archive" | "trash";

const MAIL = [
  {
    id: "maya",
    from: "Maya Chen",
    subject: "Q4 roadmap review",
    preview: "Can we move the sync to Thursday? I've added notes to the doc.",
    time: "9:41",
    face: true,
  },
  {
    id: "stripe",
    from: "Stripe",
    subject: "Your payout of £2,480 is on its way",
    preview: "Expected in your account by Friday.",
    time: "9:12",
    brand: "#635bff",
  },
  {
    id: "kofi",
    from: "Kofi Mensah",
    subject: "Photos from the offsite",
    preview: "Uploaded the whole album, the sunset ones are great.",
    time: "Tue",
    face: true,
  },
  {
    id: "figma",
    from: "Figma",
    subject: "Ama commented on Checkout v3",
    preview: "“Should the total sit above the button?”",
    time: "Tue",
    brand: "#f24e1e",
  },
  {
    id: "priya",
    from: "Priya Raman",
    subject: "Contract signed",
    preview: "All done. Welcome aboard, see you Monday!",
    time: "Mon",
    face: true,
  },
];

const BOX: Record<Box, { label: string; icon: IconSvgElement; done: string; empty: string; art: string }> = {
  inbox: {
    label: "Inbox",
    icon: InboxIcon,
    done: "Moved to Inbox",
    empty: "You're all caught up",
    art: "M2 12L6 3H18L22 12V21H2Z M4.6 13V19H19.4V13H15.6L14 16H10L8.4 13Z",
  },
  archive: {
    label: "Archive",
    icon: Archive02Icon,
    done: "Archived",
    empty: "Nothing archived",
    art: "M2 3H22V8H2Z M3 9H21V21H3Z M9 12H15V14H9Z",
  },
  trash: {
    label: "Trash",
    icon: Delete02Icon,
    done: "Moved to Trash",
    empty: "Trash is empty",
    art: "M3 5H21V7H3Z M9 2H15V4H9Z M5 8H19L18 22H6Z M9 11H10.5V19H9Z M13.5 11H15V19H13.5Z",
  },
};
const BOXES = Object.keys(BOX) as Box[];

const MOVES: Record<Box, Box[]> = {
  inbox: ["archive", "trash"],
  archive: ["inbox", "trash"],
  trash: ["inbox"],
};
const actionOf = (to: Box) => (to === "inbox" ? "Move to Inbox" : BOX[to].label);

const COLORS = [
  "var(--ib-ink)",
  "var(--ib-muted)",
  "var(--ib-accent)",
  "#635bff",
  "#f24e1e",
  "#e0e7ff",
  "#fce7f3",
  "#d1fae5",
  "var(--ib-surface)",
];
const FOLD = { type: "spring" as const, duration: 0.45, bounce: 0 };
const UNDO_MS = 5000;

const face = (name: string, index: number) =>
  `https://api.dicebear.com/9.x/notionists/svg?seed=${encodeURIComponent(name)}&backgroundColor=${["e0e7ff", "fce7f3", "d1fae5"][index % 3]}`;

type Boxes = Record<string, Box>;

export interface InboxTriageValue {
  /** Which mailbox each message is in, by id. */
  boxes: Boxes;
  /** The ids of the ticked messages. */
  selected: string[];
}

const ALL_IN: Boxes = Object.fromEntries(MAIL.map((message) => [message.id, "inbox"]));

export interface InboxTriageProps {
  value?: InboxTriageValue;
  defaultValue?: InboxTriageValue;
  onValueChange?: (value: InboxTriageValue) => void;
  ref?: Ref<HTMLElement>;
}

/** An inbox where archived and deleted mail pours as dust into its tab, with a toast to undo. */
export function InboxTriage(props: InboxTriageProps) {
  return (
    <Toast.Provider limit={1} timeout={UNDO_MS}>
      <Tooltip.Provider delay={400}>
        <Inbox {...props} />
      </Tooltip.Provider>
    </Toast.Provider>
  );
}

type Mail = (typeof MAIL)[number];

const SWAP = {
  initial: { opacity: 0, y: 4 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -4 },
};

function MailboxTabs({
  view,
  counts,
  tabRefs,
  onChange,
}: {
  view: Box;
  counts: Record<Box, number>;
  tabRefs: RefObject<Map<Box, HTMLElement>>;
  onChange: (box: Box) => void;
}) {
  return (
    <Tabs.Root value={view} onValueChange={(box) => onChange(box as Box)}>
      <Tabs.List className="ib-tabs" aria-label="Mailboxes">
        {BOXES.map((box) => (
          <Tabs.Tab
            key={box}
            value={box}
            className="ib-tab"
            ref={(tab: HTMLElement | null) => {
              if (tab) tabRefs.current.set(box, tab);
            }}
          >
            <HugeiconsIcon icon={BOX[box].icon} size={16} aria-hidden="true" />
            {BOX[box].label}
            <span className="ib-count">{counts[box] || ""}</span>
          </Tabs.Tab>
        ))}
        <Tabs.Indicator className="ib-indicator" />
      </Tabs.List>
    </Tabs.Root>
  );
}

function SelectionBar({
  view,
  shown,
  selected,
  onSelectAll,
  onMove,
}: {
  view: Box;
  shown: Mail[];
  selected: string[];
  onSelectAll: (on: boolean) => void;
  onMove: (to: Box) => void;
}) {
  return (
    <div className="ib-bar">
      <Checkbox.Root
        className="ib-check"
        checked={shown.length > 0 && selected.length === shown.length}
        indeterminate={selected.length > 0 && selected.length < shown.length}
        disabled={shown.length === 0}
        onCheckedChange={onSelectAll}
        aria-label="Select all"
      >
        <Checkbox.Indicator
          className="ib-tick"
          render={(props, state) => (
            <span {...props}>
              <HugeiconsIcon
                icon={state.indeterminate ? MinusSignIcon : CheckIcon}
                size={12}
                strokeWidth={2.5}
                aria-hidden="true"
              />
            </span>
          )}
        />
      </Checkbox.Root>

      <AnimatePresence mode="popLayout" initial={false}>
        {selected.length ? (
          <motion.div key="tools" className="ib-tools" {...SWAP}>
            <span className="ib-picked">{selected.length} selected</span>
            <Toolbar.Root className="ib-toolbar" aria-label="Selected messages">
              {MOVES[view].map((to) => (
                <Toolbar.Button key={to} className="ib-tool" onClick={() => onMove(to)}>
                  <HugeiconsIcon icon={BOX[to].icon} size={15} aria-hidden="true" />
                  {actionOf(to)}
                </Toolbar.Button>
              ))}
            </Toolbar.Root>
          </motion.div>
        ) : (
          <motion.span key="hint" className="ib-hint" {...SWAP}>
            {shown.length ? `${shown.length} conversations` : "No conversations"}
          </motion.span>
        )}
      </AnimatePresence>
    </div>
  );
}

function QuickAction({ to, onMove }: { to: Box; onMove: () => void }) {
  const portal = usePortalContainer();

  return (
    <Tooltip.Root>
      <Tooltip.Trigger className="ib-action" aria-label={actionOf(to)} onClick={onMove}>
        <HugeiconsIcon icon={BOX[to].icon} size={16} aria-hidden="true" />
      </Tooltip.Trigger>
      <Tooltip.Portal container={portal}>
        <Tooltip.Positioner className="ib-layer" sideOffset={6}>
          <Tooltip.Popup className="ib-tip">{actionOf(to)}</Tooltip.Popup>
        </Tooltip.Positioner>
      </Tooltip.Portal>
    </Tooltip.Root>
  );
}

function MailRow({
  mail,
  index,
  view,
  here,
  selected,
  moving,
  rowRefs,
  onSelect,
  onMove,
}: {
  mail: Mail;
  index: number;
  view: Box;
  here: boolean;
  selected: boolean;
  moving: boolean;
  rowRefs: RefObject<Map<string, HTMLElement>>;
  onSelect: (on: boolean) => void;
  onMove: (to: Box) => void;
}) {
  const swipeRight: Box = view === "inbox" ? "archive" : "inbox";

  return (
    <motion.li
      className="ib-row"
      aria-hidden={!here || undefined}
      initial={false}
      animate={{ height: here ? "auto" : 0 }}
      transition={FOLD}
    >
      <span className="ib-swipe" data-to={swipeRight}>
        <HugeiconsIcon icon={BOX[swipeRight].icon} size={18} aria-hidden="true" />
      </span>
      <span className="ib-swipe" data-to="trash" data-side="right">
        <HugeiconsIcon icon={Delete02Icon} size={18} aria-hidden="true" />
      </span>

      <motion.div
        ref={(row: HTMLDivElement | null) => {
          if (row) rowRefs.current.set(mail.id, row);
        }}
        className="ib-mail"
        data-moving={moving || undefined}
        data-selected={selected || undefined}
        drag={here ? "x" : false}
        dragDirectionLock
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={0.5}
        onDragEnd={(_: unknown, { offset }: PanInfo) => {
          if (Math.abs(offset.x) > 80) onMove(offset.x > 0 ? swipeRight : "trash");
        }}
      >
        <Checkbox.Root
          className="ib-check"
          checked={selected}
          onCheckedChange={onSelect}
          aria-label={`Select ${mail.subject}`}
        >
          <Checkbox.Indicator className="ib-tick">
            <HugeiconsIcon icon={CheckIcon} size={12} strokeWidth={2.5} aria-hidden="true" />
          </Checkbox.Indicator>
        </Checkbox.Root>

        <Avatar.Root className="ib-avatar" style={mail.brand ? { background: mail.brand } : undefined}>
          {mail.face && <Avatar.Image src={face(mail.from, index)} crossOrigin="anonymous" alt="" />}
          <Avatar.Fallback>{mail.from[0]}</Avatar.Fallback>
        </Avatar.Root>

        <span className="ib-text">
          <span className="ib-line">
            <span className="ib-from">{mail.from}</span>
            <span className="ib-time">{mail.time}</span>
          </span>
          <span className="ib-subject">{mail.subject}</span>
          <span className="ib-preview">{mail.preview}</span>
        </span>

        <span className="ib-actions">
          {MOVES[view].map((to) => (
            <QuickAction key={to} to={to} onMove={() => onMove(to)} />
          ))}
        </span>
      </motion.div>
    </motion.li>
  );
}

function EmptyMailbox({ view }: { view: Box }) {
  const empty = BOX[view];

  return (
    <div className="ib-empty">
      <Remold.Particles
        className="ib-empty-art"
        shape={{ path: empty.art, fillRule: "evenodd" }}
        count={360}
        palette={COLORS}
        radius={1.3}
        padding={4}
        transition="scatter"
        aria-hidden="true"
      />
      <span>{empty.empty}</span>
    </div>
  );
}

function useDustMoves(
  root: RefObject<HTMLElement | null>,
  boxes: Boxes,
  view: Box,
  onUndo: (boxes: Boxes) => void,
) {
  const toasts = Toast.useToastManager();
  const trail = useDust(root, { palette: COLORS, count: 700 });
  const rows = useRef(new Map<string, HTMLElement>());
  const tabs = useRef(new Map<Box, HTMLElement>());
  const toast = useRef<string | null>(null);
  const [placed, setPlaced] = useState(boxes);
  const [moving, setMoving] = useState<string[]>([]);
  const latest = useRef(boxes);
  latest.current = boxes;

  useLayoutEffect(() => {
    const was = placed;
    const leaving = MAIL.filter((message) => was[message.id] === view && boxes[message.id] !== view);
    const arriving = MAIL.filter((message) => was[message.id] !== view && boxes[message.id] === view);
    const rowsOf = (list: Mail[]) => list.map((message) => rows.current.get(message.id)!);

    if (toast.current) toasts.close(toast.current);
    if (leaving.length + arriving.length === 0) return setPlaced(boxes);

    setMoving([...leaving, ...arriving].map((message) => message.id));

    if (leaving.length) {
      const to = boxes[leaving[0]!.id]!;
      const what = leaving.length === 1 ? leaving[0]!.subject : `${leaving.length} conversations`;

      toast.current = toasts.add({
        title: `${BOX[to].done} · ${what}`,
        actionProps: { children: "Undo", onClick: () => onUndo(was) },
      });

      void trail.away(rowsOf(leaving), tabs.current.get(to)!).then(() => {
        setPlaced(latest.current);
        setMoving([]);
      });
      return;
    }

    setPlaced(boxes);
    const from = was[arriving[0]!.id]!;
    void new Promise((open) => setTimeout(open, FOLD.duration * 1000))
      .then(() => trail.back(rowsOf(arriving), tabs.current.get(from)!))
      .then(() => setMoving([]));
  }, [boxes]);

  return { placed, moving, rows, tabs };
}

function Inbox({
  value,
  defaultValue = { boxes: ALL_IN, selected: [] },
  onValueChange,
  ref,
}: InboxTriageProps) {
  const [inbox, setInbox] = useControllableState({ value, defaultValue, onValueChange });
  const [view, setView] = useState<Box>("inbox");
  const root = useRef<HTMLElement>(null);
  const { placed, moving, rows, tabs } = useDustMoves(root, inbox.boxes, view, (boxes) =>
    setInbox({ boxes, selected: [] }),
  );

  const shown = MAIL.filter((message) => placed[message.id] === view);
  const selected = inbox.selected.filter((id) => shown.some((message) => message.id === id));
  const counts = Object.fromEntries(
    BOXES.map((box) => [box, MAIL.filter((message) => placed[message.id] === box).length]),
  ) as Record<Box, number>;

  const move = (ids: string[], to: Box) =>
    setInbox((current) => ({
      boxes: { ...current.boxes, ...Object.fromEntries(ids.map((id) => [id, to])) },
      selected: current.selected.filter((id) => !ids.includes(id)),
    }));

  const select = (id: string, on: boolean) =>
    setInbox((current) => ({
      ...current,
      selected: on ? [...current.selected, id] : current.selected.filter((selected) => selected !== id),
    }));

  const selectAll = (on: boolean) =>
    setInbox((current) => ({ ...current, selected: on ? shown.map((message) => message.id) : [] }));

  return (
    <MotionConfig reducedMotion="user">
      <section
        ref={(element) => {
          root.current = element;
          if (typeof ref === "function") ref(element);
          else if (ref) ref.current = element;
        }}
        className="ib ib-layer not-prose"
        aria-label="Inbox"
      >
        <MailboxTabs view={view} counts={counts} tabRefs={tabs} onChange={setView} />
        <SelectionBar
          view={view}
          shown={shown}
          selected={selected}
          onSelectAll={selectAll}
          onMove={(to) => move(selected, to)}
        />

        <ul className="ib-list">
          {MAIL.map((mail, index) => (
            <MailRow
              key={mail.id}
              mail={mail}
              index={index}
              view={view}
              here={placed[mail.id] === view}
              selected={selected.includes(mail.id)}
              moving={moving.includes(mail.id)}
              rowRefs={rows}
              onSelect={(on) => select(mail.id, on)}
              onMove={(to) => move([mail.id], to)}
            />
          ))}
        </ul>

        {shown.length === 0 && moving.length === 0 && <EmptyMailbox view={view} />}

        <Toast.Viewport className="ib-toasts">
          <Toasts />
        </Toast.Viewport>
      </section>
    </MotionConfig>
  );
}

function Toasts() {
  const { toasts } = Toast.useToastManager();
  return toasts.map((toast) => (
    <Toast.Root
      key={toast.id}
      toast={toast}
      className="ib-toast"
      style={{ "--ib-undo": `${UNDO_MS}ms` } as CSSProperties}
    >
      <Toast.Content className="ib-toast-body">
        <Toast.Title className="ib-toast-title" render={<p />} />
        <Toast.Action className="ib-undo" />
      </Toast.Content>
      <span className="ib-countdown" aria-hidden="true" />
    </Toast.Root>
  ));
}

// The docs demo: a short scripted scene that plays the element above. Your app doesn't need it.

const BEATS: (InboxTriageValue & { ms: number })[] = [
  { boxes: ALL_IN, selected: [], ms: 1600 },
  { boxes: { ...ALL_IN, stripe: "archive" }, selected: [], ms: 2400 },
  { boxes: { ...ALL_IN, stripe: "archive" }, selected: ["figma", "priya"], ms: 1400 },
  { boxes: { ...ALL_IN, stripe: "archive", figma: "trash", priya: "trash" }, selected: [], ms: 2600 },
  { boxes: { ...ALL_IN, stripe: "archive" }, selected: [], ms: 2600 },
];

const fromBeat = (step: number): InboxTriageValue => BEATS[step]!;

export function InboxTriageDemo({ playing }: { playing?: boolean } = {}) {
  const scene = useScene(BEATS, fromBeat, playing);
  return <InboxTriage ref={scene.ref} value={scene.state} onValueChange={scene.onValueChange} />;
}
