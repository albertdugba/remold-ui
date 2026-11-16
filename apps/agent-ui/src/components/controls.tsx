import { ArrowTurnBackwardIcon, Tick02Icon, UnfoldMoreIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { Remold } from "@remold-ui/react";
import { Button } from "@ui-sdk/react/button";
import { Field, FieldLabel } from "@ui-sdk/react/field";
import { Input } from "@ui-sdk/react/input";
import { Select, SelectContent, SelectItem, SelectItemIndicator, SelectLabel, SelectTrigger } from "@ui-sdk/react/select";
import { Switch, SwitchThumb } from "@ui-sdk/react/switch";
import { AnimatePresence, motion } from "motion/react";
import type { ReactNode } from "react";
import { undo } from "../agent/bridge";
import { useAgentUi } from "../agent/store";

export interface Choice {
  value: string;
  label: string;
}

const ROW =
  "group/row -mx-3 flex min-h-12 items-center gap-3 rounded-[14px] px-3 transition-[background-color] duration-200 ease-out data-focused:bg-(--well) motion-reduce:transition-none";
const LABEL = "text-[14px] font-medium whitespace-nowrap";
const WELL =
  "bg-(--well) transition-[background-color,box-shadow] duration-200 ease-out group-data-focused/row:bg-(--surface) group-data-focused/row:shadow-[0_0_0_1.5px_var(--ink)] group-data-preview/row:shadow-none group-data-preview/row:outline-[1.5px] group-data-preview/row:outline-offset-2 group-data-preview/row:outline-(--ink) group-data-preview/row:outline-dashed motion-reduce:transition-none";
const LEAVE = { opacity: 0, scale: 0.9, filter: "blur(4px)", transition: { type: "spring" as const, duration: 0.25, bounce: 0 } };

function useRow(label: string) {
  const focused = useAgentUi((current) => current.focus === label);
  const preview = useAgentUi((current) => current.marks[label]?.kind === "preview" || (current.phase === "waiting" && current.focus === label));

  return { "data-row": "", "data-focused": focused ? "" : undefined, "data-preview": preview ? "" : undefined, className: ROW };
}

export function AgentMark({ label, format }: { label: string; format: (value: unknown) => string }) {
  const mark = useAgentUi((current) => current.marks[label]);

  return (
    <AnimatePresence initial={false}>
      {mark && (
        <motion.span
          key="mark"
          className="inline-flex min-w-0"
          initial={{ opacity: 0, scale: 0.9, filter: "blur(4px)" }}
          animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
          exit={LEAVE}
        >
          <button
            type="button"
            disabled={mark.kind === "preview"}
            onClick={() => void undo(label)}
            className="flex h-6 min-w-0 items-center gap-1 rounded-full border-0 bg-(--well) pr-2.5 pl-2 text-[12px] font-medium whitespace-nowrap text-(--muted) outline-none transition-[background-color,color,scale] duration-150 ease-out enabled:cursor-pointer enabled:hover:bg-(--rule) enabled:hover:text-(--ink) enabled:active:scale-[0.97] focus-visible:shadow-[0_0_0_2px_var(--ink)] group-data-focused/row:bg-(--surface) motion-reduce:transition-none"
          >
            <HugeiconsIcon icon={ArrowTurnBackwardIcon} strokeWidth={2.2} className="size-3 flex-none" aria-hidden="true" />
            <Remold.Text className="inline-block whitespace-nowrap">{mark.kind === "preview" ? "Preview" : `was ${format(mark.previous)}`}</Remold.Text>
            <span className="sr-only">{mark.kind === "preview" ? `of the agent’s change to ${label}` : `. Undo the agent’s change to ${label}`}</span>
          </button>
        </motion.span>
      )}
    </AnimatePresence>
  );
}

export function TextRow({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  const row = useRow(label);

  return (
    <Field {...row}>
      <span className="flex min-w-0 flex-1 items-center gap-2">
        <FieldLabel className={LABEL}>{label}</FieldLabel>
        <AgentMark label={label} format={(previous) => String(previous)} />
      </span>
      <span className="group/input relative grid w-[210px] flex-none">
        <Input
          data-target=""
          value={value}
          onValueChange={(next) => onChange(next)}
          autoComplete="off"
          spellCheck={false}
          className={`h-9 w-full rounded-[10px] border-0 px-3 font-sans text-[14px] text-transparent caret-(--ink) outline-none focus:text-(--ink) focus-visible:shadow-[inset_0_0_0_2px_var(--ink)] ${WELL}`}
        />
        <span
          className="pointer-events-none absolute inset-0 flex items-center overflow-hidden px-3 text-[14px] whitespace-nowrap group-focus-within/input:invisible"
          aria-hidden="true"
        >
          <Remold.Text className="inline-block whitespace-nowrap">{value}</Remold.Text>
        </span>
      </span>
    </Field>
  );
}

export function SelectRow({
  label,
  items,
  value,
  onChange,
  confirm,
  wide = false,
  children,
}: {
  label: string;
  items: readonly Choice[];
  value: string;
  onChange: (value: string) => void;
  confirm?: string;
  wide?: boolean;
  children?: ReactNode;
}) {
  const row = useRow(label);
  const staged = useAgentUi((current) => (current.marks[label]?.kind === "preview" ? current.marks[label] : null));
  const name = (picked: unknown) => items.find((item) => item.value === picked)?.label ?? "";

  return (
    <Select value={value} onValueChange={(next) => next && onChange(next)} items={[...items]}>
      <div {...row}>
        <span className="flex min-w-0 flex-1 items-center gap-2">
          {children ?? <SelectLabel className={LABEL}>{label}</SelectLabel>}
          <AgentMark label={label} format={name} />
        </span>
        <SelectTrigger
          data-target=""
          data-agent-confirm={confirm}
          aria-label={children ? label : undefined}
          className={`flex h-9 flex-none cursor-pointer items-center justify-between gap-1.5 rounded-[10px] border-0 pr-2 pl-3 font-sans text-[14px] text-(--ink) outline-none focus-visible:shadow-[inset_0_0_0_2px_var(--ink)] ${wide ? "w-[210px]" : ""} ${WELL}`}
        >
          <span className="flex min-w-0 items-center">
            <AnimatePresence initial={false}>
              {staged && (
                <motion.span
                  key="before"
                  className="overflow-hidden pr-px whitespace-nowrap text-(--muted) line-through"
                  initial={{ opacity: 0, width: 0, marginRight: 0 }}
                  animate={{ opacity: 1, width: "auto", marginRight: 8 }}
                  exit={{ opacity: 0, width: 0, marginRight: 0, transition: { type: "spring", duration: 0.3, bounce: 0 } }}
                >
                  {name(staged.previous)}
                </motion.span>
              )}
            </AnimatePresence>
            <Remold.Text className="inline-block whitespace-nowrap">{name(value)}</Remold.Text>
          </span>
          <HugeiconsIcon icon={UnfoldMoreIcon} strokeWidth={2} className="size-3.5 flex-none text-(--muted)" aria-hidden="true" />
        </SelectTrigger>
      </div>
      <SelectContent
        sideOffset={6}
        align="end"
        className="m-0 min-w-[max(var(--anchor-width),150px)] origin-(--transform-origin) rounded-[14px] border-0 bg-(--surface) p-1 text-(--ink) shadow-[0_0_0_1px_rgb(10_10_11/0.06),0_14px_36px_-10px_rgb(10_10_11/0.22)] outline-none transition-[opacity,scale] duration-150 ease-out data-ending-style:scale-[0.96] data-ending-style:opacity-0 data-starting-style:scale-[0.96] data-starting-style:opacity-0 motion-reduce:transition-none"
      >
        {items.map((item) => (
          <SelectItem
            key={item.value}
            value={item.value}
            className="flex h-9 cursor-pointer items-center justify-between gap-4 rounded-[10px] px-2.5 text-[14px] outline-none data-highlighted:bg-(--well)"
          >
            {item.label}
            <SelectItemIndicator className="grid place-items-center">
              <HugeiconsIcon icon={Tick02Icon} strokeWidth={2.2} className="size-4" aria-hidden="true" />
            </SelectItemIndicator>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

export function SwitchRow({ label, checked, onChange }: { label: string; checked: boolean; onChange: (checked: boolean) => void }) {
  const row = useRow(label);

  return (
    <Field {...row}>
      <span className="flex min-w-0 flex-1 items-center gap-2">
        <FieldLabel className={`${LABEL} cursor-pointer`}>{label}</FieldLabel>
        <AgentMark label={label} format={(previous) => (previous ? "on" : "off")} />
      </span>
      <Switch
        data-target=""
        checked={checked}
        onCheckedChange={(next) => onChange(next)}
        className="relative h-[22px] w-[38px] flex-none cursor-pointer rounded-full border-0 bg-[#8f8f99] p-0 outline-none transition-[background-color,box-shadow] duration-200 ease-out focus-visible:shadow-[0_0_0_2px_var(--surface),0_0_0_4px_var(--ink)] data-checked:bg-(--ink) group-data-focused/row:shadow-[0_0_0_2px_var(--well),0_0_0_3.5px_var(--ink)] motion-reduce:transition-none"
      >
        <SwitchThumb className="absolute top-[2px] left-[2px] block size-[18px] rounded-full bg-white transition-[translate] duration-250 ease-[cubic-bezier(0.32,0.72,0,1)] data-checked:translate-x-4 motion-reduce:transition-none" />
      </Switch>
    </Field>
  );
}

export function PressRow({
  label,
  hint,
  text,
  confirm,
  onPress,
}: {
  label: string;
  hint: string;
  text: string;
  confirm?: string;
  onPress: () => void;
}) {
  const row = useRow(label);

  return (
    <div {...row}>
      <span className="grid min-w-0 flex-1 leading-[1.3]">
        <span className={LABEL}>{label}</span>
        <span className="truncate text-[12.5px] text-(--muted)">{hint}</span>
      </span>
      <Button
        data-target=""
        data-agent-confirm={confirm}
        aria-label={label}
        onClick={onPress}
        className={`h-9 flex-none cursor-pointer rounded-[10px] border-0 px-3.5 font-sans text-[14px] font-semibold text-(--danger) outline-none hover:bg-(--rule) focus-visible:shadow-[inset_0_0_0_2px_var(--ink)] active:scale-[0.97] ${WELL.replace("transition-[background-color,box-shadow]", "transition-[background-color,box-shadow,scale]")}`}
      >
        {text}
      </Button>
    </div>
  );
}
