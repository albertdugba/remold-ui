"use client";
/**
 * A counter ticket. The menu springs open from the status button, a highlight glides to whatever
 * you point at, and the ring fills as the order cooks: empty when it comes in, half on the grill,
 * most of the way at the pass. Picked up and canceled fill the circle and draw a check or a cross,
 * which reshape into each other. Each change lands on the line below.
 *
 * Built on the shared `Picker` (Base UI's Select, with Motion on top), used again for for-here or
 * to-go. The check and cross reshape with `Remold.Icon`. It plays a short scene while
 * it's on screen. Touch it and it's yours. The order and the people are made up.
 */
import { HugeiconsIcon } from "@hugeicons/react";
import { Cancel01Icon, Tick02Icon } from "@hugeicons/core-free-icons";
import { Remold } from "@remold-ui/react";
import { AnimatePresence, motion } from "motion/react";
import { useRef } from "react";
import { Picker } from "./picker";
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

/** The ticket glyph: a ring that fills as the order cooks, then a solid disc with a check or a cross. */
function StatusIcon({ status, size = 16 }: { status: Status; size?: number }) {
  const s = of(status);
  const closed = status === "picked" || status === "canceled";
  return (
    <svg className="kt-glyph" viewBox="0 0 24 24" width={size} height={size} aria-hidden="true" style={{ color: s.color }}>
      <circle cx={12} cy={12} r={9} fill="none" stroke="currentColor" strokeWidth={2} />
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
        className="kt-mark"
        initial={false}
        animate={{ opacity: closed ? 1 : 0, scale: closed ? 1 : 0.6 }}
        style={{ transformOrigin: "12px 12px" }}
        transition={SPRING}
      >
        <Remold.Icon icon={<HugeiconsIcon icon={status === "canceled" ? Cancel01Icon : Tick02Icon} />} strokeWidth={2.4} width={24} height={24} />
      </motion.g>
    </svg>
  );
}

const SERVICE = [
  { value: "here", label: "For here" },
  { value: "togo", label: "To-go" },
] as const;
type Service = (typeof SERVICE)[number]["value"];

/** A plate for the dining room, a bag for the window. */
function ServiceIcon({ service }: { service: Service }) {
  return service === "here" ? <span className="kt-plate" aria-hidden="true" /> : <span className="kt-bag" aria-hidden="true" />;
}

const STATUS_OPTIONS = STATUSES.map((status) => ({ value: status.id, label: status.label }));

interface Entry {
  key: string;
  who: string;
  line: string;
  to: Status;
  ago: string;
}

interface State {
  status: Status;
  open: boolean;
  /** The option the highlight sits on while the menu is open. */
  hover: number;
  service: Service;
  log: readonly Entry[];
}

const START: Entry[] = [{ key: "in", who: "Ama", line: "Ticket in", to: "received", ago: "4m" }];
const GRILL: Entry = { key: "grill", who: "You", line: "On the grill", to: "preparing", ago: "now" };
const PASS: Entry = { key: "pass", who: "You", line: "At the pass", to: "ready", ago: "now" };
const OUT: Entry = { key: "out", who: "You", line: "Picked up", to: "picked", ago: "now" };

const index = (id: Status) => STATUSES.findIndex((status) => status.id === id);

const BEATS: readonly (State & { ms: number })[] = [
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

const fromBeat = (step: number): State => {
  const { ms: _, ...state } = BEATS[step]!;
  return state;
};

interface KitchenTicketDemoProps {
  /** Plays and pauses the scene from outside, as the home page's card does. Leave it out to play until touched. */
  playing?: boolean;
}

export function KitchenTicketDemo({ playing }: KitchenTicketDemoProps = {}) {
  const scene = useScene(BEATS, fromBeat, playing);
  const { state, take } = scene;
  const counter = useRef(2);

  const choose = (next: Status) =>
    take((current) => {
      if (next === current.status) return { ...current, open: false };
      const entry = { key: `u${counter.current++}`, who: "You", line: of(next).label, to: next, ago: "now" };
      return { ...current, status: next, open: false, log: [...current.log, entry].slice(-4) };
    });

  return (
    <section ref={scene.ref} className="kt not-prose" aria-label="Kitchen ticket">
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
          value={state.status}
          onValueChange={choose}
          icon={(status) => <StatusIcon status={status} size={15} />}
          open={state.open}
          onOpenChange={(open) => take((current) => ({ ...current, open, hover: index(current.status) }))}
          preview={scene.live && state.open ? STATUSES[state.hover]!.id : null}
          layerClassName="kt-tokens"
        />
        <Picker
          label="Service"
          heading="For here or to-go…"
          options={SERVICE}
          value={state.service}
          onValueChange={(service) => take((current) => ({ ...current, service }))}
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
          {state.log.map((entry) => (
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
                  <b>{entry.who}</b>
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
