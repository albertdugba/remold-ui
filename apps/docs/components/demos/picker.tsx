"use client";
import { HugeiconsIcon } from "@hugeicons/react";
import { ArrowDown01Icon } from "@hugeicons/core-free-icons";
import { Select } from "@base-ui/react/select";
import { AnimatePresence, LayoutGroup, motion } from "motion/react";
import { useId, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import { usePortalContainer } from "./portal-container";

export interface PickerOption<V extends string> {
  value: V;
  label: string;
}

export interface PickerProps<V extends string> {
  label: string;
  options: readonly PickerOption<V>[];
  value: V;
  onValueChange: (value: V) => void;
  icon?: (value: V) => ReactNode;
  heading?: string;
  shortcuts?: boolean;
  currentLabel?: string;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  preview?: V | null;
  className?: string;
  layerClassName?: string;
}

const PALETTE = [
  "[--pk-surface:#ffffff] [--pk-raised:#ffffff] [--pk-fill:#f4f4f5] [--pk-line:rgb(24_24_27/0.08)] [--pk-ink:#18181b] [--pk-muted:#71717a] [--pk-quiet:#a1a1aa] [--pk-focus:#6366f1]",
  "dark:[--pk-surface:#232327] dark:[--pk-raised:#2a2a2f] dark:[--pk-fill:#34343a] dark:[--pk-line:rgb(255_255_255/0.09)] dark:[--pk-ink:#fafafa] dark:[--pk-muted:#a1a1aa] dark:[--pk-quiet:#71717a] dark:[--pk-focus:#818cf8]",
].join(" ");

const TRIGGER = `group/trigger inline-flex h-7 cursor-pointer items-center gap-1.5 rounded-full border border-solid border-(--pk-line) bg-(--pk-surface) pr-[9px] pl-2 text-[12.5px] font-medium text-(--pk-ink) transition-[background-color,scale] duration-150 hover:bg-(--pk-fill) focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--pk-focus) active:scale-[0.96] data-popup-open:bg-(--pk-fill) ${PALETTE}`;
const POPUP =
  "grid min-w-[216px] origin-(--transform-origin) rounded-[14px] border border-solid border-(--pk-line) bg-(--pk-raised) p-[5px] text-(--pk-ink) shadow-[0_12px_32px_-8px_rgb(0_0_0/0.18),0_2px_6px_rgb(0_0_0/0.06)] outline-none [transition:opacity_0.18s,transform_0.32s_cubic-bezier(0.2,1.25,0.4,1)] data-starting-style:opacity-0 data-starting-style:[transform:scale(0.94)_translateY(-6px)] data-ending-style:opacity-0 data-ending-style:[transform:scale(0.97)_translateY(-4px)] data-ending-style:duration-120 data-ending-style:ease-in";

const LABEL = { type: "spring" as const, duration: 0.4, bounce: 0.15 };
const GLIDE = { type: "spring" as const, duration: 0.28, bounce: 0.12 };

export function Picker<V extends string>({
  label,
  options,
  value,
  onValueChange,
  icon,
  heading,
  shortcuts = true,
  currentLabel = "Current",
  open,
  onOpenChange,
  preview,
  className,
  layerClassName,
}: PickerProps<V>) {
  const id = useId();
  const portal = usePortalContainer();
  const [ownOpen, setOwnOpen] = useState(false);
  const isOpen = open ?? ownOpen;
  const lastLit = useRef<V | null>(null);
  const current = options.find((option) => option.value === value) ?? options[0]!;

  const onKeyDown = (event: KeyboardEvent) => {
    if (!shortcuts || !/^[1-9]$/.test(event.key)) return;
    const option = options[Number(event.key) - 1];
    if (!option) return;
    event.preventDefault();
    onValueChange(option.value);
    onOpenChange?.(false);
  };

  return (
    <Select.Root
      items={options}
      value={value}
      onValueChange={(next) => next !== null && onValueChange(next as V)}
      open={open}
      onOpenChange={(next) => {
        setOwnOpen(next);
        onOpenChange?.(next);
      }}
      modal={false}
    >
      <Select.Trigger
        className={`${TRIGGER} ${className ?? ""}`}
        aria-label={`${label}: ${current.label}`}
      >
        {icon?.(value)}
        <span className="inline-grid overflow-hidden whitespace-nowrap">
          <AnimatePresence initial={false} mode="popLayout">
            <motion.span
              key={value}
              initial={{ y: 10, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -10, opacity: 0 }}
              transition={LABEL}
            >
              {current.label}
            </motion.span>
          </AnimatePresence>
        </span>
        <HugeiconsIcon
          icon={ArrowDown01Icon}
          className="size-[13px] flex-none text-(--pk-muted) transition-transform duration-250 ease-[cubic-bezier(0.3,0.9,0.3,1)] group-data-popup-open/trigger:rotate-180"
          aria-hidden="true"
        />
      </Select.Trigger>

      <Select.Portal container={portal}>
        <Select.Positioner
          className={`z-60 font-sans outline-none ${PALETTE} ${layerClassName ?? ""}`}
          sideOffset={6}
          align="start"
          alignItemWithTrigger={false}
        >
          <Select.Popup className={POPUP} aria-label={heading ?? label} onKeyDown={onKeyDown}>
            {heading && (
              <p
                className="m-0 mb-1 border-b border-solid border-(--pk-line) px-2 pt-1.5 pb-[7px] text-[12px] text-(--pk-quiet)"
                aria-hidden="true"
              >
                {heading}
              </p>
            )}
            <LayoutGroup id={id}>
              {options.map((option, index) => (
                <Select.Item
                  key={option.value}
                  value={option.value}
                  className="relative flex h-8 cursor-pointer items-center gap-[9px] rounded-[9px] px-2 text-[13px] outline-none select-none [&>*:not([data-highlight])]:relative"
                  render={(props, state) => {
                    const live = preview != null ? preview === option.value : state.highlighted;
                    if (isOpen && live) lastLit.current = option.value;
                    const lit = isOpen ? live : lastLit.current === option.value;
                    return (
                      <div {...props}>
                        {lit && (
                          <motion.span
                            layoutId="pk-highlight"
                            data-highlight=""
                            className="absolute inset-0 rounded-[inherit] bg-(--pk-fill)"
                            transition={GLIDE}
                          />
                        )}
                        {props.children}
                      </div>
                    );
                  }}
                >
                  {icon?.(option.value)}
                  <Select.ItemText className="flex-1">{option.label}</Select.ItemText>
                  {option.value === value && <span className="text-[11px] text-(--pk-quiet)">{currentLabel}</span>}
                  {shortcuts && index < 9 && (
                    <kbd className="font-[inherit] text-[11px] text-(--pk-quiet) tabular-nums">{index + 1}</kbd>
                  )}
                </Select.Item>
              ))}
            </LayoutGroup>
          </Select.Popup>
        </Select.Positioner>
      </Select.Portal>
    </Select.Root>
  );
}
