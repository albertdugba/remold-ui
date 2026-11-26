"use client";

import { Button } from "@base-ui/react/button";
import { Field } from "@base-ui/react/field";
import { FavouriteIcon, GiftIcon, Leaf01Icon, Sun03Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon, type IconSvgElement } from "@hugeicons/react";
import { announce } from "@remold-ui/dom";
import { Remold } from "@remold-ui/react";
import { AnimatePresence, LayoutGroup, MotionConfig, motion } from "motion/react";
import { useCallback, useEffect, useEffectEvent, useRef, useState, type CSSProperties } from "react";
import { useControllableState, type ChangeDetails } from "./use-controllable-state";
import { useMeasuredHeight } from "./use-measured-height";
import { useScript } from "./use-script";

export type NoteStage = "pick" | "write" | "sealing" | "added";

export interface NoteValue {
  stage: NoteStage;
  design: string | null;
  message: string;
}

export interface NoteDesign {
  id: string;
  name: string;
  icon: IconSvgElement;
  fill: string;
  ink: string;
  darkFill: string;
  darkInk: string;
  accent: string;
  accentInk: string;
}

const SPRING = { type: "spring" as const, duration: 0.5, bounce: 0.2 };
const CARRY = { type: "spring" as const, duration: 0.6, bounce: 0.16 };
const QUICK = { duration: 0.14 };
const LIMIT = 140;
const SEALED_FOR = 1250;
const EMPTY: NoteValue = { stage: "pick", design: null, message: "" };
const ROSE = { accent: "#d9577a", accentInk: "#ffffff" };

const HEADINGS: Record<NoteStage, string> = {
  pick: "Add a gift note",
  write: "Write your note",
  sealing: "Sealing your note",
  added: "Gift note added",
};

const STARTERS = [
  { label: "Happy birthday", text: (to: string) => `Happy birthday, ${to}! ` },
  { label: "Thinking of you", text: (to: string) => `Thinking of you, ${to}. ` },
  { label: "Congratulations", text: (to: string) => `Congratulations, ${to}! ` },
  { label: "Thank you", text: (to: string) => `Thank you, ${to}. ` },
];

const RULED: CSSProperties = {
  backgroundImage:
    "linear-gradient(to bottom, transparent calc(1.5em - 1px), color-mix(in oklab, currentColor 16%, transparent) calc(1.5em - 1px), color-mix(in oklab, currentColor 16%, transparent) 1.5em)",
  backgroundSize: "100% 1.5em",
  backgroundAttachment: "local",
};

const PALETTE = [
  "[--gn-surface:#ffffff] [--gn-well:#f4f4f5] [--gn-ink:#18181b] [--gn-muted:#6c6c75] [--gn-line:rgb(24_24_27/0.08)]",
  "[--gn-envelope:#c8ad80] [--gn-envelope-front:#e0cba5] [--gn-envelope-flap:#d3b98c]",
  "dark:[--gn-surface:#1f1f23] dark:[--gn-well:#2a2a2f] dark:[--gn-ink:#fafafa] dark:[--gn-muted:#a1a1aa] dark:[--gn-line:rgb(255_255_255/0.08)]",
  "dark:[--gn-envelope:#4b3d2b] dark:[--gn-envelope-front:#6b5840] dark:[--gn-envelope-flap:#7d6849]",
  "font-sans text-[14px] leading-[1.4] text-(--gn-ink) antialiased",
].join(" ");

const FOCUS = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--gn-ink)";
const PRIMARY = `inline-flex h-9 cursor-pointer items-center justify-center rounded-xl border-0 bg-(--gn-accent) px-4 text-[13.5px] font-semibold text-(--gn-accent-ink) transition-[background-color,color,opacity] duration-300 ease-out hover:opacity-90 disabled:cursor-default disabled:bg-(--gn-well) disabled:text-(--gn-muted) disabled:hover:opacity-100 motion-reduce:transition-none ${FOCUS}`;
const NOTE = "bg-(--note) text-(--note-ink) dark:bg-(--note-dark) dark:text-(--note-dark-ink)";

const colours = (design: NoteDesign) =>
  ({ "--note": design.fill, "--note-ink": design.ink, "--note-dark": design.darkFill, "--note-dark-ink": design.darkInk }) as CSSProperties;

