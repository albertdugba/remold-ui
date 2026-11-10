"use client";
import { Button } from "@base-ui/react/button";
import { Dialog } from "@base-ui/react/dialog";
import { Field } from "@base-ui/react/field";
import { Toggle } from "@base-ui/react/toggle";
import { ToggleGroup } from "@base-ui/react/toggle-group";
import { HugeiconsIcon } from "@hugeicons/react";
import { Add01Icon, Airplane01Icon, Cancel01Icon, Loading03Icon } from "@hugeicons/core-free-icons";
import { AnimatePresence, LayoutGroup, motion, useReducedMotion } from "motion/react";
import { useEffect, useId, useRef, useState } from "react";
import { typing, useScene } from "./use-scene";
import "./morphing-dialog.css";

const SURFACE = { type: "spring" as const, duration: 0.5, bounce: 0.12 };
const SETTLE = { type: "spring" as const, duration: 0.35, bounce: 0 };

const INK = "#0a0a0b";
const PAPER = "#ffffff";

const COLOURS = {
  light: { button: INK, sheet: PAPER },
  dark: { button: "#fafafa", sheet: "#1f1f23" },
};

function useColours() {
  const [dark, setDark] = useState(false);
  useEffect(() => {
    const root = document.documentElement;
    const read = () => setDark(root.classList.contains("dark"));
    read();
    const observer = new MutationObserver(read);
    observer.observe(root, { attributes: true, attributeFilter: ["class"] });
    return () => observer.disconnect();
  }, []);
  return dark ? COLOURS.dark : COLOURS.light;
}

const GROUPS = ["Solo", "Couple", "Family", "Friends"] as const;
type Group = (typeof GROUPS)[number];

export interface Trip {
  /** Where to. */
  name: string;
  group: Group;
  /** Which surface it was made from; a trip made in the dialog keeps the dialog's surface. */
  surface?: number;
}

export interface MorphingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  name: string;
  onNameChange: (name: string) => void;
  group: Group;
  onGroupChange: (group: Group) => void;
  creating: boolean;
  onCreate: () => void;
  /**
   * Which surface is the button's. Bump it when a trip is made, so the dialog's surface lands in
   * the new row and the button gets a new one rather than pulling the row's back.
   */
  surface: number;
  /** Where the dialog mounts. Defaults to the page. */
  container?: HTMLElement | null;
  /** Whether the dialog is a true modal. Turn it off for a demo that opens on its own. */
  modal?: boolean;
}

