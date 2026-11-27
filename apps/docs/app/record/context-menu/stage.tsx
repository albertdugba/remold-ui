"use client";

import { Cursor01Icon, PlayIcon, StopIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { AnimatePresence, motion, useAnimate } from "motion/react";
import { useEffect, useEffectEvent, useRef, useState } from "react";
import { ContextMenuDemo } from "@/components/demos/context-menu";

type Point = readonly [x: number, y: number];

const GLIDE = { type: "spring" as const, duration: 0.48, bounce: 0.06 };
const PRESS = { type: "spring" as const, duration: 0.16, bounce: 0 };

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const pointOn = (element: Element, inset = 36): Point => {
  const box = element.getBoundingClientRect();
  return [box.left + Math.min(inset, box.width / 2), box.top + box.height / 2];
};

const row = (id: string) => document.querySelector<HTMLElement>(`[data-entry="${CSS.escape(id)}"]`);

const menuItem = (label: string) =>
  [...document.querySelectorAll<HTMLElement>('[role="menuitem"], [role="menuitemradio"]')].filter((item) => item.textContent?.trim().startsWith(label)).at(-1) ?? null;

function hover(element: Element, [x, y]: Point) {
  const init = { bubbles: true, cancelable: true, clientX: x, clientY: y, pointerType: "mouse" };
  element.dispatchEvent(new PointerEvent("pointerover", init));
  element.dispatchEvent(new PointerEvent("pointerenter", { ...init, bubbles: false }));
  element.dispatchEvent(new MouseEvent("mouseover", init));
  element.dispatchEvent(new MouseEvent("mouseenter", { ...init, bubbles: false }));
  element.dispatchEvent(new PointerEvent("pointermove", init));
  element.dispatchEvent(new MouseEvent("mousemove", init));
}

class Stopped extends Error {}

export function Stage() {
  const [take, setTake] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [cursor, animate] = useAnimate<HTMLDivElement>();
  const run = useRef(0);

  const stop = () => {
    run.current += 1;
    setPlaying(false);
  };

  const play = async () => {
    const id = ++run.current;
    const alive = () => {
      if (run.current !== id) throw new Stopped();
    };
    const wait = async (ms: number) => {
      await sleep(ms);
      alive();
    };
    const glide = async (point: Point) => {
      await animate(cursor.current, { x: point[0], y: point[1] }, GLIDE);
      alive();
    };
    const press = async () => {
      await animate(cursor.current, { scale: 0.82 }, PRESS);
      await animate(cursor.current, { scale: 1 }, PRESS);
      alive();
    };
    const find = async (lookup: () => HTMLElement | null) => {
      for (let attempt = 0; attempt < 30; attempt += 1) {
        const element = lookup();
        if (element) return element;
        await wait(50);
      }
      throw new Stopped();
    };
    const rightClick = async (id: string) => {
      const target = await find(() => row(id));
      const point = pointOn(target, 90);
      await glide(point);
      await press();
      target.dispatchEvent(new MouseEvent("contextmenu", { bubbles: true, cancelable: true, clientX: point[0], clientY: point[1], button: 2 }));
      await wait(420);
    };
    const through = async (label: string, pause = 320) => {
      const item = await find(() => menuItem(label));
      const point = pointOn(item);
      await glide(point);
      hover(item, point);
      await wait(pause);
    };
    const choose = async (label: string) => {
      await through(label, 140);
      await press();
      menuItem(label)?.click();
      await wait(1050);
    };

    setTake((count) => count + 1);
    setPlaying(true);
    try {
      await wait(300);
      const start: Point = [window.innerWidth * 0.62, window.innerHeight * 0.72];
      await animate(cursor.current, { x: start[0], y: start[1], opacity: 0, scale: 1 }, { duration: 0 });
      await animate(cursor.current, { opacity: 1 }, { duration: 0.2 });
      await wait(250);

      await rightClick("doorbusters");
      await through("Status");
      await choose("Active");

      await rightClick("black-friday");
      await through("New");
      await through("From template");
      await through("Retargeting");
      await choose("Cart abandoners");

      await rightClick("gift-guide");
      await through("Move to");
      await through("Q4 Holiday");
      await choose("Black Friday");

      await glide([window.innerWidth * 0.62, window.innerHeight * 0.72]);
      await animate(cursor.current, { opacity: 0 }, { duration: 0.3 });
    } catch (error) {
      if (!(error instanceof Stopped)) throw error;
    } finally {
      if (run.current === id) setPlaying(false);
    }
  };

  const onKey = useEffectEvent((event: KeyboardEvent) => {
    if (event.key === "Escape" && playing) stop();
    if (event.key.toLowerCase() === "p" && !playing && !(event.target as HTMLElement).closest("input, textarea")) void play();
  });

  useEffect(() => {
    const listener = (event: KeyboardEvent) => onKey(event);
    window.addEventListener("keydown", listener);
    return () => window.removeEventListener("keydown", listener);
  }, []);

  return (
    <main
      data-playing={playing || undefined}
      className="grid min-h-screen place-items-center bg-[#ececee] p-10 data-playing:cursor-none data-playing:[&_*]:cursor-none dark:bg-[#0c0c0e]"
      onContextMenu={(event) => event.preventDefault()}
    >
      <h1 className="sr-only">Context menu recording stage</h1>
      <div className="relative grid h-[860px] w-[1440px] max-w-full grid-cols-[minmax(0,0.34fr)_minmax(0,1fr)] items-center rounded-[32px] bg-[#f6f6f7] dark:bg-[#141416]">
        <div className="grid justify-items-end">
          <ContextMenuDemo key={take} />
        </div>
      </div>

      <div ref={cursor} aria-hidden="true" className="pointer-events-none fixed top-0 left-0 z-[1000] opacity-0" style={{ transformOrigin: "4px 3px" }}>
        <HugeiconsIcon icon={Cursor01Icon} size={26} strokeWidth={1.6} className="-translate-x-[4px] -translate-y-[3px] text-white drop-shadow-[0_2px_4px_rgb(0_0_0/0.3)] [&_path]:fill-[#111]" />
      </div>

      <AnimatePresence initial={false}>
        {!playing ? (
          <motion.button
            key="play"
            type="button"
            className="fixed bottom-6 left-1/2 z-[999] inline-flex h-10 -translate-x-1/2 cursor-pointer items-center gap-2 rounded-full border-0 bg-[#18181b] px-4 font-sans text-[13px] font-semibold text-white shadow-[0_8px_24px_-8px_rgb(0_0_0/0.4)] outline-none focus-visible:shadow-[0_0_0_2px_#fff,0_0_0_4px_#18181b]"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => void play()}
          >
            <HugeiconsIcon icon={PlayIcon} size={15} strokeWidth={2.2} className="[&_path]:fill-current" aria-hidden="true" />
            Play walkthrough
            <kbd className="rounded-[5px] bg-white/15 px-1.5 font-sans text-[11px]">P</kbd>
          </motion.button>
        ) : (
          <motion.button
            key="stop"
            type="button"
            aria-label="Stop walkthrough"
            className="fixed right-5 bottom-5 z-[999] grid size-8 cursor-pointer place-items-center rounded-full border-0 bg-black/5 p-0 text-black/30 opacity-60 outline-none hover:opacity-100 dark:bg-white/5 dark:text-white/30"
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.6 }}
            exit={{ opacity: 0 }}
            onClick={stop}
          >
            <HugeiconsIcon icon={StopIcon} size={14} strokeWidth={2} aria-hidden="true" />
          </motion.button>
        )}
      </AnimatePresence>
    </main>
  );
}
