"use client";

import { Avatar } from "@base-ui/react/avatar";
import { Checkbox } from "@base-ui/react/checkbox";
import { Tabs } from "@base-ui/react/tabs";
import { Toast } from "@base-ui/react/toast";
import { Toolbar } from "@base-ui/react/toolbar";
import { Tooltip } from "@base-ui/react/tooltip";
import { Archive02Icon, CheckIcon, Delete02Icon, InboxIcon, MinusSignIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon, type IconSvgElement } from "@hugeicons/react";
import { Remold, useDust } from "@remold-ui/react";
import { AnimatePresence, MotionConfig, motion, type PanInfo } from "motion/react";
import { useLayoutEffect, useRef, useState, type CSSProperties } from "react";
import { usePortalContainer } from "./portal-container";
import { useScene } from "./use-scene";
import "./inbox-triage.css";

type Box = "inbox" | "archive" | "trash";

const MAIL = [
  { id: "maya", from: "Maya Chen", subject: "Q4 roadmap review", preview: "Can we move the sync to Thursday? I've added notes to the doc.", time: "9:41", face: true },
  { id: "stripe", from: "Stripe", subject: "Your payout of £2,480 is on its way", preview: "Expected in your account by Friday.", time: "9:12", brand: "#635bff" },
  { id: "kofi", from: "Kofi Mensah", subject: "Photos from the offsite", preview: "Uploaded the whole album, the sunset ones are great.", time: "Tue", face: true },
  { id: "figma", from: "Figma", subject: "Ama commented on Checkout v3", preview: "“Should the total sit above the button?”", time: "Tue", brand: "#f24e1e" },
  { id: "priya", from: "Priya Raman", subject: "Contract signed", preview: "All done. Welcome aboard, see you Monday!", time: "Mon", face: true },
];

const BOX: Record<Box, { label: string; icon: IconSvgElement; done: string; empty: string; art: string }> = {
  inbox: {
    label: "Inbox",
    icon: InboxIcon,
    done: "Moved to Inbox",
    empty: "You're all caught up",
    art: "M2 12L6 3H18L22 12V21H2Z M4.6 13V19H19.4V13H15.6L14 16H10L8.4 13Z",
  },
  archive: { label: "Archive", icon: Archive02Icon, done: "Archived", empty: "Nothing archived", art: "M2 3H22V8H2Z M3 9H21V21H3Z M9 12H15V14H9Z" },
  trash: {
    label: "Trash",
    icon: Delete02Icon,
    done: "Moved to Trash",
    empty: "Trash is empty",
    art: "M3 5H21V7H3Z M9 2H15V4H9Z M5 8H19L18 22H6Z M9 11H10.5V19H9Z M13.5 11H15V19H13.5Z",
  },
};
const BOXES = Object.keys(BOX) as Box[];

/** What each view lets you do with a message: where it can go from here. */
const MOVES: Record<Box, Box[]> = { inbox: ["archive", "trash"], archive: ["inbox", "trash"], trash: ["inbox"] };
const actionOf = (to: Box) => (to === "inbox" ? "Move to Inbox" : BOX[to].label);

/** The colours dust is sorted into. The last is the card itself, so stray edge pixels vanish into it. */
const COLORS = ["var(--ib-ink)", "var(--ib-muted)", "var(--ib-accent)", "#635bff", "#f24e1e", "#e0e7ff", "#fce7f3", "#d1fae5", "var(--ib-surface)"];
const FOLD = { type: "spring" as const, duration: 0.45, bounce: 0 };
const UNDO_MS = 5000;

const face = (name: string, i: number) =>
  `https://api.dicebear.com/9.x/notionists/svg?seed=${encodeURIComponent(name)}&backgroundColor=${["e0e7ff", "fce7f3", "d1fae5"][i % 3]}`;

type Boxes = Record<string, Box>;

interface State {
  boxes: Boxes;
  selected: string[];
}

const ALL_IN: Boxes = Object.fromEntries(MAIL.map((m) => [m.id, "inbox"]));

const BEATS: (State & { ms: number })[] = [
  { boxes: ALL_IN, selected: [], ms: 1600 },
  { boxes: { ...ALL_IN, stripe: "archive" }, selected: [], ms: 2400 },
  { boxes: { ...ALL_IN, stripe: "archive" }, selected: ["figma", "priya"], ms: 1400 },
  { boxes: { ...ALL_IN, stripe: "archive", figma: "trash", priya: "trash" }, selected: [], ms: 2600 },
  { boxes: { ...ALL_IN, stripe: "archive" }, selected: [], ms: 2600 },
];

const fromBeat = (step: number): State => BEATS[step]!;

