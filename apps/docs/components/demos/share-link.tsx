"use client";

import { Button } from "@base-ui/react/button";
import { Toggle } from "@base-ui/react/toggle";
import { ToggleGroup } from "@base-ui/react/toggle-group";
import { Tooltip } from "@base-ui/react/tooltip";
import { HugeiconsIcon } from "@hugeicons/react";
import { Copy01Icon, Link01Icon, Tick02Icon } from "@hugeicons/core-free-icons";
import { Remold } from "@remold-ui/react";
import { AnimatePresence, MotionConfig, motion } from "motion/react";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { Frame } from "./frame";
import { useScript } from "./use-script";

type Access = "view" | "edit";

const LINK = "remold.dev/f/q4-launch-plan";
/** `short` is what a phone has room for. */
const ACCESS: { value: Access; label: string; short: string }[] = [
  { value: "view", label: "Can view", short: "View" },
  { value: "edit", label: "Can edit", short: "Edit" },
];

/** Who can already open the file: the people the link would be shared alongside. */
const PEOPLE = [
  { initials: "AM", name: "Ama Mensah", role: "Owner", face: "bg-amber-100 text-amber-800 dark:bg-amber-400/20 dark:text-amber-200" },
  { initials: "KB", name: "Kofi Boateng", role: "Can edit", face: "bg-sky-100 text-sky-800 dark:bg-sky-400/20 dark:text-sky-200" },
  { initials: "EO", name: "Esi Owusu", role: "Can view", face: "bg-rose-100 text-rose-800 dark:bg-rose-400/20 dark:text-rose-200" },
];

const SPRING = { type: "spring" as const, duration: 0.45, bounce: 0.2 };
const QUICK = { duration: 0.12 };
/** How long "Copied" shows before the row folds, and how long the pill says so afterwards. */
const COPIED_FOR = 900;
const NOTICE_FOR = 1600;

const part = (delay = 0) => ({
  initial: { opacity: 0, scale: 0.9, filter: "blur(4px)" },
  animate: {
    opacity: 1,
    scale: 1,
    filter: "blur(0px)",
    transition: { ...SPRING, delay },
  },
  exit: { opacity: 0, scale: 0.9, filter: "blur(4px)", transition: QUICK },
});

