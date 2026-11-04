"use client";

import { Field } from "@base-ui/react/field";
import { Switch } from "@base-ui/react/switch";
import { HugeiconsIcon } from "@hugeicons/react";
import { AlertCircleIcon, Loading03Icon, Tick02Icon } from "@hugeicons/core-free-icons";
import { Remold } from "@remold-ui/react";
import { useEffect, useRef } from "react";
import { Frame } from "./frame";
import { typing, useScene } from "./use-scene";

/*
 * A save button that says what's happening: Save changes, then Saving with a spinner, then Saved
 * with a check, settling back on its own. The change shows before the server answers (the greeting
 * above updates at once), and if the save fails it rolls back where you can see it and offers Retry.
 */

type Status = "idle" | "saving" | "saved" | "error";

interface State {
  /** What the server has. */
  saved: string;
  /** What's in the field. */
  draft: string;
  status: Status;
  /** Make the next save fail, to see the rollback. */
  fail: boolean;
}

/** How long the pretend request takes, and how long Saved stays. */
const REQUEST = 1100;
const HOLD = 1500;

const BEATS: readonly (State & { ms: number })[] = [
  { saved: "Ada", draft: "Ada", status: "idle", fail: false, ms: 1000 },
  ...typing(" Obi", (draft) => ({ saved: "Ada", draft, status: "idle" as const, fail: false }), { from: "Ada", every: 90, hold: 700 }),
  { saved: "Ada", draft: "Ada Obi", status: "saving", fail: false, ms: REQUEST },
  { saved: "Ada Obi", draft: "Ada Obi", status: "saved", fail: false, ms: HOLD },
  ...typing("-Mensah", (draft) => ({ saved: "Ada Obi", draft, status: "idle" as const, fail: true }), { from: "Ada Obi", every: 80, hold: 700 }),
  { saved: "Ada Obi", draft: "Ada Obi-Mensah", status: "saving", fail: true, ms: REQUEST },
  { saved: "Ada Obi", draft: "Ada Obi-Mensah", status: "error", fail: true, ms: 2400 },
];

const fromBeat = (step: number): State => {
  const { ms: _ms, ...state } = BEATS[step]!;
  return state;
};

const ICONS = {
  saving: Loading03Icon,
  saved: Tick02Icon,
  error: AlertCircleIcon,
};

const LABELS: Record<Status, string> = { idle: "Save changes", saving: "Saving", saved: "Saved", error: "Retry" };

const SPRING = { duration: 0.45, bounce: 0.1 };

interface SaveButtonDemoProps {
  framed?: boolean;

  playing?: boolean;
}

