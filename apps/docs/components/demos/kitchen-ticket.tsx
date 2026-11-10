"use client";
import { HugeiconsIcon } from "@hugeicons/react";
import { Cancel01Icon, Tick02Icon } from "@hugeicons/core-free-icons";
import { Remold } from "@remold-ui/react";
import { AnimatePresence, motion } from "motion/react";
import { useRef, type Ref } from "react";
import { Picker } from "./picker";
import { useControllableState } from "./use-controllable-state";
import { useScene } from "./use-scene";
import "./kitchen-ticket.css";

const STATUSES = [
  { id: "received", label: "Received", fill: 0, color: "var(--kt-quiet)" },
  { id: "preparing", label: "Preparing", fill: 0.5, color: "var(--kt-preparing)" },
  { id: "ready", label: "Ready", fill: 0.8, color: "var(--kt-ready)" },
  { id: "picked", label: "Picked up", fill: 1, color: "var(--kt-picked)" },
  { id: "canceled", label: "Canceled", fill: 1, color: "var(--kt-quiet)" },
] as const;
type Status = (typeof STATUSES)[number]["id"];

const of = (id: Status) => STATUSES.find((status) => status.id === id)!;

const SPRING = { type: "spring" as const, duration: 0.4, bounce: 0.15 };

function StatusIcon({ status, size = 16 }: { status: Status; size?: number }) {
  const look = of(status);
  const closed = status === "picked" || status === "canceled";
  return (
    <svg
      className="kt-glyph"
      viewBox="0 0 24 24"
      width={size}
      height={size}
      aria-hidden="true"
      style={{ color: look.color }}
    >
      <circle cx={12} cy={12} r={9} fill="none" stroke="currentColor" strokeWidth={2} />
      <motion.circle
        cx={12}
        cy={12}
        r={3.5}
        fill="none"
        stroke="currentColor"
        strokeWidth={7}
        transform="rotate(-90 12 12)"
        initial={false}
        animate={{ pathLength: look.fill, opacity: look.fill ? 1 : 0 }}
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
        className="kt-mark"
        initial={false}
        animate={{ opacity: closed ? 1 : 0, scale: closed ? 1 : 0.6 }}
        style={{ transformOrigin: "12px 12px" }}
        transition={SPRING}
      >
        <Remold.Icon
          icon={<HugeiconsIcon icon={status === "canceled" ? Cancel01Icon : Tick02Icon} />}
          strokeWidth={2.4}
          width={24}
          height={24}
        />
      </motion.g>
    </svg>
  );
}

const SERVICE = [
  { value: "here", label: "For here" },
  { value: "togo", label: "To-go" },
] as const;
type Service = (typeof SERVICE)[number]["value"];

function ServiceIcon({ service }: { service: Service }) {
  return service === "here" ? (
    <span className="kt-plate" aria-hidden="true" />
  ) : (
    <span className="kt-bag" aria-hidden="true" />
  );
}

const STATUS_OPTIONS = STATUSES.map((status) => ({ value: status.id, label: status.label }));

export interface TicketEntry {
  key: string;
  author: string;
  line: string;
  to: Status;
  ago: string;
}

export interface KitchenTicketValue {
  status: Status;
  /** Whether the status menu is open. */
  open: boolean;
  service: Service;
  /** The latest updates on the line, oldest first. */
  log: readonly TicketEntry[];
}

interface SceneState extends KitchenTicketValue {
  hover: number;
}

const START: TicketEntry[] = [{ key: "in", author: "Ama", line: "Ticket in", to: "received", ago: "4m" }];
const GRILL: TicketEntry = { key: "grill", author: "You", line: "On the grill", to: "preparing", ago: "now" };
const PASS: TicketEntry = { key: "pass", author: "You", line: "At the pass", to: "ready", ago: "now" };
const OUT: TicketEntry = { key: "out", author: "You", line: "Picked up", to: "picked", ago: "now" };

const index = (id: Status) => STATUSES.findIndex((status) => status.id === id);

export interface KitchenTicketProps {
  value?: KitchenTicketValue;
  defaultValue?: KitchenTicketValue;
  onValueChange?: (value: KitchenTicketValue) => void;
  /** An option to show highlighted in the open status menu, as a guided walkthrough does. */
  highlighted?: Status | null;
  ref?: Ref<HTMLElement>;
}

