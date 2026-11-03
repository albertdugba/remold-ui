"use client";
import { LayoutGroup, motion } from "motion/react";
import { useState } from "react";
import { Frame, Segmented } from "./frame";

const PEOPLE = [
  { name: "Adjoa Tetteh", role: "Design", hue: 210 },
  { name: "Kwabena Frimpong", role: "Engineering", hue: 150 },
  { name: "Chloé Martin", role: "Product", hue: 30 },
  { name: "Selorm Agbeko", role: "Engineering", hue: 280 },
];

export function LayoutDemo() {
  const [view, setView] = useState<"Grid" | "List">("Grid");

  return (
    <Frame>
      <div className="grid w-full max-w-[520px] justify-items-center gap-4">
        <Segmented
          label="View"
          value={view}
          onChange={setView}
          options={["Grid", "List"] as const}
        />
        <LayoutGroup id="people-layout">
          {view === "Grid" ? (
            <div className="grid w-full grid-cols-2 gap-2.5">
              {PEOPLE.map((person) => (
                <motion.div layout layoutId={person.name} key={person.name} className="grid justify-items-center gap-1 rounded-xl border border-[var(--color-fd-border)] bg-[var(--color-fd-background)] px-3 py-[18px] text-center text-sm [&>span:last-child]:text-[13px] [&>span:last-child]:text-[var(--color-fd-muted-foreground)]">
                  <span
                    className="mb-1.5 size-12 rounded-full"
                    style={{ background: `hsl(${person.hue} 70% 62%)` }}
                    aria-hidden="true"
                  />
                  <strong>{person.name}</strong>
                  <span>{person.role}</span>
                </motion.div>
              ))}
            </div>
          ) : (
            <ul className="m-0 grid w-full list-none overflow-hidden rounded-[10px] border border-[var(--color-fd-border)] bg-[var(--color-fd-background)] p-0">
              {PEOPLE.map((person) => (
                <motion.li layout layoutId={person.name} key={person.name} className="grid grid-cols-[28px_minmax(0,1fr)_auto] items-center gap-3 border-b border-[var(--color-fd-border)] px-3.5 py-2.5 text-sm last:border-b-0 [&>span:last-child]:text-[13px] [&>span:last-child]:text-[var(--color-fd-muted-foreground)]">
                  <span
                    className="size-7 rounded-full"
                    style={{ background: `hsl(${person.hue} 70% 62%)` }}
                    aria-hidden="true"
                  />
                  <strong>{person.name}</strong>
                  <span>{person.role}</span>
                </motion.li>
              ))}
            </ul>
          )}
        </LayoutGroup>
      </div>
    </Frame>
  );
}
