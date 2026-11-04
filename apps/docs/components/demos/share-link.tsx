"use client";

import { Button } from "@base-ui/react/button";
import { Toggle } from "@base-ui/react/toggle";
import { ToggleGroup } from "@base-ui/react/toggle-group";
import { HugeiconsIcon } from "@hugeicons/react";
import { Copy01Icon, Link01Icon, Tick02Icon } from "@hugeicons/core-free-icons";
import { Remold } from "@remold-ui/react";
import { AnimatePresence, MotionConfig, motion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { Frame } from "./frame";
import { useScript } from "./use-script";

type Access = "view" | "edit";

const LINK = "remold.dev/f/q4-launch-plan";
const ACCESS: { value: Access; label: string }[] = [
  { value: "view", label: "Can view" },
  { value: "edit", label: "Can edit" },
];

const SPRING = { type: "spring" as const, duration: 0.45, bounce: 0.2 };
const QUICK = { duration: 0.12 };
/** How long "Copied" shows before the row folds, and how long the pill says so afterwards. */
const COPIED_FOR = 900;
const NOTICE_FOR = 1600;

const part = (delay = 0) => ({
  initial: { opacity: 0, scale: 0.9, filter: "blur(4px)" },
  animate: { opacity: 1, scale: 1, filter: "blur(0px)", transition: { ...SPRING, delay } },
  exit: { opacity: 0, scale: 0.9, filter: "blur(4px)", transition: QUICK },
});

export function ShareLinkDemo({ framed = true, playing }: { framed?: boolean; playing?: boolean } = {}) {
  const [open, setOpen] = useState(false);
  const [access, setAccess] = useState<Access>("view");
  const [copied, setCopied] = useState(false);
  const [notice, setNotice] = useState(false);
  const [width, setWidth] = useState<number | null>(null);
  const pill = useRef<HTMLDivElement>(null);
  const inner = useRef<HTMLDivElement>(null);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  // The pill springs to the width of whatever it's showing and clips it, so nothing is stretched.
  useEffect(() => {
    const element = inner.current;
    if (!element) return;
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

  const later = (ms: number, run: () => void) => timers.current.push(setTimeout(run, ms));

  const share = () => {
    timers.current.forEach(clearTimeout);
    setNotice(false);
    setCopied(false);
    setOpen(true);
  };

  const copy = () => {
    if (copied) return;
    void navigator.clipboard?.writeText(`https://${LINK}?access=${access}`).catch(() => {});
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
      <section className="grid place-items-center font-sans" aria-label="Share this file">
        <motion.div
          ref={pill}
          className="relative h-12 overflow-clip rounded-full bg-zinc-100 text-zinc-900 dark:bg-[#2c2c31] dark:text-zinc-50"
          initial={false}
          animate={width === null ? undefined : { width }}
          onKeyDown={(event) => event.key === "Escape" && setOpen(false)}
        >
          <div ref={inner} className="relative flex h-full w-max items-center">
            <AnimatePresence mode="popLayout" initial={false}>
              {open ? (
                <motion.div key="open" className="flex h-full items-center gap-2 pr-1.5 pl-4">
                  <motion.span {...part(0.04)} className="grid text-zinc-500 dark:text-zinc-400">
                    <HugeiconsIcon icon={Link01Icon} className="size-4" strokeWidth={2} aria-hidden="true" />
                  </motion.span>
                  <motion.span {...part(0.06)} className="w-40 truncate text-[13.5px] text-zinc-600 dark:text-zinc-300" title={LINK}>
                    {LINK}
                  </motion.span>
                  <motion.div {...part(0.1)}>
                    <ToggleGroup
                      className="flex h-9 items-center rounded-full bg-zinc-200/70 p-0.5 dark:bg-white/10"
                      aria-label="People with the link"
                      value={[access]}
                      onValueChange={(next) => next[0] && setAccess(next[0] as Access)}
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
                              className="absolute inset-0 rounded-full bg-white shadow-[0_1px_2px_rgb(0_0_0/0.08)] dark:bg-[#45454c]"
                            />
                          )}
                          <span className="relative">{option.label}</span>
                        </Toggle>
                      ))}
                    </ToggleGroup>
                  </motion.div>
                  <Button
                    className="flex h-9 cursor-pointer items-center gap-1.5 rounded-full bg-zinc-900 px-3.5 text-[13px] font-medium whitespace-nowrap text-white transition-colors duration-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-900 data-[copied]:bg-green-600 dark:bg-zinc-50 dark:text-[#232327] dark:focus-visible:outline-zinc-50 dark:data-[copied]:bg-green-500"
                    data-copied={copied || undefined}
                    onClick={copy}
                    render={<motion.button {...part(0.14)} whileTap={{ scale: 0.95 }} />}
                  >
                    <Remold.Icon icon={<HugeiconsIcon icon={copied ? Tick02Icon : Copy01Icon} />} className="size-4" strokeWidth={2} aria-hidden="true" />
                    <Remold.Text>{copied ? "Copied" : "Copy"}</Remold.Text>
                  </Button>
                </motion.div>
              ) : (
                <Button
                  key="closed"
                  className="flex h-12 cursor-pointer items-center gap-2 rounded-full px-5 text-[14px] font-medium whitespace-nowrap focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-900 dark:focus-visible:outline-zinc-50"
                  aria-expanded="false"
                  onClick={share}
                  render={<motion.button {...part(0.06)} whileTap={{ scale: 0.97 }} />}
                >
                  <Remold.Icon
                    icon={<HugeiconsIcon icon={notice ? Tick02Icon : Link01Icon} />}
                    className={`size-4 ${notice ? "text-green-600 dark:text-green-400" : "text-zinc-500 dark:text-zinc-400"}`}
                    strokeWidth={2}
                    aria-hidden="true"
                  />
                  <Remold.Text>{notice ? "Link copied" : "Share"}</Remold.Text>
                </Button>
              )}
            </AnimatePresence>
          </div>
        </motion.div>
        <p className="sr-only" aria-live="polite">
          {notice ? `Link copied. Anyone with it ${access === "edit" ? "can edit" : "can view"}.` : ""}
        </p>
      </section>
    </MotionConfig>
  );

  return framed ? <Frame>{body}</Frame> : body;
}
