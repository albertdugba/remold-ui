"use client";

import { HugeiconsIcon } from "@hugeicons/react";
import { PauseIcon, PlayIcon } from "@hugeicons/core-free-icons";
import { createMorph, value } from "@remold-ui/core";
import { frames, prefersReducedMotion } from "@remold-ui/dom";
import { Toggle } from "@base-ui/react/toggle";
import { ToggleGroup } from "@base-ui/react/toggle-group";
import { useEffect, useMemo, useRef, useState } from "react";
import { BOX, DEFAULT_BRANDS, fitted } from "./logo-morph";

const HUES = [
  "#6366f1",
  "#ec4899",
  "#f59e0b",
  "#10b981",
  "#06b6d4",
  "#8b5cf6",
  "#ef4444",
  "#84cc16",
  "#0ea5e9",
  "#f97316",
];
const brands = DEFAULT_BRANDS.filter((b) => b.mark);

const pieces = (d: string) => d.split(/(?=M)/).filter((p) => p.trim());

type Padding = "collapse" | "merge";

function Segmented<T extends string>({
  label,
  value: current,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: readonly T[];
  onChange: (v: T) => void;
}) {
  return (
    <ToggleGroup
      aria-label={label}
      value={[current]}
      onValueChange={(values) => {
        const next = values[0] as T | undefined;
        if (next) onChange(next);
      }}
      className="flex rounded-lg bg-zinc-100 p-0.5 dark:bg-zinc-800"
    >
      {options.map((o) => (
        <Toggle
          key={o}
          value={o}
          className="rounded-md px-2.5 py-1 text-[12.5px] text-zinc-500 capitalize transition-colors data-[pressed]:bg-white data-[pressed]:text-zinc-900 data-[pressed]:shadow-sm dark:data-[pressed]:bg-zinc-950 dark:data-[pressed]:text-zinc-100"
        >
          {o}
        </Toggle>
      ))}
    </ToggleGroup>
  );
}

export function LogoMorphAnatomy() {
  const [brandName, setBrandName] = useState(brands[0]!.name);
  const [padding, setPadding] = useState<Padding>("collapse");
  const [t, setT] = useState(0.5);
  const [playing, setPlaying] = useState(false);
  const brand = brands.find((b) => b.name === brandName)!;

  const morph = useMemo(
    () =>
      createMorph(fitted(brand, "text"), fitted(brand, "logo"), {
        pairing: "auto",
        padding,
      }),
    [brand, padding],
  );
  const counts = useMemo(
    () => ({
      word: fitted(brand, "text").length,
      logo: fitted(brand, "logo").length,
      paired: pieces(morph.d(0)).length,
    }),
    [brand, morph],
  );

  const spring = useRef(
    value(0.5, { spring: { duration: 0.9, bounce: 0.1 }, precision: 0.0005 }),
  );
  useEffect(() => {
    if (!playing) return;
    const s = spring.current;
    s.set(t);
    if (prefersReducedMotion()) {
      setT(t < 0.5 ? 1 : 0);
      setPlaying(false);
      return;
    }
    let target = t < 0.5 ? 1 : 0;
    s.to(target);
    let rest = 0;
    return frames((dt) => {
      const moving = s.step(dt);
      setT(s.current);
      if (!moving) {
        rest += dt;
        if (rest > 0.6) {
          rest = 0;
          target = 1 - target;
          s.to(target);
        }
      }
      return true;
    });
  }, [playing]);

  const parts = pieces(morph.d(Math.max(0, Math.min(1, t))));
  const pad = 30;
  const view = `${-pad} ${-pad} ${BOX.width + pad * 2} ${BOX.height + pad * 2}`;

  return (
    <figure className="not-prose my-6 overflow-hidden rounded-2xl border border-zinc-200 bg-white font-sans text-zinc-900 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-100">
      <div className="relative">
        <svg
          viewBox={view}
          className="block h-[260px] w-full"
          role="img"
          aria-label={`${brand.name}, ${Math.round(
            t * 100,
          )}% of the way from the word to the logo`}
        >
          <path
            d={morph.d(0)}
            fill="none"
            stroke="currentColor"
            strokeOpacity={0.12}
            strokeDasharray="3 4"
          />
          <path
            d={morph.d(1)}
            fill="none"
            stroke="currentColor"
            strokeOpacity={0.12}
            strokeDasharray="3 4"
          />
          {parts.map((d, i) => (
            <path
              key={i}
              d={d}
              fill={HUES[i % HUES.length]}
              fillOpacity={0.88}
            />
          ))}
        </svg>
      </div>

      <div className="grid gap-3 border-t border-zinc-100 px-4 py-3.5 dark:border-zinc-800">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setPlaying((p) => !p)}
            aria-label={playing ? "Pause" : "Play"}
            className="grid size-8 shrink-0 place-items-center rounded-full bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
          >
            {playing ? (
              <HugeiconsIcon icon={PauseIcon} className="size-3.5" fill="currentColor" />
            ) : (
              <HugeiconsIcon icon={PlayIcon} className="size-3.5 translate-x-px" fill="currentColor" />
            )}
          </button>
          <span
            aria-hidden="true"
            className="font-mono text-[11px] tracking-wide text-zinc-400 uppercase"
          >
            Word
          </span>
          <input
            type="range"
            min={0}
            max={1}
            step={0.001}
            value={t}
            aria-label="Progress from the word to the logo"
            onChange={(e) => {
              setPlaying(false);
              setT(Number(e.target.value));
            }}
            className="h-1 flex-1 cursor-pointer accent-zinc-900 dark:accent-zinc-100"
          />
          <span
            aria-hidden="true"
            className="font-mono text-[11px] tracking-wide text-zinc-400 uppercase"
          >
            Logo
          </span>
          <span className="w-10 text-right font-mono text-[12px] text-zinc-500 tabular-nums">
            {Math.round(t * 100)}%
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Segmented
            label="Brand"
            value={brandName}
            options={brands.map((b) => b.name)}
            onChange={setBrandName}
          />
          <Segmented
            label="Leftover pieces"
            value={padding}
            options={["collapse", "merge"] as const}
            onChange={setPadding}
          />
          <p className="m-0 ml-auto text-[12.5px] text-zinc-500">
            {counts.word} letter pieces → {counts.logo} logo pieces, paired as{" "}
            {counts.paired}
          </p>
        </div>
      </div>
      <figcaption className="border-t border-zinc-100 px-4 py-3 text-[13px] leading-relaxed text-zinc-500 dark:border-zinc-800">
        Each colour is one piece, start to finish. Pieces pair by position and
        size; the logo has fewer, so the extra letters have to go somewhere.{" "}
        {padding === "collapse" ? (
          <>
            With <code>collapse</code> they shrink to a point inside their
            partner and vanish.
          </>
        ) : (
          <>
            With <code>merge</code> they’re parked as small copies on the
            nearest outline, which is why they can still be seen at the end.
          </>
        )}
      </figcaption>
    </figure>
  );
}
