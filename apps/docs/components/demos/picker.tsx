"use client";
import { HugeiconsIcon } from "@hugeicons/react";
import { ArrowDown01Icon } from "@hugeicons/core-free-icons";
import { Select } from "@base-ui/react/select";
import { AnimatePresence, LayoutGroup, motion } from "motion/react";
import { useId, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import { usePortalContainer } from "./portal-container";
import "./picker.css";

export interface PickerOption<V extends string> {
  value: V;
  label: string;
}

export interface PickerProps<V extends string> {
  /** What's being picked, for screen readers: "Status", "Priority". */
  label: string;
  options: readonly PickerOption<V>[];
  value: V;
  onValueChange: (value: V) => void;
  /** Draws an option's glyph, in the list and (for the current value) in the pill. */
  icon?: (value: V) => ReactNode;
  /** A line over the list, like "Change status…". */
  heading?: string;
  /** Number keys pick options, and each option shows its number. Default true. */
  shortcuts?: boolean;
  /** Shown beside the current option in the list. Default "Current". */
  currentLabel?: string;
  /** Control whether the list is open. */
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  /** Sit the highlight on this option, whatever the pointer does: for scripted demos. */
  preview?: V | null;
  /** Classes for the pill. */
  className?: string;
  /** Classes for the popup's layer, which is portalled to <body>: bring your colour tokens here. */
  layerClassName?: string;
}

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
        className={`pk-trigger${className ? ` ${className}` : ""}`}
        aria-label={`${label}: ${current.label}`}
      >
        {icon?.(value)}
        <span className="pk-trigger-label">
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
        <HugeiconsIcon icon={ArrowDown01Icon} className="pk-chevron" aria-hidden="true" />
      </Select.Trigger>

      <Select.Portal container={portal}>
        <Select.Positioner
          className={`pk-layer${layerClassName ? ` ${layerClassName}` : ""}`}
          sideOffset={6}
          align="start"
          alignItemWithTrigger={false}
        >
          <Select.Popup className="pk-popup" aria-label={heading ?? label} onKeyDown={onKeyDown}>
            {heading && (
              <p className="pk-heading" aria-hidden="true">
                {heading}
              </p>
            )}
            <LayoutGroup id={id}>
              {options.map((option, index) => (
                <Select.Item
                  key={option.value}
                  value={option.value}
                  className="pk-option"
                  render={(props, state) => {
                    const live = preview != null ? preview === option.value : state.highlighted;
                    if (isOpen && live) lastLit.current = option.value;
                    const lit = isOpen ? live : lastLit.current === option.value;
                    return (
                      <div {...props}>
                        {lit && (
                          <motion.span layoutId="pk-highlight" className="pk-highlight" transition={GLIDE} />
                        )}
                        {props.children}
                      </div>
                    );
                  }}
                >
                  {icon?.(option.value)}
                  <Select.ItemText className="pk-option-label">{option.label}</Select.ItemText>
                  {option.value === value && <span className="pk-current">{currentLabel}</span>}
                  {shortcuts && index < 9 && <kbd>{index + 1}</kbd>}
                </Select.Item>
              ))}
            </LayoutGroup>
          </Select.Popup>
        </Select.Positioner>
      </Select.Portal>
    </Select.Root>
  );
}
