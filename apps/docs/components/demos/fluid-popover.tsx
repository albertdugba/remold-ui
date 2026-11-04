"use client";

import { Popover } from "@base-ui/react/popover";
import {
  Cancel01Icon,
  Invoice01Icon,
  MoreHorizontalIcon,
  NoteEditIcon,
  RepeatIcon,
  Share08Icon,
  Tick02Icon,
  UserGroupIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon, type IconSvgElement } from "@hugeicons/react";
import { Remold } from "@remold-ui/react";
import { LayoutGroup, motion, useReducedMotion } from "motion/react";
import { useEffect, useRef, useState, type MouseEvent } from "react";
import { useScript } from "./use-script";

/** What an action did, said in a few words. */
type Action = { label: string; icon: IconSvgElement; done: string };

const actions: readonly Action[] = [
  { label: "View receipt", icon: Invoice01Icon, done: "Receipt opened" },
  { label: "Split with friends", icon: UserGroupIcon, done: "Split request sent" },
  { label: "Repeat payment", icon: RepeatIcon, done: "Payment repeated" },
  { label: "Add a note", icon: NoteEditIcon, done: "Note added" },
  { label: "Share receipt", icon: Share08Icon, done: "Receipt link copied" },
];

/** What the trigger shows for a moment after an action, before it goes back to the ellipsis. */
type Outcome = { icon: IconSvgElement; message: string };

const OUTCOME_FOR = 1600;

// The open tray grows when a consumer adds an action, instead of hiding rows
// below a hard-coded viewport.
const MENU_WIDTH = 300;
const MENU_HEIGHT = 76 + actions.length * 44;