export function MorphingDialog({
  open,
  onOpenChange,
  name,
  onNameChange,
  group,
  onGroupChange,
  creating,
  onCreate,
  surface,
  container,
  modal = true,
}: MorphingDialogProps) {
  const colours = useColours();
  const reduced = useReducedMotion();
  const id = useId();
  const canCreate = name.trim().length > 0 && !creating;
  const nameField = useRef<HTMLInputElement>(null);

  const fade = (delay = 0) =>
    reduced
      ? { initial: { opacity: 0 }, animate: { opacity: 1 }, transition: { duration: 0.12 } }
      : {
          initial: { opacity: 0, y: 6, filter: "blur(4px)" },
          animate: { opacity: 1, y: 0, filter: "blur(0px)" },
          transition: { ...SETTLE, delay },
        };

  return (
    <Dialog.Root open={open} onOpenChange={(next) => onOpenChange(next)} modal={modal}>
      <Dialog.Trigger className="mdg-trigger" data-open={open || undefined}>
        {!open && (
          <motion.span
            layoutId={`mdg-surface-${surface}`}
            className="mdg-surface"
            initial={false}
            style={{ borderRadius: 999, backgroundColor: colours.button }}
            transition={reduced ? { duration: 0 } : SURFACE}
          />
        )}
        <motion.span
          className="mdg-trigger-label"
          initial={false}
          animate={{ opacity: open ? 0 : 1 }}
          transition={{ duration: open ? 0.08 : 0.2, delay: open ? 0 : 0.18 }}
        >
          <HugeiconsIcon icon={Add01Icon} strokeWidth={2.2} />
          New trip
        </motion.span>
      </Dialog.Trigger>

      <Dialog.Portal container={container}>
        <Dialog.Backdrop className="mdg-backdrop" />
        <Dialog.Popup
          className="mdg-popup"
          aria-describedby={`${id}-description`}
          initialFocus={modal ? nameField : false}
        >
          <motion.span
            layoutId={`mdg-surface-${surface}`}
            className="mdg-surface"
            animate={{ backgroundColor: [colours.button, colours.sheet] }}
            style={{ borderRadius: 28 }}
            transition={reduced ? { duration: 0 } : { ...SURFACE, backgroundColor: { duration: 0.25 } }}
          />
          <form
            className="mdg-form"
            onSubmit={(event) => {
              event.preventDefault();
              if (canCreate) onCreate();
            }}
          >
            <motion.div className="mdg-head" {...fade(0.22)}>
              <span className="mdg-badge" aria-hidden="true">
                <HugeiconsIcon icon={Airplane01Icon} strokeWidth={1.8} />
              </span>
              <span className="mdg-heading">
                <Dialog.Title className="mdg-title">Plan a trip</Dialog.Title>
                <Dialog.Description id={`${id}-description`} className="mdg-description">
                  Start with where you're going. Dates and stays can come later.
                </Dialog.Description>
              </span>
              <Dialog.Close className="mdg-close" aria-label="Close" disabled={creating}>
                <HugeiconsIcon icon={Cancel01Icon} strokeWidth={2} />
              </Dialog.Close>
            </motion.div>

            <motion.div {...fade(0.26)}>
              <Field.Root className="mdg-field">
                <Field.Label className="mdg-label">Destination</Field.Label>
                <Field.Control
                  ref={nameField}
                  className="mdg-input"
                  placeholder="Where to?"
                  autoComplete="off"
                  value={name}
                  readOnly={creating}
                  onChange={(event) => onNameChange(event.target.value)}
                />
              </Field.Root>
            </motion.div>

            <motion.div className="mdg-field" {...fade(0.3)}>
              <span className="mdg-label" id={`${id}-group`}>
                Who's going
              </span>
              <ToggleGroup
                className="mdg-groups"
                aria-labelledby={`${id}-group`}
                value={[group]}
                disabled={creating}
                onValueChange={(next) => {
                  const picked = (next as Group[])[0];
                  if (picked) onGroupChange(picked);
                }}
              >
                {GROUPS.map((option) => (
                  <Toggle key={option} value={option} className="mdg-group">
                    {group === option && (
                      <motion.span
                        layoutId={`${id}-group`}
                        className="mdg-group-pick"
                        transition={reduced ? { duration: 0 } : SETTLE}
                      />
                    )}
                    <span className="mdg-group-name">{option}</span>
                  </Toggle>
                ))}
              </ToggleGroup>
            </motion.div>

            <motion.div className="mdg-foot" {...fade(0.34)}>
              <Dialog.Close className="mdg-button" data-variant="ghost" disabled={creating}>
                Cancel
              </Dialog.Close>
              <Button
                type="submit"
                className="mdg-button"
                data-variant="primary"
                disabled={!name.trim()}
                aria-busy={creating || undefined}
                aria-disabled={creating || undefined}
              >
                <AnimatePresence initial={false} mode="popLayout">
                  {creating ? (
                    <motion.span
                      key="spinner"
                      className="mdg-spinner"
                      initial={reduced ? { opacity: 0 } : { opacity: 0, scale: 0.6, filter: "blur(3px)" }}
                      animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
                      exit={{ opacity: 0 }}
                      transition={SETTLE}
                    >
                      <HugeiconsIcon icon={Loading03Icon} strokeWidth={2.2} />
                      <span className="mdg-sr">Creating</span>
                    </motion.span>
                  ) : (
                    <motion.span key="label" exit={{ opacity: 0, filter: "blur(3px)" }} transition={SETTLE}>
                      Create trip
                    </motion.span>
                  )}
                </AnimatePresence>
              </Button>
            </motion.div>
          </form>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function TripRow({ trip, fresh }: { trip: Trip; fresh: boolean }) {
  const colours = useColours();
  const reduced = useReducedMotion();
  return (
    <motion.li
      className="mdg-row"
      data-fresh={fresh || undefined}
      layout="position"
      exit={{ opacity: 0, transition: { duration: 0.15 } }}
      transition={SETTLE}
    >
      {trip.surface !== undefined ? (
        <motion.span
          layoutId={`mdg-surface-${trip.surface}`}
          className="mdg-surface"
          initial={false}
          style={{ borderRadius: 14, backgroundColor: colours.sheet }}
          transition={reduced ? { duration: 0 } : SURFACE}
        />
      ) : (
        <span className="mdg-surface mdg-row-surface" />
      )}
      <motion.span
        className="mdg-row-body"
        initial={fresh && !reduced ? { opacity: 0, filter: "blur(4px)" } : false}
        animate={{ opacity: 1, filter: "blur(0px)" }}
        transition={{ ...SETTLE, delay: fresh ? 0.28 : 0 }}
      >
        <span className="mdg-row-name">{trip.name}</span>
        <span className="mdg-row-meta">{trip.group}</span>
        {fresh && <span className="mdg-row-new">New</span>}
      </motion.span>
    </motion.li>
  );
}

const STARTING: Trip[] = [
  { name: "Lisbon", group: "Couple" },
  { name: "Cape Coast", group: "Friends" },
];

interface State {
  open: boolean;
  name: string;
  group: Group;
  creating: boolean;
  made: Trip[];
}

const REQUEST = 1000;

const CLOSED: State = { open: false, name: "", group: "Solo", creating: false, made: [] };
const OPEN: State = { ...CLOSED, open: true };
const NAMED: State = { ...OPEN, name: "Zanzibar" };

const BEATS: readonly (State & { ms: number })[] = [
  { ...CLOSED, ms: 1400 },
  { ...OPEN, ms: 900 },
  ...typing("Zanzibar", (name) => ({ ...OPEN, name }), { every: 70, hold: 500 }),
  { ...NAMED, group: "Family", ms: 900 },
  { ...NAMED, group: "Family", creating: true, ms: REQUEST },
  { ...CLOSED, made: [{ name: "Zanzibar", group: "Family", surface: 0 }], ms: 2800 },
];

const fromBeat = (step: number): State => {
  const { ms: _ms, ...state } = BEATS[step]!;
  return state;
};

const STILL: State = { ...CLOSED, made: [{ name: "Zanzibar", group: "Family", surface: 0 }] };

interface MorphingDialogDemoProps {
  playing?: boolean;
  preview?: boolean;
}

export function MorphingDialogDemo({ playing, preview }: MorphingDialogDemoProps = {}) {
  const scene = useScene(BEATS, fromBeat, playing);
  const { ref, takeOver, live } = scene;
  const state = preview && !playing ? STILL : scene.state;
  const [stage, setStage] = useState<HTMLDivElement | null>(null);
  const [modal, setModal] = useState(false);

  useEffect(() => {
    if (live || preview || !state.creating) return;
    const timer = setTimeout(
      () =>
        takeOver((current) => ({
          ...CLOSED,
          group: current.group,
          made: [
            { name: current.name.trim(), group: current.group, surface: current.made.length },
            ...current.made,
          ],
        })),
      REQUEST,
    );
    return () => clearTimeout(timer);
  }, [state.creating, live, preview, takeOver]);

  const trips = [...state.made, ...STARTING];

  return (
    <div ref={ref} className="mdg-demo not-prose">
      <div ref={setStage} className="mdg-stage">
        <LayoutGroup>
          <section className="mdg-panel" aria-label="Trips">
            <header className="mdg-panel-head">
              <span className="mdg-panel-title">
                Trips <span className="mdg-count">{trips.length}</span>
              </span>
              <span onPointerDownCapture={() => setModal(true)} onKeyDownCapture={() => setModal(true)}>
                <MorphingDialog
                  open={state.open}
                  onOpenChange={(open) => takeOver((current) => ({ ...current, open, creating: false }))}
                  name={state.name}
                  onNameChange={(name) => takeOver((current) => ({ ...current, name }))}
                  group={state.group}
                  onGroupChange={(group) => takeOver((current) => ({ ...current, group }))}
                  creating={state.creating}
                  onCreate={() => takeOver((current) => ({ ...current, creating: true }))}
                  surface={state.made.length}
                  container={stage}
                  modal={modal}
                />
              </span>
            </header>
            <ul className="mdg-list">
              <AnimatePresence initial={false}>
                {trips.map((trip, index) => (
                  <TripRow
                    key={trip.name + (trip.surface ?? "")}
                    trip={trip}
                    fresh={trip.surface !== undefined && index === 0}
                  />
                ))}
              </AnimatePresence>
            </ul>
          </section>
        </LayoutGroup>
      </div>
    </div>
  );
}
