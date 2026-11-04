"use client";

import { Tooltip } from "@base-ui/react/tooltip";
import { HugeiconsIcon } from "@hugeicons/react";
import { ArrowLeft01Icon } from "@hugeicons/core-free-icons";
import { Remold } from "@remold-ui/react";
import { Frame } from "./frame";
import { useScene } from "./use-scene";

/*
 * Who's on a file, as overlapping faces with a "+3" for the rest. Opening it loosens the stack and
 * the three faces it stood for join the row; closing folds them back into the count.
 */

const PEOPLE = [
  { name: "Ada Obi", color: "#7c5cff" },
  { name: "Ben Hart", color: "#14a596" },
  { name: "Chloe Park", color: "#ef7d22" },
  { name: "Dev Rao", color: "#2f7cf0" },
  { name: "Esi Mensah", color: "#e0457b" },
  { name: "Finn Walsh", color: "#5b8c2a" },
  { name: "Gia Russo", color: "#a855f7" },
] as const;
const SHOWN = 4;
const HIDDEN = PEOPLE.length - SHOWN;

const initials = (name: string) =>
  name
    .split(" ")
    .map((part) => part[0])
    .join("");

interface State {
  open: boolean;
}

const BEATS = [
  { open: false, ms: 2200 },
  { open: true, ms: 2600 },
] as const;

const fromBeat = (step: number): State => ({ open: BEATS[step]!.open });

const SPRING = { duration: 0.5, bounce: 0.15 };

const TOGGLE =
  "relative z-0 grid size-10 cursor-pointer place-items-center rounded-full bg-zinc-100 text-[13px] font-semibold text-zinc-900 -ml-2.5 group-data-[open]/stack:-ml-1 shadow-[0_0_0_2.5px_#fff] dark:shadow-[0_0_0_2.5px_#232327] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-900 dark:focus-visible:outline-zinc-50 dark:bg-[#34343a] dark:text-zinc-50 [&_svg]:size-[17px]";

interface AvatarStackDemoProps {
  framed?: boolean;

  playing?: boolean;
}

export function AvatarStackDemo({
  framed = true,
  playing,
}: AvatarStackDemoProps) {
  const { ref, state, take } = useScene(BEATS, fromBeat, playing);
  const { open } = state;
  const people = open ? PEOPLE : PEOPLE.slice(0, SHOWN);

  const body = (
    <section
      ref={ref}
      className="grid justify-items-center gap-3 rounded-[18px] bg-white px-7 pt-6 pb-5 font-sans text-zinc-900 dark:bg-[#232327] dark:text-zinc-50"
      aria-label="People on this file"
    >
      <Tooltip.Provider delay={200}>
        <Remold.Layout
          trigger={open}
          spring={SPRING}
          choreography
          className="group/stack flex items-center"
          data-open={open || undefined}
          role="list"
        >
          {people.map((person, index) => (
            <Tooltip.Root key={person.name}>
              <Tooltip.Trigger
                render={<span role="listitem" tabIndex={0} />}
                className="relative grid size-10 cursor-default place-items-center rounded-full text-[13px] font-semibold text-white not-first:-ml-2.5 group-data-[open]/stack:not-first:-ml-1 shadow-[0_0_0_2.5px_#fff] dark:shadow-[0_0_0_2.5px_#232327] hover:z-20! focus-visible:z-20! focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-900 dark:focus-visible:outline-zinc-50"
                // Earlier faces sit on top, so the stack reads left to right.
                style={{
                  background: person.color,
                  zIndex: PEOPLE.length - index,
                }}
                aria-label={person.name}
              >
                <span aria-hidden="true">{initials(person.name)}</span>
              </Tooltip.Trigger>
              <Tooltip.Portal>
                <Tooltip.Positioner sideOffset={8}>
                  <Tooltip.Popup className="origin-(--transform-origin) rounded-md bg-zinc-900 px-2 py-1 font-sans text-[12px] font-medium whitespace-nowrap text-white transition-[opacity,scale] duration-150 data-ending-style:scale-95 data-ending-style:opacity-0 data-instant:transition-none data-starting-style:scale-95 data-starting-style:opacity-0 motion-reduce:transition-none dark:bg-zinc-50 dark:text-[#232327]">
                    {person.name}
                  </Tooltip.Popup>
                </Tooltip.Positioner>
              </Tooltip.Portal>
            </Tooltip.Root>
          ))}
          {open ? (
            <button
              key="less"
              type="button"
              className={TOGGLE}
              aria-expanded="true"
              aria-label="Show fewer people"
              onClick={() => take({ open: false })}
            >
              <HugeiconsIcon
                icon={ArrowLeft01Icon}
                strokeWidth={2}
                aria-hidden="true"
              />
            </button>
          ) : (
            <button
              key="more"
              type="button"
              className={TOGGLE}
              aria-expanded="false"
              aria-label={`Show ${HIDDEN} more people`}
              onClick={() => take({ open: true })}
            >
              +{HIDDEN}
            </button>
          )}
        </Remold.Layout>
      </Tooltip.Provider>
      <p className="m-0 text-[12.5px] text-zinc-500 dark:text-zinc-400">
        <Remold.Text>
          {open
            ? `${PEOPLE.length} people on this file`
            : `${SHOWN} people shown · ${HIDDEN} more`}
        </Remold.Text>
      </p>
    </section>
  );

  return framed ? <Frame>{body}</Frame> : body;
}