const part = (delay = 0) => ({
  initial: { opacity: 0, scale: 0.94, filter: "blur(6px)" },
  animate: { opacity: 1, scale: 1, filter: "blur(0px)", transition: { ...SPRING, delay } },
  exit: { opacity: 0, scale: 0.94, filter: "blur(6px)", transition: QUICK },
});

function Seal({ design, big }: { design: NoteDesign; big?: boolean }) {
  return (
    <motion.span
      className={`absolute left-1/2 z-30 grid -translate-x-1/2 place-items-center rounded-full ${NOTE} ${big ? "top-[70px] size-9 shadow-[0_0_0_3px_var(--gn-envelope-flap)]" : "top-[14px] size-[18px]"}`}
      style={colours(design)}
      initial={big ? { scale: 0, opacity: 0 } : false}
      animate={{ scale: 1, opacity: 1, transition: big ? { type: "spring", duration: 0.4, bounce: 0.45, delay: 0.95 } : undefined }}
    >
      <HugeiconsIcon icon={design.icon} strokeWidth={2} className={big ? "size-[18px]" : "size-2.5"} aria-hidden="true" />
    </motion.span>
  );
}

function PickStage({ designs, to, onPick }: { designs: NoteDesign[]; to: string; onPick: (design: string) => void }) {
  return (
    <motion.div key="pick" className="grid gap-3" exit={{ opacity: 0, transition: QUICK }}>
      <motion.p {...part(0.04)} className="m-0 px-1 text-[13.5px] text-(--gn-muted)">
        It's printed and tucked in with {to}'s order. Pick a card to start.
      </motion.p>

      <div className="grid grid-cols-4 gap-2" role="group" aria-label="Card designs">
        {designs.map((design, index) => (
          <motion.span key={design.id} className="grid" {...part(0.08 + index * 0.04)}>
            <Button
              aria-label={`${design.name} card`}
              className={`grid cursor-pointer justify-items-center gap-1.5 rounded-[14px] border-0 bg-transparent p-0 text-inherit ${FOCUS}`}
              onClick={() => onPick(design.id)}
              render={<motion.button whileHover={{ y: -2 }} whileTap={{ scale: 0.96 }} />}
            >
              <motion.span
                layoutId={`gn-note-${design.id}`}
                transition={CARRY}
                className={`grid aspect-[4/5] w-full place-items-center ${NOTE}`}
                style={{ ...colours(design), borderRadius: 12 }}
              >
                <HugeiconsIcon icon={design.icon} strokeWidth={1.8} className="size-6" aria-hidden="true" />
              </motion.span>
              <span className="text-[12.5px] font-medium text-(--gn-muted)">{design.name}</span>
            </Button>
          </motion.span>
        ))}
      </div>
    </motion.div>
  );
}

function DesignSwatches({ designs, chosen, onChoose }: { designs: NoteDesign[]; chosen: string; onChoose: (design: string) => void }) {
  return (
    <div className="flex items-center gap-1 pl-1" role="radiogroup" aria-label="Card">
      {designs.map((design) => {
        const selected = design.id === chosen;

        return (
          <button
            key={design.id}
            type="button"
            role="radio"
            aria-checked={selected}
            aria-label={`${design.name} card`}
            className={`grid size-8 cursor-pointer place-items-center rounded-full border-0 bg-transparent p-0 ${FOCUS}`}
            onClick={() => onChoose(design.id)}
          >
            <span
              className={`block size-[22px] rounded-full transition-[box-shadow,scale] duration-200 ease-out motion-reduce:transition-none ${NOTE} ${selected ? "scale-100 shadow-[0_0_0_2px_var(--gn-surface),0_0_0_3.5px_var(--gn-accent)]" : "scale-90 shadow-[inset_0_0_0_1px_rgb(0_0_0/0.06)] hover:scale-100"}`}
              style={colours(design)}
            />
          </button>
        );
      })}
    </div>
  );
}