export function ShareLinkDemo({
  framed = true,
  playing,
}: { framed?: boolean; playing?: boolean } = {}) {
  const [open, setOpen] = useState(false);
  const [access, setAccess] = useState<Access>("view");
  const [copied, setCopied] = useState(false);
  const [notice, setNotice] = useState(false);
  const [width, setWidth] = useState<number | null>(null);
  const pill = useRef<HTMLDivElement>(null);
  const inner = useRef<HTMLDivElement>(null);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  // The pill springs to the width of whatever it's showing and clips it, so nothing is stretched.
  // It's measured before the first paint, so it always has a width to spring from.
  useLayoutEffect(() => {
    const element = inner.current;
    if (!element) return;
    setWidth(element.offsetWidth);
    const observer = new ResizeObserver(() => setWidth(element.offsetWidth));
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  useEffect(() => {
    if (!open) return;
    const closeOutside = (event: PointerEvent) => {
      if (!pill.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", closeOutside);
    return () => document.removeEventListener("pointerdown", closeOutside);
  }, [open]);

  const later = (ms: number, run: () => void) =>
    timers.current.push(setTimeout(run, ms));

  const share = () => {
    timers.current.forEach(clearTimeout);
    setNotice(false);
    setCopied(false);
    setOpen(true);
  };

  const copy = () => {
    if (copied) return;
    void navigator.clipboard
      ?.writeText(`https://${LINK}?access=${access}`)
      .catch(() => {});
    setCopied(true);
    later(COPIED_FOR, () => {
      setOpen(false);
      setCopied(false);
      setNotice(true);
    });
    later(COPIED_FOR + NOTICE_FOR, () => setNotice(false));
  };

  useScript(pill, playing, [
    [1300, share],
    [800, () => setAccess("edit")],
    [700, copy],
    [COPIED_FOR + NOTICE_FOR + 900, () => {}],
    [600, () => setAccess("view")],
  ]);

  const body = (
    <MotionConfig transition={SPRING} reducedMotion="user">
      <Tooltip.Provider delay={250}>
        <section
          className="grid place-items-center font-sans"
          aria-label="Share this file"
        >
          <motion.div
            ref={pill}
            className="relative h-12 overflow-clip rounded-full bg-white text-zinc-900 dark:bg-[#232327] dark:text-zinc-50"
            initial={false}
            animate={{ width: width ?? "auto" }}
            onKeyDown={(event) => event.key === "Escape" && setOpen(false)}
          >
            <div
              ref={inner}
              className="relative flex h-full w-max items-center"
            >
              <ul
                className="group/faces m-0 flex list-none items-center p-0 pl-2 data-open:max-sm:hidden"
                data-open={open || undefined}
                aria-label={`${PEOPLE.length} people have access`}
              >
                {PEOPLE.map((person, index) => (
                  <li
                    key={person.initials}
                    className="transition-[margin] duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] not-first:-ml-1.5 group-data-open/faces:not-first:-ml-2.5"
                    style={{ zIndex: PEOPLE.length - index }}
                  >
                    <Tooltip.Root>
                      <Tooltip.Trigger
                        render={<span tabIndex={0} />}
                        className={`grid size-8 place-items-center rounded-full text-[10.5px] font-semibold tracking-[0.02em] shadow-[0_0_0_2px_#ffffff] outline-none focus-visible:ring-2 focus-visible:ring-zinc-900 dark:shadow-[0_0_0_2px_#232327] dark:focus-visible:ring-zinc-50 ${person.face}`}
                        aria-label={`${
                          person.name
                        }, ${person.role.toLowerCase()}`}
                      >
                        {person.initials}
                      </Tooltip.Trigger>
                      <Tooltip.Portal>
                        <Tooltip.Positioner sideOffset={8}>
                          <Tooltip.Popup className="origin-(--transform-origin) rounded-md bg-zinc-900 px-2 py-1 font-sans text-[12px] font-medium whitespace-nowrap text-white transition-[opacity,scale] duration-150 data-ending-style:scale-95 data-ending-style:opacity-0 data-starting-style:scale-95 data-starting-style:opacity-0 dark:bg-zinc-50 dark:text-[#232327]">
                            {person.name} · {person.role}
                          </Tooltip.Popup>
                        </Tooltip.Positioner>
                      </Tooltip.Portal>
                    </Tooltip.Root>
                  </li>
                ))}
              </ul>
              <AnimatePresence mode="popLayout" initial={false}>
                {open ? (
                  <motion.div
                    key="open"
                    className="flex h-full items-center gap-1.5 pr-1.5 pl-3"
                  >
                    <motion.span
                      {...part(0.02)}
                      className="mr-1.5 h-5 w-px bg-zinc-200 max-sm:hidden dark:bg-white/10"
                      aria-hidden="true"
                    />
                    <motion.span
                      {...part(0.04)}
                      className="grid text-zinc-400 dark:text-zinc-500"
                    >
                      <HugeiconsIcon
                        icon={Link01Icon}
                        className="size-4"
                        strokeWidth={2}
                        aria-hidden="true"
                      />
                    </motion.span>
                    <motion.span
                      {...part(0.06)}
                      className="mr-1.5 w-36 truncate text-[13.5px] text-zinc-700 max-sm:hidden dark:text-zinc-300"
                      title={LINK}
                    >
                      {LINK}
                    </motion.span>
                    <motion.div {...part(0.1)}>
                      <ToggleGroup
                        className="flex h-9 items-center rounded-full bg-zinc-100 p-[3px] dark:bg-white/[0.07]"
                        aria-label="People with the link"
                        value={[access]}
                        onValueChange={(next) =>
                          next[0] && setAccess(next[0] as Access)
                        }
                      >
                        {ACCESS.map((option) => (
                          <Toggle
                            key={option.value}
                            value={option.value}
                            className="relative h-full cursor-pointer rounded-full px-3 text-[12.5px] font-medium whitespace-nowrap text-zinc-500 transition-colors duration-200 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-zinc-900 data-pressed:text-zinc-900 dark:text-zinc-400 dark:focus-visible:outline-zinc-50 dark:data-pressed:text-zinc-50"
                          >
                            {access === option.value && (
                              <motion.span
                                layoutId="share-link-access"
                                className="absolute inset-0 rounded-full bg-white shadow-[0_1px_2px_rgb(0_0_0/0.1),0_0_0_0.5px_rgb(0_0_0/0.06)] dark:bg-[#3a3a40]"
                              />
                            )}
                            <span className="relative">
                              <span className="sm:hidden">{option.short}</span>
                              <span className="max-sm:hidden">{option.label}</span>
                            </span>
                          </Toggle>
                        ))}
                      </ToggleGroup>
                    </motion.div>
                    <Button
                      className="flex h-9 cursor-pointer items-center gap-1.5 rounded-full bg-zinc-900 pr-4 pl-3.5 text-[13px] font-medium whitespace-nowrap text-white transition-colors duration-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-900 data-[copied]:bg-green-600 dark:bg-zinc-50 dark:text-[#232327] dark:focus-visible:outline-zinc-50 dark:data-[copied]:bg-green-500"
                      data-copied={copied || undefined}
                      onClick={copy}
                      render={
                        <motion.button
                          {...part(0.14)}
                          whileTap={{ scale: 0.95 }}
                        />
                      }
                    >
                      <Remold.Icon
                        icon={
                          <HugeiconsIcon
                            icon={copied ? Tick02Icon : Copy01Icon}
                          />
                        }
                        className="size-4"
                        strokeWidth={2}
                        aria-hidden="true"
                      />
                      <Remold.Text>{copied ? "Copied" : "Copy"}</Remold.Text>
                    </Button>
                  </motion.div>
                ) : (
                  <Button
                    key="closed"
                    className="flex h-12 cursor-pointer items-center gap-2 rounded-full pr-5 pl-3 text-[14px] text-zinc-800 dark:text-zinc-100 font-medium whitespace-nowrap focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-900 dark:focus-visible:outline-zinc-50"
                    aria-expanded="false"
                    onClick={share}
                    render={
                      <motion.button
                        {...part(0.06)}
                        whileTap={{ scale: 0.97 }}
                      />
                    }
                  >
                    <Remold.Icon
                      icon={
                        <HugeiconsIcon
                          icon={notice ? Tick02Icon : Link01Icon}
                        />
                      }
                      className={`size-4 ${
                        notice
                          ? "text-green-600 dark:text-green-400"
                          : "text-zinc-500 dark:text-zinc-400"
                      }`}
                      strokeWidth={2}
                      aria-hidden="true"
                    />
                    <Remold.Text>
                      {notice ? "Link copied" : "Share"}
                    </Remold.Text>
                  </Button>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
          <p className="sr-only" aria-live="polite">
            {notice
              ? `Link copied. Anyone with it ${
                  access === "edit" ? "can edit" : "can view"
                }.`
              : ""}
          </p>
        </section>
      </Tooltip.Provider>
    </MotionConfig>
  );

  return framed ? <Frame>{body}</Frame> : body;
}