export function InboxTriageDemo({ playing }: { playing?: boolean } = {}) {
  return (
    <Toast.Provider limit={1} timeout={UNDO_MS}>
      <Tooltip.Provider delay={400}>
        <Inbox playing={playing} />
      </Tooltip.Provider>
    </Toast.Provider>
  );
}

function Inbox({ playing }: { playing?: boolean }) {
  const scene = useScene(BEATS, fromBeat, playing);
  const { state, take } = scene;
  const toasts = Toast.useToastManager();
  const portal = usePortalContainer();
  const root = useRef<HTMLElement>(null);
  const rows = useRef(new Map<string, HTMLElement>());
  const tabs = useRef(new Map<Box, HTMLElement>());
  const toast = useRef<string | null>(null);
  const trail = useDust(root, { palette: COLORS, count: 700 });
  const [view, setView] = useState<Box>("inbox");
  // Where messages are drawn. It trails `state.boxes` while their dust is on the way.
  const [placed, setPlaced] = useState(state.boxes);
  const [moving, setMoving] = useState<string[]>([]);
  const latest = useRef(state.boxes);
  latest.current = state.boxes;

  // Messages that left this view pour into their new tab; ones that came back pour out of their old one.
  useLayoutEffect(() => {
    const was = placed;
    const leaving = MAIL.filter((m) => was[m.id] === view && state.boxes[m.id] !== view);
    const arriving = MAIL.filter((m) => was[m.id] !== view && state.boxes[m.id] === view);
    const rowsOf = (list: typeof MAIL) => list.map((m) => rows.current.get(m.id)!);
    if (toast.current) toasts.close(toast.current);
    if (leaving.length + arriving.length === 0) return setPlaced(state.boxes);
    setMoving([...leaving, ...arriving].map((m) => m.id));

    if (leaving.length) {
      const to = state.boxes[leaving[0]!.id]!;
      toast.current = toasts.add({
        title: `${BOX[to].done} · ${leaving.length === 1 ? leaving[0]!.subject : `${leaving.length} conversations`}`,
        actionProps: { children: "Undo", onClick: () => take({ boxes: was, selected: [] }) },
      });
      void trail.away(rowsOf(leaving), tabs.current.get(to)!).then(() => {
        setPlaced(latest.current);
        setMoving([]);
      });
    } else {
      // The rows open first, so the dots know where to land.
      setPlaced(state.boxes);
      const from = was[arriving[0]!.id]!;
      void new Promise((open) => setTimeout(open, FOLD.duration * 1000))
        .then(() => trail.back(rowsOf(arriving), tabs.current.get(from)!))
        .then(() => setMoving([]));
    }
    // Only a change of where messages are should pour; switching tabs just shows another list.
  }, [state.boxes]);

  const shown = MAIL.filter((m) => placed[m.id] === view);
  const selected = state.selected.filter((id) => shown.some((m) => m.id === id));
  const count = (box: Box) => MAIL.filter((m) => placed[m.id] === box).length;
  const move = (ids: string[], to: Box) =>
    take((s) => ({ boxes: { ...s.boxes, ...Object.fromEntries(ids.map((id) => [id, to])) }, selected: s.selected.filter((id) => !ids.includes(id)) }));
  const select = (id: string, on: boolean) => take((s) => ({ ...s, selected: on ? [...s.selected, id] : s.selected.filter((x) => x !== id) }));
  const empty = BOX[view];

  return (
    <MotionConfig reducedMotion="user">
      <section
        ref={(el) => {
          root.current = el;
          scene.ref(el);
        }}
        className="ib ib-layer not-prose"
        aria-label="Inbox"
      >
        <Tabs.Root value={view} onValueChange={(v) => setView(v as Box)}>
          <Tabs.List className="ib-tabs" aria-label="Mailboxes">
            {BOXES.map((box) => (
              <Tabs.Tab
                key={box}
                value={box}
                className="ib-tab"
                ref={(el: HTMLElement | null) => {
                  if (el) tabs.current.set(box, el);
                }}
              >
                <HugeiconsIcon icon={BOX[box].icon} size={16} aria-hidden="true" />
                {BOX[box].label}
                <span className="ib-count">{count(box) || ""}</span>
              </Tabs.Tab>
            ))}
            <Tabs.Indicator className="ib-indicator" />
          </Tabs.List>
        </Tabs.Root>

        <div className="ib-bar">
          <Checkbox.Root
            className="ib-check"
            checked={shown.length > 0 && selected.length === shown.length}
            indeterminate={selected.length > 0 && selected.length < shown.length}
            disabled={shown.length === 0}
            onCheckedChange={(on) => take((s) => ({ ...s, selected: on ? shown.map((m) => m.id) : [] }))}
            aria-label="Select all"
          >
            <Checkbox.Indicator className="ib-tick" render={(props, st) => (
              <span {...props}>
                <HugeiconsIcon icon={st.indeterminate ? MinusSignIcon : CheckIcon} size={12} strokeWidth={2.5} aria-hidden="true" />
              </span>
            )} />
          </Checkbox.Root>
          <AnimatePresence mode="popLayout" initial={false}>
            {selected.length ? (
              <motion.div key="tools" className="ib-tools" initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }}>
                <span className="ib-picked">{selected.length} selected</span>
                <Toolbar.Root className="ib-toolbar" aria-label="Selected messages">
                  {MOVES[view].map((to) => (
                    <Toolbar.Button key={to} className="ib-tool" onClick={() => move(selected, to)}>
                      <HugeiconsIcon icon={BOX[to].icon} size={15} aria-hidden="true" />
                      {actionOf(to)}
                    </Toolbar.Button>
                  ))}
                </Toolbar.Root>
              </motion.div>
            ) : (
              <motion.span key="hint" className="ib-hint" initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }}>
                {shown.length ? `${shown.length} conversations` : "No conversations"}
              </motion.span>
            )}
          </AnimatePresence>
        </div>

        <ul className="ib-list">
          {MAIL.map((mail, i) => {
            const here = placed[mail.id] === view;
            // Swipe right files it (archive, or back to the inbox); swipe left bins it.
            const swipeRight: Box = view === "inbox" ? "archive" : "inbox";
            return (
              // Every message stays mounted, folded shut when it's elsewhere, so it can open again in place.
              <motion.li
                key={mail.id}
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
                  ref={(el: HTMLDivElement | null) => {
                    if (el) rows.current.set(mail.id, el);
                  }}
                  className="ib-mail"
                  data-moving={moving.includes(mail.id) || undefined}
                  data-selected={selected.includes(mail.id) || undefined}
                  drag={here ? "x" : false}
                  dragDirectionLock
                  dragConstraints={{ left: 0, right: 0 }}
                  dragElastic={0.5}
                  onDragEnd={(_: unknown, { offset }: PanInfo) => {
                    if (Math.abs(offset.x) > 80) move([mail.id], offset.x > 0 ? swipeRight : "trash");
                  }}
                >
                  <Checkbox.Root
                    className="ib-check"
                    checked={selected.includes(mail.id)}
                    onCheckedChange={(on) => select(mail.id, on)}
                    aria-label={`Select ${mail.subject}`}
                  >
                    <Checkbox.Indicator className="ib-tick">
                      <HugeiconsIcon icon={CheckIcon} size={12} strokeWidth={2.5} aria-hidden="true" />
                    </Checkbox.Indicator>
                  </Checkbox.Root>
                  <Avatar.Root className="ib-avatar" style={mail.brand ? { background: mail.brand } : undefined}>
                    {mail.face && <Avatar.Image src={face(mail.from, i)} crossOrigin="anonymous" alt="" />}
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
                      <Tooltip.Root key={to}>
                        <Tooltip.Trigger className="ib-action" aria-label={actionOf(to)} onClick={() => move([mail.id], to)}>
                          <HugeiconsIcon icon={BOX[to].icon} size={16} aria-hidden="true" />
                        </Tooltip.Trigger>
                        <Tooltip.Portal container={portal}>
                          <Tooltip.Positioner className="ib-layer" sideOffset={6}>
                            <Tooltip.Popup className="ib-tip">{actionOf(to)}</Tooltip.Popup>
                          </Tooltip.Positioner>
                        </Tooltip.Portal>
                      </Tooltip.Root>
                    ))}
                  </span>
                </motion.div>
              </motion.li>
            );
          })}
        </ul>

        {shown.length === 0 && moving.length === 0 && (
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
        )}

        <Toast.Viewport className="ib-toasts">
          <Toasts />
        </Toast.Viewport>

      </section>
    </MotionConfig>
  );
}

/** The undo toast, with a bar that runs down until it's gone. */
function Toasts() {
  const { toasts } = Toast.useToastManager();
  return toasts.map((t) => (
    <Toast.Root key={t.id} toast={t} className="ib-toast" style={{ "--ib-undo": `${UNDO_MS}ms` } as CSSProperties}>
      <Toast.Content className="ib-toast-body">
        <Toast.Title className="ib-toast-title" render={<p />} />
        <Toast.Action className="ib-undo" />
      </Toast.Content>
      <span className="ib-countdown" aria-hidden="true" />
    </Toast.Root>
  ));
}
