"use client";

import { Popover } from "@base-ui/react/popover";
import {
  AlbumIcon,
  Cancel01Icon,
  Delete02Icon,
  FavouriteIcon,
  MoreHorizontalIcon,
  Share08Icon,
  ViewOffSlashIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon, type IconSvgElement } from "@hugeicons/react";
import { Remold } from "@remold-ui/react";
import { LayoutGroup, motion, useReducedMotion } from "motion/react";
import { useRef, useState, type MouseEvent } from "react";
import { useScript } from "./use-script";

type Action = { label: string; icon: IconSvgElement; destructive?: boolean };

const actions: readonly Action[] = [
  { label: "Share", icon: Share08Icon },
  { label: "Favourite", icon: FavouriteIcon },
  { label: "Add to Album", icon: AlbumIcon },
  { label: "Hide", icon: ViewOffSlashIcon },
  { label: "Delete", icon: Delete02Icon, destructive: true },
];

const MENU_WIDTH = 300;
const MENU_HEIGHT = 76 + actions.length * 44;

/** A Base UI popover menu whose visible shell expands from the trigger itself. */
export function PopoverMenuDemo({ playing }: { playing?: boolean }) {
  const [open, setOpen] = useState(false);
  const [hoveredAction, setHoveredAction] = useState<string | null>(null);
  const shellRef = useRef<HTMLDivElement>(null);
  const reduceMotion = useReducedMotion();

  const close = (nextOpen: boolean) => {
    setOpen(nextOpen);
    if (!nextOpen) setHoveredAction(null);
  };

  const choose = (event: MouseEvent<HTMLAnchorElement>) => {
    event.preventDefault();
    close(false);
  };

  useScript(shellRef, playing, [
    [900, () => close(true)],
    ...actions.slice(0, 3).map((action) => [380, () => setHoveredAction(action.label)] as const),
    [900, () => close(false)],
  ]);

  const rise = (delay = 0) => ({
    initial: reduceMotion ? { opacity: 0 } : { opacity: 0, y: 10, filter: "blur(4px)" },
    animate: { opacity: 1, y: 0, filter: "blur(0px)" },
    transition: {
      delay: reduceMotion ? 0 : delay,
      duration: 0.2,
      ease: [0.23, 1, 0.32, 1] as const,
    },
  });

  return (
    <div className="grid w-full place-items-center py-10">
      <div className="relative shrink-0" style={{ width: MENU_WIDTH, height: MENU_HEIGHT }}>
        <Popover.Root open={open} onOpenChange={close} modal={false}>
          <motion.div
            ref={shellRef}
            animate={
              open
                ? { width: MENU_WIDTH, height: MENU_HEIGHT, borderRadius: 27 }
                : { width: 54, height: 54, borderRadius: 27 }
            }
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
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 overflow-hidden border border-black/[0.06] bg-white text-[#1f1f1d] shadow-[0_1px_2px_rgb(0_0_0/0.05),0_12px_28px_-20px_rgb(0_0_0/0.16)] dark:border-white/[0.07] dark:bg-[#1c1c1f] dark:text-[#fafafa] dark:shadow-[0_1px_2px_rgb(0_0_0/0.28),0_12px_28px_-20px_rgb(0_0_0/0.48)]"
          >
            <Popover.Trigger
              aria-label={open ? "Close photo menu" : "Open photo menu"}
              className={`absolute z-10 grid place-items-center text-[#1f1f1d] transition-[background-color,border-radius,color,transform] duration-150 ease-out active:scale-[0.97] focus-visible:outline-2 focus-visible:outline-offset-[-3px] focus-visible:outline-fd-ring dark:text-[#fafafa] ${
                open
                  ? "right-[5px] top-[5px] size-11 rounded-full bg-[#efefeb] hover:bg-[#e6e6e0] dark:bg-[#2c2c31] dark:hover:bg-[#36363c]"
                  : "right-0 top-0 size-[52px] rounded-full hover:bg-[#efefeb] dark:hover:bg-[#2c2c31]"
              }`}
            >
              <Remold.Icon
                icon={<HugeiconsIcon icon={open ? Cancel01Icon : MoreHorizontalIcon} />}
                className="size-5"
                strokeWidth={2.15}
                spring={{ duration: 0.32, bounce: 0.08 }}
                aria-hidden="true"
              />
            </Popover.Trigger>

            <Popover.Portal container={shellRef}>
              <Popover.Positioner side="bottom" align="end" className="!absolute !inset-0 !transform-none">
                <Popover.Popup
                  initialFocus={false}
                  className="absolute inset-0 outline-none transition-[opacity,filter] duration-100 ease-out data-ending-style:opacity-0 data-ending-style:blur-[3px] motion-reduce:data-ending-style:blur-none"
                >
                  <motion.div
                    initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 18 }}
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
                    <div className="flex h-[52px] items-center px-5 pr-16 text-[16px] font-semibold leading-5 tracking-[-0.015em] text-[#1f1f1d] dark:text-[#fafafa]">
                      <span className="truncate">Sunset at Labadi</span>
                    </div>
                    <LayoutGroup id="popover-menu">
                      <div onPointerLeave={() => setHoveredAction(null)}>
                        {actions.map((action, index) => (
                          <motion.a
                            key={action.label}
                            href={`#${action.label.toLowerCase().replace(" ", "-")}`}
                            {...rise(0.11 + index * 0.045)}
                            whileTap={{ scale: 0.99 }}
                            onPointerEnter={(event) =>
                              event.pointerType === "mouse" && setHoveredAction(action.label)
                            }
                            onFocus={() => setHoveredAction(action.label)}
                            onClick={choose}
                            className={`relative flex h-11 w-full items-center gap-3 rounded-xl px-5 text-left text-[15px] font-medium leading-5 tracking-[-0.01em] focus-visible:outline-none ${
                              action.destructive
                                ? "text-[#e5484d] dark:text-[#ff6369]"
                                : "text-[#1f1f1d] dark:text-[#fafafa]"
                            }`}
                          >
                            {hoveredAction === action.label && (
                              <motion.span
                                layoutId="popover-menu-hover"
                                className="pointer-events-none absolute inset-0 rounded-xl bg-[#f5f5f1] dark:bg-[#2a2a2f]"
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
                              className={`relative size-[18px] ${
                                action.destructive ? "text-current" : "text-[#817f77] dark:text-[#a1a1aa]"
                              }`}
                              strokeWidth={2.15}
                              aria-hidden="true"
                            />
                            <span className="relative whitespace-nowrap">{action.label}</span>
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
    </div>
  );
}