function WriteStage({
  design,
  designs,
  to,
  from,
  message,
  onMessage,
  onDesign,
  onAdd,
}: {
  design: NoteDesign;
  designs: NoteDesign[];
  to: string;
  from: string;
  message: string;
  onMessage: (message: string) => void;
  onDesign: (design: string) => void;
  onAdd: () => void;
}) {
  const field = useRef<HTMLTextAreaElement>(null);

  const focusOnMount = useCallback((node: HTMLTextAreaElement | null) => {
    field.current = node;
    node?.focus({ preventScroll: true });
  }, []);

  const blank = !message.trim();

  const start = (text: string) => {
    onMessage(text);
    requestAnimationFrame(() => field.current?.focus({ preventScroll: true }));
  };

  return (
    <motion.div key="write" className="grid gap-3" exit={{ opacity: 0, transition: QUICK }}>
      <motion.div layoutId={`gn-note-${design.id}`} transition={CARRY} className={`grid gap-2 p-4 ${NOTE}`} style={{ ...colours(design), borderRadius: 18 }}>
        <span className="flex items-center justify-between text-[13px] font-semibold">
          To {to}
          <HugeiconsIcon icon={design.icon} strokeWidth={1.8} className="size-5 opacity-70" aria-hidden="true" />
        </span>

        <Field.Root className="grid">
          <Field.Label className="sr-only">Your message to {to}</Field.Label>
          <Field.Control
            value={message}
            onValueChange={(next) => onMessage(next.slice(0, LIMIT))}
            maxLength={LIMIT}
            placeholder="Write a few words…"
            render={<textarea ref={focusOnMount} rows={4} style={RULED} />}
            className="resize-none border-0 bg-transparent p-0 font-serif text-[17px] leading-[1.5] text-inherit italic outline-none placeholder:text-current placeholder:opacity-45"
          />
        </Field.Root>

        <span className="flex items-center justify-between text-[12.5px] opacity-70">
          <span>— {from}</span>
          <span className="tabular-nums">
            {message.length}/{LIMIT}
          </span>
        </span>
      </motion.div>

      <AnimatePresence initial={false}>
        {blank && (
          <motion.div key="starters" {...part(0.14)} className="flex flex-wrap gap-1.5 px-0.5" role="group" aria-label="Start with">
            {STARTERS.map((starter) => (
              <motion.button
                key={starter.label}
                type="button"
                whileTap={{ scale: 0.96 }}
                className={`h-8 cursor-pointer rounded-full border-0 bg-(--gn-well) px-3 font-sans text-[12.5px] font-medium text-(--gn-ink) transition-[background-color] duration-150 ease-out hover:bg-[color-mix(in_oklab,var(--gn-accent)_14%,var(--gn-well))] ${FOCUS}`}
                onClick={() => start(starter.text(to))}
              >
                {starter.label}
              </motion.button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      <motion.div {...part(0.2)} className="flex items-center justify-between gap-2">
        <DesignSwatches designs={designs} chosen={design.id} onChoose={onDesign} />
        <Button className={PRIMARY} disabled={blank} onClick={onAdd} render={<motion.button whileTap={{ scale: 0.97 }} />}>
          Add note
        </Button>
      </motion.div>
    </motion.div>
  );
}

function SealingStage({ design, onSealed }: { design: NoteDesign; onSealed: () => void }) {
  const finish = useEffectEvent(onSealed);

  useEffect(() => {
    const timer = setTimeout(finish, SEALED_FOR);

    return () => clearTimeout(timer);
  }, []);

  return (
    <motion.div key="sealing" className="grid place-items-center pt-24 pb-4" exit={{ opacity: 0, transition: QUICK }}>
      <motion.div
        layoutId="gn-envelope"
        transition={CARRY}
        className="relative h-[150px] w-[236px] bg-(--gn-envelope)"
        style={{ borderRadius: 14, perspective: 700 }}
        initial={{ y: 30, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
      >
        <motion.div
          layoutId={`gn-note-${design.id}`}
          transition={CARRY}
          className={`absolute inset-x-4 top-3 grid h-[118px] place-items-center ${NOTE}`}
          style={{ ...colours(design), borderRadius: 10 }}
        >
          <HugeiconsIcon icon={design.icon} strokeWidth={1.8} className="size-6 opacity-70" aria-hidden="true" />
        </motion.div>

        <span className="absolute inset-0 z-10 [filter:drop-shadow(0_-1px_1px_rgb(0_0_0/0.18))]" aria-hidden="true">
          <span className="absolute inset-0 bg-(--gn-envelope-front)" style={{ clipPath: "polygon(0 0, 50% 58%, 100% 0, 100% 100%, 0 100%)", borderRadius: 14 }} />
        </span>

        <motion.span
          className="absolute inset-x-0 top-0 z-20 h-[88px] origin-top [filter:drop-shadow(0_1px_1.5px_rgb(0_0_0/0.22))]"
          initial={{ rotateX: 180 }}
          animate={{ rotateX: 0, transition: { type: "spring", duration: 0.55, bounce: 0.15, delay: 0.55 } }}
          aria-hidden="true"
        >
          <span className="absolute inset-0 bg-(--gn-envelope-flap)" style={{ clipPath: "polygon(0 0, 100% 0, 50% 100%)", borderRadius: "14px 14px 0 0" }} />
        </motion.span>
        <Seal design={design} big />
      </motion.div>
    </motion.div>
  );
}

function AddedStage({ design, to, from, message, onEdit, onRemove }: { design: NoteDesign; to: string; from: string; message: string; onEdit: () => void; onRemove: () => void }) {
  return (
    <motion.div key="added" className="grid gap-3" exit={{ opacity: 0, transition: QUICK }}>
      <div className="flex items-center gap-3">
        <motion.span layoutId="gn-envelope" transition={CARRY} className="relative h-[38px] w-[54px] flex-none bg-(--gn-envelope)" style={{ borderRadius: 7 }} aria-hidden="true">
          <span className="absolute inset-x-0 top-0 h-[22px] [filter:drop-shadow(0_1px_0.5px_rgb(0_0_0/0.2))]">
            <span className="absolute inset-0 bg-(--gn-envelope-front)" style={{ clipPath: "polygon(0 0, 100% 0, 50% 100%)", borderRadius: "7px 7px 0 0" }} />
          </span>
          <Seal design={design} />
        </motion.span>

        <motion.span {...part(0.08)} className="grid min-w-0 flex-1 gap-px">
          <span className="text-[14.5px] font-semibold">Note for {to}</span>
          <span className="text-[12.5px] text-(--gn-muted)">{design.name} card · in the box</span>
        </motion.span>

        <motion.span {...part(0.12)} className="grid">
          <Button
            className={`h-8 cursor-pointer rounded-full border-0 bg-(--gn-well) px-3.5 text-[13px] font-semibold text-(--gn-ink) transition-[opacity] duration-150 ease-out hover:opacity-80 ${FOCUS}`}
            onClick={onEdit}
          >
            Edit
          </Button>
        </motion.span>
      </div>

      <motion.blockquote
        {...part(0.16)}
        className={`m-0 line-clamp-3 rounded-[14px] px-4 py-3 font-serif text-[15px] leading-[1.5] italic [overflow-wrap:anywhere] ${NOTE}`}
        style={colours(design)}
      >
        “{message.trim()}”
        <span className="block pt-1 font-sans text-[12px] not-italic opacity-70">— {from}</span>
      </motion.blockquote>

      <motion.div {...part(0.2)} className="flex justify-end">
        <Button
          className={`cursor-pointer rounded-full border-0 bg-transparent px-1 text-[13px] font-medium text-(--gn-muted) transition-[color] duration-150 ease-out hover:text-(--gn-ink) ${FOCUS}`}
          onClick={onRemove}
        >
          Remove note
        </Button>
      </motion.div>
    </motion.div>
  );
}

export interface GiftNoteProps {
  designs: NoteDesign[];
  to: string;
  from: string;
  value?: NoteValue;
  defaultValue?: NoteValue;
  onValueChange?: (value: NoteValue, details: ChangeDetails) => void;
}

export function GiftNote({ designs, to, from, value, defaultValue = EMPTY, onValueChange }: GiftNoteProps) {
  const [note, setNote] = useControllableState<NoteValue>({ value, defaultValue, onValueChange });
  const [measure, height] = useMeasuredHeight();
  const design = designs.find((each) => each.id === note.design) ?? null;
  const theme = design ?? ROSE;

  const update = (patch: Partial<NoteValue>) => setNote({ ...note, ...patch });

  const sealed = () => {
    announce("Gift note added to the order");
    setNote((current) => ({ ...current, stage: "added" }), "timer");
  };

  return (
    <MotionConfig transition={SPRING} reducedMotion="user">
      <motion.section
        aria-label="Gift note"
        initial={false}
        animate={{ height: height ?? "auto" }}
        className={`w-[min(100%,420px)] overflow-hidden rounded-[28px] bg-(--gn-surface) ${PALETTE}`}
        style={{ "--gn-accent": theme.accent, "--gn-accent-ink": theme.accentInk } as CSSProperties}
      >
        <LayoutGroup id="gift-note">
          <div ref={measure} className="grid grid-cols-[minmax(0,1fr)] gap-4 p-4">
            <header className="px-1 pt-1">
              <h3 className="m-0 text-[19px] font-semibold tracking-[-0.02em]">
                <Remold.Text>{HEADINGS[note.stage]}</Remold.Text>
              </h3>
            </header>

            <AnimatePresence initial={false} mode="popLayout">
              {note.stage === "pick" && <PickStage key="pick" designs={designs} to={to} onPick={(id) => update({ design: id, stage: "write" })} />}
              {note.stage === "write" && design && (
                <WriteStage
                  key="write"
                  design={design}
                  designs={designs}
                  to={to}
                  from={from}
                  message={note.message}
                  onMessage={(message) => update({ message })}
                  onDesign={(id) => update({ design: id })}
                  onAdd={() => update({ stage: "sealing" })}
                />
              )}
              {note.stage === "sealing" && design && <SealingStage key="sealing" design={design} onSealed={sealed} />}
              {note.stage === "added" && design && (
                <AddedStage key="added" design={design} to={to} from={from} message={note.message} onEdit={() => update({ stage: "write" })} onRemove={() => setNote(EMPTY)} />
              )}
            </AnimatePresence>
          </div>
        </LayoutGroup>
      </motion.section>
    </MotionConfig>
  );
}

const tone = (fill: string, ink: string, darkFill: string, darkInk: string, accent: string, accentInk = "#ffffff") => ({ fill, ink, darkFill, darkInk, accent, accentInk });

const DESIGNS: NoteDesign[] = [
  { id: "sunny", name: "Sunny", icon: Sun03Icon, ...tone("#f2e6b8", "#4a3f12", "#3a3420", "#f2e6b8", "#b98a1c") },
  { id: "love", name: "Love", icon: FavouriteIcon, ...tone("#f3d6d2", "#5e2620", "#432926", "#f3d6d2", "#d9577a") },
  { id: "gift", name: "Gift", icon: GiftIcon, ...tone("#d6e1f5", "#22355c", "#25304a", "#d6e1f5", "#4a6fc9") },
  { id: "leaf", name: "Leaf", icon: Leaf01Icon, ...tone("#dbe6d3", "#2c4423", "#28342a", "#dbe6d3", "#4f7d42") },
];

const MESSAGE = "Happy birthday, Esi! Wear it on every adventure.";
const WRITING: NoteValue = { stage: "write", design: "sunny", message: "" };

export function GiftNoteDemo({ playing }: { playing?: boolean } = {}) {
  const shell = useRef<HTMLDivElement>(null);
  const [note, setNote] = useState(EMPTY);

  useScript(shell, playing, [
    [1600, () => setNote(EMPTY)],
    [1100, () => setNote(WRITING)],
    ...[...MESSAGE].map((_, index) => [index === MESSAGE.length - 1 ? 900 : 36, () => setNote({ ...WRITING, message: MESSAGE.slice(0, index + 1) })] as const),
    [SEALED_FOR + 3200, () => setNote({ ...WRITING, message: MESSAGE, stage: "sealing" })],
  ]);

  return (
    <div ref={shell} className="not-prose grid min-h-[480px] w-full place-items-center py-4">
      <GiftNote designs={DESIGNS} to="Esi" from="Ama" value={note} onValueChange={setNote} />
    </div>
  );
}
