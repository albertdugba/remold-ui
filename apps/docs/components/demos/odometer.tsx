"use client";
/**
 * A number that rolls like a mechanical counter: each digit is a strip of 0–9 that spins to its new
 * place, so 288 → 384 turns the wheels rather than swapping the text. Columns are named by their
 * place from the right, so the units stay the units as the number grows and new places slide in at
 * the front.
 */
import { AnimatePresence, motion } from "motion/react";

const DIGITS = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];
const SPIN = { type: "spring" as const, duration: 0.7, bounce: 0.12 };

export function Odometer({ value, className }: { value: string; className?: string }) {
  const chars = value.split("");
  return (
    <span className={`inline-flex whitespace-nowrap leading-none tabular-nums ${className ?? ""}`} aria-label={value}>
      <AnimatePresence initial={false} mode="popLayout">
        {chars.map((char, i) => {
          const place = chars.length - i;
          const digit = /\d/.test(char) ? Number(char) : null;
          return (
            <motion.span
              key={digit === null ? `s${place}${char}` : `d${place}`}
              layout="position"
              className="inline-block"
              aria-hidden="true"
              initial={{ opacity: 0, y: "-40%" }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: "40%", transition: { duration: 0.15 } }}
              transition={SPIN}
            >
              {digit === null ? (
                char
              ) : (
                <span className="relative inline-block align-top overflow-hidden">
                  {/* Sized by a hidden digit, so the column is exactly one character tall. */}
                  <span className="invisible">0</span>
                  <motion.span className="absolute top-0 left-0 flex w-full flex-col" initial={false} animate={{ y: `${-digit * 10}%` }} transition={SPIN}>
                    {DIGITS.map((d) => (
                      <span key={d} className="block h-[1em] text-center leading-none">{d}</span>
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