export function SaveButtonDemo({ framed = true, playing }: SaveButtonDemoProps) {
  const { ref, state, take } = useScene(BEATS, fromBeat, playing);
  const request = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => () => clearTimeout(request.current), []);

  const save = () => {
    clearTimeout(request.current);
    take((current) => ({ ...current, status: "saving" }));
    request.current = setTimeout(() => {
      take((current) => (current.fail ? { ...current, status: "error" } : { ...current, saved: current.draft, status: "saved" }));
      request.current = setTimeout(() => take((current) => (current.status === "saved" ? { ...current, status: "idle" } : current)), HOLD);
    }, REQUEST);
  };

  const { status } = state;
  const shown = status === "saving" ? state.draft : state.saved;
  const unchanged = state.draft === state.saved;

  const body = (
    <section
      ref={ref}
      className="group/save grid w-[380px] max-w-full gap-2 rounded-[18px] bg-white px-[18px] pt-[18px] pb-4 font-sans text-[13px] text-zinc-900 dark:bg-[#232327] dark:text-zinc-50"
      data-status={status}
      aria-label="Profile"
    >
      <p className="mt-0 mb-1.5 text-zinc-500 dark:text-zinc-400">
        Signed in as <Remold.Text className="font-semibold text-zinc-900 dark:text-zinc-50">{shown}</Remold.Text>
      </p>

      <Field.Root className="grid gap-1.5" invalid={status === "error"}>
        <Field.Label className="font-medium">Display name</Field.Label>
        <Field.Control
          className="h-[38px] rounded-[10px] bg-zinc-100 px-3 font-normal text-zinc-900 shadow-[inset_0_0_0_1px_rgb(24_24_27/0.1)] outline-none transition-shadow duration-200 focus-visible:shadow-[inset_0_0_0_1.5px_#18181b] data-invalid:shadow-[inset_0_0_0_1.5px_#b91c1c] motion-reduce:transition-none dark:bg-[#2c2c31] dark:text-zinc-50 dark:shadow-[inset_0_0_0_1px_rgb(255_255_255/0.1)] dark:focus-visible:shadow-[inset_0_0_0_1.5px_#fafafa] dark:data-invalid:shadow-[inset_0_0_0_1.5px_#f87171]"
          value={state.draft}
          onValueChange={(draft) => {
            clearTimeout(request.current);
            take((current) => ({ ...current, draft, status: "idle" }));
          }}
        />
        <Field.Description
          className="m-0 text-[12px] text-zinc-500 data-invalid:text-red-700 dark:text-zinc-400 dark:data-invalid:text-red-400"
          aria-live="polite"
        >
          <Remold.Text>{status === "error" ? "Couldn't save. Your old name is back. Try again." : "Shown on your profile and in comments."}</Remold.Text>
        </Field.Description>
      </Field.Root>

      <div className="mt-2 flex items-center justify-between gap-3">
        <label className="inline-flex cursor-pointer items-center gap-2 text-[12px] text-zinc-500 dark:text-zinc-400">
          <Switch.Root
            className="flex h-[18px] w-[30px] cursor-pointer rounded-full bg-zinc-200 p-0.5 data-checked:justify-end data-checked:bg-red-700 dark:bg-[#3a3a40] dark:data-checked:bg-red-400 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-900 dark:focus-visible:outline-zinc-50"
            aria-label="Fail the next save"
            checked={state.fail} onCheckedChange={(fail) => take((current) => ({ ...current, fail }))}>
            <Switch.Thumb className="size-3.5 rounded-full bg-white" />
          </Switch.Root>
          Fail the next save
        </label>
        <Remold.Layout trigger={status} spring={SPRING}>
          <button
            type="button"
            className="inline-flex h-9 cursor-pointer items-center justify-center gap-1.5 rounded-full bg-zinc-900 px-4 font-medium whitespace-nowrap text-white transition-[background-color,opacity] duration-250 group-data-[status=error]/save:bg-red-700 group-data-[status=saved]/save:bg-green-700 group-data-[status=saving]/save:cursor-progress group-data-[status=idle]/save:disabled:cursor-default group-data-[status=idle]/save:disabled:opacity-35 motion-reduce:transition-none dark:bg-zinc-50 dark:text-[#232327] dark:group-data-[status=error]/save:bg-red-400 dark:group-data-[status=saved]/save:bg-green-400 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-900 dark:focus-visible:outline-zinc-50"
            // Busy, it ignores presses but keeps focus (a disabled button would drop it); with nothing to save, it's off.
            disabled={status === "idle" && unchanged}
            aria-disabled={status === "saving" || status === "saved" || undefined}
            aria-busy={status === "saving" || undefined}
            onClick={() => {
              if (status === "idle" || status === "error") save();
            }}
          >
            {status !== "idle" && (
              <Remold.Icon
                key="icon"
                className="size-[15px] fill-none stroke-current [stroke-linecap:round] [stroke-linejoin:round] group-data-[status=saving]/save:animate-spin group-data-[status=saving]/save:[animation-duration:0.8s] motion-reduce:group-data-[status=saving]/save:[animation-duration:2.4s]"
                icon={<HugeiconsIcon icon={ICONS[status]} />}
                strokeWidth={2}
                aria-hidden="true"
              />
            )}
            <Remold.Text>{LABELS[status]}</Remold.Text>
          </button>
        </Remold.Layout>
      </div>
    </section>
  );

  return framed ? <Frame>{body}</Frame> : body;
}