/** A Base UI popover whose visible shell expands from the trigger itself. */
export function FluidPopoverDemo({ playing }: { playing?: boolean }) {
  const [open, setOpen] = useState(false);
  const [hoveredAction, setHoveredAction] = useState<string | null>(null);
  const [outcome, setOutcome] = useState<Outcome | null>(null);
  const shellRef = useRef<HTMLDivElement>(null);
  const outcomeTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const reduceMotion = useReducedMotion();

  useEffect(() => () => clearTimeout(outcomeTimer.current), []);

  const close = (nextOpen: boolean) => {
    setOpen(nextOpen);
    if (nextOpen) {
      clearTimeout(outcomeTimer.current);
      setOutcome(null);
    } else {
      setHoveredAction(null);
    }
  };

  const finish = (next: Outcome) => {
    close(false);
    setOutcome(next);
    clearTimeout(outcomeTimer.current);
    outcomeTimer.current = setTimeout(() => setOutcome(null), OUTCOME_FOR);
  };

  const choose = (event: MouseEvent<HTMLAnchorElement>, action: Action) => {
    event.preventDefault();
    finish({ icon: Tick02Icon, message: action.done });
  };

  useScript(shellRef, playing, [
    [900, () => close(true)],
    ...actions.slice(0, 3).map((action) => [380, () => setHoveredAction(action.label)] as const),
    [OUTCOME_FOR + 900, () => finish({ icon: Tick02Icon, message: actions[2]!.done })],
  ]);

  const rise = (delay = 0) => ({
    initial: reduceMotion
      ? { opacity: 0 }
      : { opacity: 0, y: 10, filter: "blur(4px)" },
    animate: { opacity: 1, y: 0, filter: "blur(0px)" },
    transition: {
      delay: reduceMotion ? 0 : delay,
      duration: 0.2,
      ease: [0.23, 1, 0.32, 1] as const,
    },
  });

  return (
    <div className="grid w-full place-items-center py-10">
      <div
        className="relative shrink-0"
        style={{ width: MENU_WIDTH, height: MENU_HEIGHT }}
      >
        <Popover.Root open={open} onOpenChange={close} modal={false}>
          <motion.div
            ref={shellRef}
            animate={
              open
                ? { width: MENU_WIDTH, height: MENU_HEIGHT, borderRadius: 27 }
                : { width: 54, height: 54, borderRadius: 27 }
            }
            // Closing waits for the rows to blur out, so the tray never shrinks over them.
            transition={
              reduceMotion
                ? { duration: 0.12 }
                : {
                    type: "spring",
                    stiffness: 350,
                    damping: 28,
                    mass: 0.8,
                    delay: open ? 0 : 0.09,
                  }
            }
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 overflow-hidden border border-black/[0.06] bg-white text-[#1f1f1d] shadow-[0_1px_2px_rgb(0_0_0/0.05),0_12px_28px_-20px_rgb(0_0_0/0.16)] dark:border-white/[0.07] dark:bg-[#252420] dark:text-[#f2f1ec] dark:shadow-[0_1px_2px_rgb(0_0_0/0.28),0_12px_28px_-20px_rgb(0_0_0/0.48)]"
          >
            <Popover.Trigger
              aria-label={open ? "Close transaction menu" : "Open transaction menu"}
              data-done={(!open && outcome) || undefined}
              className={`absolute z-10 grid place-items-center text-[#1f1f1d] transition-[background-color,border-radius,color,transform] duration-150 ease-out active:scale-[0.97] focus-visible:outline-2 focus-visible:outline-offset-[-3px] focus-visible:outline-fd-ring data-done:text-green-600 dark:text-[#f2f1ec] dark:data-done:text-green-400 ${
                open
                  ? "right-[5px] top-[5px] size-11 rounded-full bg-[#efefeb] hover:bg-[#e6e6e0] dark:bg-[#3c3b35] dark:hover:bg-[#47463f]"
                  : "right-0 top-0 size-[52px] rounded-full hover:bg-[#efefeb] dark:hover:bg-[#3c3b35]"
              }`}
            >
              <Remold.Icon
                icon={
                  <HugeiconsIcon
                    icon={
                      open
                        ? Cancel01Icon
                        : (outcome?.icon ?? MoreHorizontalIcon)
                    }
                  />
                }
                className="size-5"
                strokeWidth={2.15}
                spring={{ duration: 0.32, bounce: 0.08 }}
                aria-hidden="true"
              />
            </Popover.Trigger>

            <Popover.Portal container={shellRef}>
              <Popover.Positioner
                side="bottom"
                align="end"
                className="!absolute !inset-0 !transform-none"
              >
                <Popover.Popup
                  initialFocus={false}
                  className="absolute inset-0 outline-none transition-[opacity,filter] duration-100 ease-out data-ending-style:opacity-0 data-ending-style:blur-[3px] motion-reduce:data-ending-style:blur-none"
                >
                  <motion.div
                    initial={
                      reduceMotion ? { opacity: 0 } : { opacity: 0, y: 18 }
                    }
                    animate={{ opacity: 1, y: 0 }}
                    transition={{
                      delay: reduceMotion ? 0 : 0.08,
                      ...(reduceMotion
                        ? { duration: 0.16 }
                        : {
                            type: "spring" as const,
                            stiffness: 420,
                            damping: 33,
                            mass: 0.55,
                          }),
                    }}
                    className="absolute inset-x-1 top-2"
                  >
                    <div className="flex h-[52px] items-center px-5 pr-16 text-[16px] font-semibold leading-5 tracking-[-0.015em] text-[#1f1f1d] dark:text-[#f2f1ec]">
                      <span className="truncate">Blue Bottle · $4.80</span>
                    </div>
                    <LayoutGroup id="fluid-popover-menu">
                      <div onPointerLeave={() => setHoveredAction(null)}>
                        {actions.map((action, index) => (
                          <motion.a
                            key={action.label}
                            href={`#${action.label
                              .toLowerCase()
                              .replace(" ", "-")}`}
                            {...rise(0.11 + index * 0.045)}
                            whileTap={{ scale: 0.99 }}
                            onPointerEnter={() =>
                              setHoveredAction(action.label)
                            }
                            onFocus={() => setHoveredAction(action.label)}
                            onClick={(event) => choose(event, action)}
                            className="relative flex h-11 w-full items-center gap-3 rounded-xl px-5 text-left text-[15px] font-medium leading-5 tracking-[-0.01em] text-[#1f1f1d] focus-visible:outline-none dark:text-[#f2f1ec]"
                          >
                            {hoveredAction === action.label && (
                              <motion.span
                                layoutId="fluid-popover-hover"
                                className="pointer-events-none absolute inset-0 rounded-xl bg-[#f5f5f1] dark:bg-[#33322d]"
                                transition={{
                                  type: "spring",
                                  stiffness: 460,
                                  damping: 34,
                                  mass: 0.55,
                                }}
                              />
                            )}
                            <Remold.Icon
                              icon={<HugeiconsIcon icon={action.icon} />}
                              className="relative size-[18px] text-[#817f77] dark:text-[#aaa79e]"
                              strokeWidth={2.15}
                              aria-hidden="true"
                            />
                            <span className="relative whitespace-nowrap">
                              {action.label}
                            </span>
                          </motion.a>
                        ))}
                      </div>
                    </LayoutGroup>
                  </motion.div>
                </Popover.Popup>
              </Popover.Positioner>
            </Popover.Portal>
          </motion.div>
        </Popover.Root>
      </div>
      <p className="sr-only" aria-live="polite">
        {outcome?.message ?? ""}
      </p>
    </div>
  );
}
