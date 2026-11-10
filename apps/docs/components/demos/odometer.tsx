"use client";
import { AnimatePresence, motion } from "motion/react";

const DIGITS = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];
const SPIN = { type: "spring" as const, duration: 0.7, bounce: 0.12 };

export function Odometer({ value, className }: { value: string; className?: string }) {
  const characters = value.split("");
  return (
    <span
      className={`inline-flex whitespace-nowrap leading-none tabular-nums ${className ?? ""}`}
      aria-label={value}
    >
      <AnimatePresence initial={false} mode="popLayout">
        {characters.map((character, index) => {
          const place = characters.length - index;
          const digit = /\d/.test(character) ? Number(character) : null;
          return (
            <motion.span
              key={digit === null ? `s${place}${character}` : `d${place}`}
              layout="position"
              className="inline-block"
              aria-hidden="true"
              initial={{ opacity: 0, y: "-40%" }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: "40%", transition: { duration: 0.15 } }}
              transition={SPIN}
            >
              {digit === null ? (
                character
              ) : (
                <span className="relative inline-block align-top overflow-hidden">
                  <span className="invisible">0</span>
                  <motion.span
                    className="absolute top-0 left-0 flex w-full flex-col"
                    initial={false}
                    animate={{ y: `${-digit * 10}%` }}
                    transition={SPIN}
                  >
                    {DIGITS.map((reelDigit) => (
                      <span key={reelDigit} className="block h-[1em] text-center leading-none">
                        {reelDigit}
                      </span>
                    ))}
                  </motion.span>
                </span>
              )}
            </motion.span>
          );
        })}
      </AnimatePresence>
    </span>
  );
}
