"use client";

import { Field } from "@base-ui/react/field";
import { Radio } from "@base-ui/react/radio";
import { RadioGroup } from "@base-ui/react/radio-group";
import { Switch as BaseSwitch } from "@base-ui/react/switch";
import { Loading03Icon, Tick02Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { Remold } from "@remold-ui/react";
import { AnimatePresence, LayoutGroup, MotionConfig, motion, useReducedMotion } from "motion/react";
import { type CSSProperties, type ReactNode, useEffect, useId } from "react";
import { FORM_KIT } from "./form-kit";
import { typing, useScene } from "./use-scene";

type Settings = { name: string; accent: string; publicProfile: boolean; digest: boolean };
type Phase = "editing" | "saving" | "saved";
type SettingsValue = { saved: Settings; draft: Settings; phase: Phase };

const ACCENTS = [
  { id: "violet", name: "Violet", colour: "#7c3aed" },
  { id: "blue", name: "Blue", colour: "#2563eb" },
  { id: "green", name: "Green", colour: "#16a34a" },
  { id: "amber", name: "Amber", colour: "#d97706" },
  { id: "rose", name: "Rose", colour: "#e11d48" },
];

const PILL = { type: "spring" as const, duration: 0.5, bounce: 0.22 };
const RESIZE = { type: "spring" as const, duration: 0.45, bounce: 0.12 };
const SLIDE = { type: "spring" as const, duration: 0.38, bounce: 0.16 };
const THUMB = { type: "spring" as const, duration: 0.3, bounce: 0.2 };

const changes = (value: SettingsValue) =>
  (Object.keys(value.draft) as (keyof Settings)[]).filter((key) => value.draft[key] !== value.saved[key]).length;

function Toggle({ checked, label, onCheckedChange }: { checked: boolean; label: string; onCheckedChange: (checked: boolean) => void }) {
  const reduced = useReducedMotion();

  return (
    <BaseSwitch.Root
      className="flex h-[26px] w-11 flex-none cursor-pointer rounded-full border-0 bg-(--fk-well-strong) p-[3px] transition-colors duration-200 ease-out data-checked:bg-(--fk-ink)"
      aria-label={label}
      checked={checked}
      onCheckedChange={onCheckedChange}
    >
      <BaseSwitch.Thumb
        className="size-5 rounded-full bg-white shadow-[0_1px_2px_rgb(0_0_0/0.18)] dark:data-checked:bg-(--fk-surface)"
        render={<motion.span initial={false} animate={{ x: checked ? 18 : 0 }} transition={reduced ? { duration: 0 } : THUMB} />}
      />
    </BaseSwitch.Root>
  );
}

function Setting({ label, caption, children }: { label: string; caption: string; children: ReactNode }) {
  return (
    <div className="flex items-center gap-4 py-3.5">
      <span className="grid min-w-0 flex-1 gap-0.5">
        <span className="text-[14.5px] font-semibold">{label}</span>
        <span className="text-[12.5px] text-(--fk-muted)">{caption}</span>
      </span>
      {children}
    </div>
  );
}

function SaveBar({ count, phase, onDiscard, onSave }: { count: number; phase: Phase; onDiscard: () => void; onSave: () => void }) {
  const saved = phase === "saved";
  const saving = phase === "saving";

  return (
    <motion.div
      layout
      className="pointer-events-auto flex h-12 items-center gap-1 overflow-hidden bg-[#18181b] pr-1.5 pl-4 text-[14px] font-medium text-white shadow-[0_0_0_0.5px_rgb(255_255_255/0.08),0_12px_32px_-12px_rgb(0_0_0/0.45)] dark:bg-[#2a2a2f]"
      style={{ borderRadius: 999 }}
      initial={{ y: 24, opacity: 0, scale: 0.96, filter: "blur(4px)" }}
      animate={{ y: 0, opacity: 1, scale: 1, filter: "blur(0px)" }}
      exit={{ y: 24, opacity: 0, scale: 0.96, filter: "blur(4px)", transition: { ...PILL, bounce: 0 } }}
      transition={{ ...PILL, layout: RESIZE }}
      role="status"
      aria-live="polite"
    >
      <motion.span layout="position" className="flex items-center gap-2.5 pr-2" transition={RESIZE}>
        <span className="relative grid size-5 place-items-center">
          <AnimatePresence initial={false} mode="popLayout">
            {saved ? (
              <motion.span
                key="done"
                className="grid size-5 place-items-center rounded-full bg-[#22c55e] text-[#052e16]"
                initial={{ scale: 0.3, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.3, opacity: 0 }}
                transition={{ ...PILL, bounce: 0.45 }}
              >
                <HugeiconsIcon icon={Tick02Icon} strokeWidth={2.6} className="size-3" aria-hidden="true" />
              </motion.span>
            ) : (
              <motion.span
                key="dot"
                className="relative grid size-5 place-items-center"
                initial={{ scale: 0.3, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.3, opacity: 0 }}
                transition={PILL}
              >
                <span className="absolute size-2 rounded-full bg-[#fbbf24] opacity-60 motion-safe:animate-ping" />
                <span className="size-2 rounded-full bg-[#fbbf24]" />
              </motion.span>
            )}
          </AnimatePresence>
        </span>
        <span className="whitespace-nowrap">
          <Remold.Text>{saved ? "Saved" : count === 1 ? "1 unsaved change" : `${count} unsaved changes`}</Remold.Text>
        </span>
      </motion.span>

      <AnimatePresence initial={false} mode="popLayout">
        {!saved && (
          <motion.span
            key="actions"
            className="flex items-center gap-1"
            initial={{ opacity: 0, filter: "blur(4px)" }}
            animate={{ opacity: 1, filter: "blur(0px)" }}
            exit={{ opacity: 0, filter: "blur(4px)", transition: { duration: 0.15 } }}
            transition={PILL}
          >
            <button
              type="button"
              onClick={onDiscard}
              disabled={saving}
              className="h-9 cursor-pointer rounded-full border-0 bg-transparent px-3.5 text-[14px] font-medium text-white/70 transition-[background-color,color] duration-150 ease-out hover:bg-white/10 hover:text-white active:scale-[0.97] disabled:cursor-default disabled:opacity-40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
            >
              Discard
            </button>
            <motion.button
              type="button"
              onClick={onSave}
              disabled={saving}
              whileTap={{ scale: 0.97 }}
              className="relative grid h-9 min-w-[68px] cursor-pointer place-items-center rounded-full border-0 bg-white px-4 text-[14px] font-semibold text-[#18181b] disabled:cursor-default focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
            >
              <AnimatePresence initial={false} mode="popLayout">
                <motion.span
                  key={saving ? "saving" : "save"}
                  className="grid"
                  initial={{ opacity: 0, scale: 0.6 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.6 }}
                  transition={PILL}
                >
                  {saving ? (
                    <HugeiconsIcon icon={Loading03Icon} strokeWidth={2.2} className="size-4 motion-safe:animate-spin" aria-label="Saving" />
                  ) : (
                    "Save"
                  )}
                </motion.span>
              </AnimatePresence>
            </motion.button>
          </motion.span>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export function WorkspaceSettings({ value, onValueChange }: { value: SettingsValue; onValueChange: (value: SettingsValue) => void }) {
  const group = useId();
  const count = changes(value);
  const { draft } = value;
  const edit = (patch: Partial<Settings>) => onValueChange({ ...value, draft: { ...draft, ...patch }, phase: "editing" });
  const showBar = count > 0 || value.phase !== "editing";

  return (
    <div className="relative grid w-[min(100%,380px)] pb-[76px]">
      <section className="grid rounded-[28px] bg-(--fk-surface) px-6 pt-6 pb-3" aria-label="Workspace settings">
        <header className="grid gap-1 pb-4">
          <h3 className="m-0 text-[17px] font-semibold tracking-[-0.01em]">Workspace</h3>
          <p className="m-0 text-[13px] text-(--fk-muted)">Changes apply to everyone in {value.saved.name}.</p>
        </header>

        <Field.Root className="grid gap-2 border-t border-(--fk-line) py-4">
          <Field.Label className="text-[13px] font-semibold">Name</Field.Label>
          <Field.Control
            value={draft.name}
            onValueChange={(name) => edit({ name })}
            className="h-11 rounded-[12px] border-0 bg-(--fk-well) px-3.5 text-[15px] text-(--fk-ink) outline-none transition-shadow duration-150 ease-out focus:shadow-[inset_0_0_0_1.8px_var(--fk-ink)]"
          />
        </Field.Root>

        <div className="grid gap-3 border-t border-(--fk-line) py-4">
          <span className="text-[13px] font-semibold" id={`${group}-accent`}>
            Accent
          </span>
          <LayoutGroup id={`${group}-ring`}>
            <RadioGroup
              className="flex gap-1.5"
              aria-labelledby={`${group}-accent`}
              value={draft.accent}
              onValueChange={(accent) => edit({ accent: accent as string })}
            >
              {ACCENTS.map((accent) => (
                <Radio.Root
                  key={accent.id}
                  value={accent.id}
                  nativeButton
                  render={<button type="button" />}
                  aria-label={accent.name}
                  className="relative grid size-9 cursor-pointer place-items-center rounded-full border-0 bg-transparent p-0 transition-transform duration-150 ease-out active:scale-[0.94]"
                >
                  {draft.accent === accent.id && (
                    <motion.span layoutId="ring" className="absolute inset-0 rounded-full border-[1.8px] border-(--accent)" style={{ "--accent": accent.colour } as CSSProperties} transition={SLIDE} />
                  )}
                  <span className="size-[26px] rounded-full bg-(--accent)" style={{ "--accent": accent.colour } as CSSProperties} />
                </Radio.Root>
              ))}
            </RadioGroup>
          </LayoutGroup>
        </div>

        <div className="border-t border-(--fk-line)">
          <Setting label="Public profile" caption="Anyone with the link can see it">
            <Toggle label="Public profile" checked={draft.publicProfile} onCheckedChange={(publicProfile) => edit({ publicProfile })} />
          </Setting>
        </div>
        <div className="border-t border-(--fk-line)">
          <Setting label="Weekly digest" caption="A Monday summary by email">
            <Toggle label="Weekly digest" checked={draft.digest} onCheckedChange={(digest) => edit({ digest })} />
          </Setting>
        </div>
      </section>

      <div className="pointer-events-none absolute inset-x-0 bottom-0 flex justify-center">
        <AnimatePresence initial={false}>
          {showBar && (
            <SaveBar
              key="bar"
              count={Math.max(count, 1)}
              phase={value.phase}
              onDiscard={() => onValueChange({ ...value, draft: value.saved, phase: "editing" })}
              onSave={() => onValueChange({ ...value, phase: "saving" })}
            />
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

/* The demo */

const SAVED: Settings = { name: "Remold", accent: "violet", publicProfile: true, digest: false };
const REST: SettingsValue = { saved: SAVED, draft: SAVED, phase: "editing" };
const RENAMED: Settings = { ...SAVED, name: "Remold Studio" };
const RECOLOURED: Settings = { ...RENAMED, accent: "green" };

const BEATS: readonly (SettingsValue & { ms: number })[] = [
  { ...REST, ms: 1400 },
  ...typing(" Studio", (typed) => ({ ...REST, draft: { ...SAVED, name: `Remold${typed}` } }), { every: 80, hold: 900 }),
  { ...REST, draft: RECOLOURED, ms: 1400 },
  { ...REST, draft: RECOLOURED, phase: "saving", ms: 900 },
  { saved: RECOLOURED, draft: RECOLOURED, phase: "saved", ms: 1500 },
  { saved: RECOLOURED, draft: RECOLOURED, phase: "editing", ms: 1300 },
];

const fromBeat = (step: number): SettingsValue => {
  const { ms: _ms, ...state } = BEATS[step]!;

  return state;
};

const STILL: SettingsValue = { ...REST, draft: RECOLOURED };

export function UnsavedChangesDemo({ playing, preview }: { playing?: boolean; preview?: boolean } = {}) {
  const scene = useScene(BEATS, fromBeat, playing);
  const still = Boolean(preview && !playing && !scene.taken);
  const value = still ? STILL : scene.state;
  const { takeOver } = scene;
  const scripted = scene.live;

  useEffect(() => {
    if (scripted || value.phase === "editing") return;
    const timer = setTimeout(
      () =>
        takeOver((current) =>
          current.phase === "saving"
            ? { saved: current.draft, draft: current.draft, phase: "saved" }
            : { ...current, phase: "editing" },
        ),
      value.phase === "saving" ? 900 : 1500,
    );

    return () => clearTimeout(timer);
  }, [scripted, value.phase, takeOver]);

  return (
    <MotionConfig reducedMotion="user">
      <div ref={scene.ref} className={`not-prose grid w-full place-items-center pt-2 ${FORM_KIT}`}>
        <WorkspaceSettings value={value} onValueChange={(next) => takeOver(next)} />
      </div>
    </MotionConfig>
  );
}