/** A kitchen ticket whose status and service you change from its menus, logging each move. */
export function KitchenTicket({
  value,
  defaultValue = { status: "received", open: false, service: "here", log: START },
  onValueChange,
  highlighted = null,
  ref,
}: KitchenTicketProps) {
  const [ticket, setTicket] = useControllableState({ value, defaultValue, onValueChange });
  const entryCount = useRef(2);

  const choose = (status: Status) =>
    setTicket((current) => {
      if (status === current.status) return { ...current, open: false };
      const entry = {
        key: `u${entryCount.current++}`,
        author: "You",
        line: of(status).label,
        to: status,
        ago: "now",
      };
      return { ...current, status, open: false, log: [...current.log, entry].slice(-4) };
    });

  return (
    <section ref={ref} className="kt not-prose" aria-label="Kitchen ticket">
      <header className="kt-head">
        <span className="kt-key">#148</span>
        <img
          className="kt-guest"
          src="https://api.dicebear.com/9.x/notionists/svg?seed=Ama%20Mensah&backgroundColor=ffedd5"
          alt="Ordered by Ama Mensah"
          width={24}
          height={24}
          draggable={false}
        />
      </header>
      <h4 className="kt-title">Brisket sandwich, extra pickles and a cold lime soda</h4>

      <div className="kt-props">
        <Picker
          label="Ticket"
          heading="Update the ticket…"
          options={STATUS_OPTIONS}
          value={ticket.status}
          onValueChange={choose}
          icon={(status) => <StatusIcon status={status} size={15} />}
          open={ticket.open}
          onOpenChange={(open) => setTicket((current) => ({ ...current, open }))}
          preview={ticket.open ? highlighted : null}
          layerClassName="kt-tokens"
        />
        <Picker
          label="Service"
          heading="For here or to-go…"
          options={SERVICE}
          value={ticket.service}
          onValueChange={(service) => setTicket((current) => ({ ...current, service }))}
          icon={(service) => <ServiceIcon service={service} />}
          layerClassName="kt-tokens"
        />
        <span className="kt-chip">
          <i className="kt-dot" aria-hidden="true" />
          Table 4
        </span>
      </div>

      <ol className="kt-log" aria-label="The line">
        <AnimatePresence initial={false}>
          {ticket.log.map((entry) => (
            <motion.li
              key={entry.key}
              layout="position"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={SPRING}
            >
              <span className="kt-log-row">
                <StatusIcon status={entry.to} size={14} />
                <span>
                  <b>{entry.author}</b>
                  {` · ${entry.line}`}
                </span>
                <time>{entry.ago}</time>
              </span>
            </motion.li>
          ))}
        </AnimatePresence>
      </ol>
    </section>
  );
}

// The docs demo: a short scripted scene that plays the element above. Your app doesn't need it.

const BEATS: readonly (SceneState & { ms: number })[] = [
  { status: "received", open: false, hover: 0, log: START, service: "here", ms: 1300 },
  { status: "received", open: true, hover: 0, log: START, service: "here", ms: 650 },
  { status: "received", open: true, hover: 1, log: START, service: "here", ms: 600 },
  { status: "preparing", open: false, hover: 1, log: [...START, GRILL], service: "here", ms: 1700 },
  { status: "preparing", open: true, hover: 1, log: [...START, GRILL], service: "here", ms: 550 },
  { status: "preparing", open: true, hover: 2, log: [...START, GRILL], service: "here", ms: 600 },
  { status: "ready", open: false, hover: 2, log: [...START, GRILL, PASS], service: "here", ms: 1500 },
  { status: "ready", open: true, hover: 2, log: [...START, GRILL, PASS], service: "here", ms: 450 },
  { status: "ready", open: true, hover: 3, log: [...START, GRILL, PASS], service: "here", ms: 550 },
  { status: "picked", open: false, hover: 3, log: [...START, GRILL, PASS, OUT], service: "here", ms: 2600 },
];

const fromBeat = (step: number): SceneState => {
  const { ms: _, ...state } = BEATS[step]!;
  return state;
};

interface KitchenTicketDemoProps {
  playing?: boolean;
}

export function KitchenTicketDemo({ playing }: KitchenTicketDemoProps = {}) {
  const scene = useScene(BEATS, fromBeat, playing);
  const { hover, ...ticket } = scene.state;
  return (
    <KitchenTicket
      ref={scene.ref}
      value={ticket}
      onValueChange={(next) => scene.takeOver({ ...next, hover: index(next.status) })}
      highlighted={scene.live ? STATUSES[hover]!.id : null}
    />
  );
}
