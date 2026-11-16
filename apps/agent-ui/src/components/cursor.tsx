import { AnimatePresence, motion } from "motion/react";
import { useEffect, useLayoutEffect, useState } from "react";
import { controlOf } from "../agent/bridge";
import { useAgentUi } from "../agent/store";

const GLIDE = { type: "spring" as const, duration: 0.6, bounce: 0.12 };
const LEAVE = { type: "spring" as const, duration: 0.3, bounce: 0 };

function pointOf(target: string | null) {
  const home = target === "home";
  const element = home ? document.querySelector<HTMLElement>("[data-agent-home]") : target ? controlOf(target) : null;

  if (!element) return null;

  const zoom = (document.documentElement as HTMLElement & { currentCSSZoom?: number }).currentCSSZoom ?? 1;
  const box = element.getBoundingClientRect();
  const left = box.left / zoom;
  const top = box.top / zoom;
  const width = box.width / zoom;
  const height = box.height / zoom;

  if (home) return { x: left + width / 2, y: top + height / 2 };

  return { x: left + Math.min(width - 12, Math.max(width * 0.72, 18)), y: top + height * 0.62 };
}

export function AgentCursor() {
  const cursor = useAgentUi((current) => current.cursor);
  const [point, setPoint] = useState<{ x: number; y: number } | null>(null);
  const [presses, setPresses] = useState(0);

  useEffect(() => {
    if (cursor.pressing) setPresses((current) => current + 1);
    else if (!cursor.shown) setPresses(0);
  }, [cursor.pressing, cursor.shown]);

  useLayoutEffect(() => {
    if (!cursor.shown) return;

    const place = () => setPoint((before) => pointOf(cursor.target) ?? before);

    place();
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, true);

    return () => {
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", place, true);
    };
  }, [cursor.shown, cursor.target]);

  return (
    <div className="pointer-events-none fixed inset-0 z-50 overflow-hidden" aria-hidden="true">
      <AnimatePresence>
        {cursor.shown && point && (
          <motion.div
            key="cursor"
            className="absolute top-0 left-0"
            initial={{ x: point.x, y: point.y, opacity: 0, scale: 0.6, filter: "blur(4px)" }}
            animate={{ x: point.x, y: point.y, opacity: 1, scale: 1, filter: "blur(0px)" }}
            exit={{ opacity: 0, scale: 0.6, filter: "blur(4px)", transition: LEAVE }}
            transition={GLIDE}
          >
            {presses > 0 && (
              <motion.span
                key={presses}
                className="absolute -top-3 -left-3 size-6 rounded-full border-[1.5px] border-(--ink)"
                initial={{ scale: 0.3, opacity: 0.45 }}
                animate={{ scale: 1.7, opacity: 0 }}
                transition={{ duration: 0.5, ease: "easeOut" }}
              />
            )}
            <motion.svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              className="absolute -top-[3px] -left-[4px] origin-[4px_3px] drop-shadow-[0_2px_4px_rgb(10_10_11/0.25)]"
              animate={{ scale: cursor.pressing ? 0.82 : 1 }}
              transition={{ type: "spring", duration: 0.25, bounce: 0.3 }}
            >
              <path
                d="M5.6 3.3 19.3 9.8c.9.4.8 1.7-.2 2l-5.2 1.5-1.6 5.3c-.3 1-1.6 1-2 .1L4.2 4.7c-.4-.9.5-1.8 1.4-1.4Z"
                fill="#0a0a0b"
                stroke="#ffffff"
                strokeWidth="1.5"
                strokeLinejoin="round"
              />
            </motion.svg>
            <span className="absolute top-[18px] left-[15px] flex h-[21px] items-center rounded-full bg-(--ink) px-2 text-[11px] font-semibold tracking-[0.01em] whitespace-nowrap text-white">
              Agent
            </span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
