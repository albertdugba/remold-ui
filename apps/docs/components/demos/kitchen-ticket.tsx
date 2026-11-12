"use client";
import { HugeiconsIcon } from "@hugeicons/react";
import { Cancel01Icon, Tick02Icon } from "@hugeicons/core-free-icons";
import { Remold } from "@remold-ui/react";
import { AnimatePresence, motion } from "motion/react";
import { useRef, type Ref } from "react";
import { Picker } from "./picker";
import { useControllableState } from "./use-controllable-state";
import { useScene } from "./use-scene";

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

const TOKENS = [
  "[--kt-fill:#f4f4f5] [--kt-line:rgb(24_24_27/0.08)] [--kt-ink:#18181b] [--kt-muted:#71717a] [--kt-quiet:#a1a1aa]",
  "[--kt-preparing:#e07a2f] [--kt-ready:#10b981] [--kt-picked:#6366f1]",
  "dark:[--kt-fill:#2e2e33] dark:[--kt-line:rgb(255_255_255/0.08)] dark:[--kt-ink:#fafafa] dark:[--kt-muted:#a1a1aa] dark:[--kt-quiet:#71717a]",
  "dark:[--kt-preparing:#fb923c] dark:[--kt-ready:#34d399] dark:[--kt-picked:#818cf8]",
].join(" ");
const LAYER_TOKENS = `${TOKENS} [--kt-surface:#ffffff] dark:[--kt-surface:#2a2a2f]`;
const CARD_TOKENS = `${TOKENS} [--kt-surface:#ffffff] dark:[--kt-surface:#232327]`;

function StatusIcon({ status, size = 16 }: { status: Status; size?: number }) {
  const look = of(status);
  const closed = status === "picked" || status === "canceled";
  return (
    <svg
      className="flex-none overflow-visible"
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
        className="text-(--kt-surface)"
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
    <span
      className="relative box-border size-3.5 flex-none rounded-full border-[1.5px] border-solid border-current after:absolute after:inset-0.5 after:rounded-full after:border after:border-solid after:border-current after:opacity-70 after:content-['']"
      aria-hidden="true"
    />
  ) : (
    <span
      className="relative mt-[3px] box-border h-2.5 w-3 flex-none rounded-[2px_2px_3px_3px] border-[1.5px] border-solid border-current before:absolute before:-top-[5px] before:left-0.5 before:h-1 before:w-[5px] before:rounded-t-[4px] before:border-[1.5px] before:border-b-0 before:border-solid before:border-current before:content-['']"
      aria-hidden="true"
    />
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
  open: boolean;
  service: Service;
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
  highlighted?: Status | null;
  ref?: Ref<HTMLElement>;
}

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
    <section
      ref={ref}
      className={`not-prose grid w-[min(100%,380px)] rounded-3xl bg-(--kt-surface) px-[18px] pt-[18px] pb-3.5 font-sans text-(--kt-ink) ${CARD_TOKENS}`}
      aria-label="Kitchen ticket"
    >
      <header className="flex items-center justify-between">
        <span className="text-[12px] font-medium text-(--kt-muted) tabular-nums">#148</span>
        <img
          className="size-6 rounded-full bg-[#ffedd5]"
          src="https://api.dicebear.com/9.x/notionists/svg?seed=Ama%20Mensah&backgroundColor=ffedd5"
          alt="Ordered by Ama Mensah"
          width={24}
          height={24}
          draggable={false}
        />
      </header>
      <h4 className="m-0 mt-2 text-[16px] leading-[1.35] font-semibold tracking-[-0.01em]">Brisket sandwich, extra pickles and a cold lime soda</h4>

      <div className="mt-3.5 flex flex-wrap items-center gap-1.5">
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
          layerClassName={LAYER_TOKENS}
        />
        <Picker
          label="Service"
          heading="For here or to-go…"
          options={SERVICE}
          value={ticket.service}
          onValueChange={(service) => setTicket((current) => ({ ...current, service }))}
          icon={(service) => <ServiceIcon service={service} />}
          layerClassName={LAYER_TOKENS}
        />
        <span className="inline-flex h-7 items-center gap-1.5 rounded-full border border-solid border-(--kt-line) bg-(--kt-surface) pr-2.5 pl-2 text-[12.5px] font-medium text-(--kt-muted)">
          <i className="size-2 rounded-full bg-(--kt-preparing)" aria-hidden="true" />
          Table 4
        </span>
      </div>

      <ol
        className="m-0 mt-4 grid list-none border-t border-solid border-(--kt-line) px-0 pt-2.5 pb-0 [&>li]:overflow-hidden"
        aria-label="The line"
      >
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
              <span className="flex items-center gap-2 py-[5px] text-[12.5px] text-(--kt-muted)">
                <StatusIcon status={entry.to} size={14} />
                <span className="min-w-0 flex-1">
                  <b className="font-medium text-(--kt-ink)">{entry.author}</b>
                  {` · ${entry.line}`}
                </span>
                <time className="text-[11.5px] text-(--kt-quiet)">{entry.ago}</time>
              </span>
            </motion.li>
          ))}
        </AnimatePresence>
      </ol>
    </section>
  );
}

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
