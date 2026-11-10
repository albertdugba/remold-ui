"use client";

import { Tabs } from "@base-ui/react/tabs";
import { ToggleGroup } from "@base-ui/react/toggle-group";
import { Toggle } from "@base-ui/react/toggle";
import { bounds, createMorph, parsePath, toCubics, value, type Morph, type Subpath } from "@remold-ui/core";
import { frames, prefersReducedMotion } from "@remold-ui/dom";
import { useAutoplay } from "@remold-ui/react";
import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { GLYPHS } from "./glyphs-data";
import { MARKS } from "./logo-morph-marks";

export interface LogoBrand {
  name: string;
  mark?: string;
}

export const DEFAULT_BRANDS: LogoBrand[] = [
  { name: "OpenAI", mark: MARKS.openai },
  { name: "Apple", mark: MARKS.apple },
  { name: "Cursor", mark: MARKS.cursor },
  { name: "Mercedes", mark: MARKS.mercedes },
  { name: "X", mark: MARKS.x },
  { name: "Anthropic", mark: MARKS.anthropic },
  { name: "Tesla", mark: MARKS.tesla },
];

export type Form = "text" | "logo";

const glyphs = GLYPHS.glyphs as Record<string, { d: string; adv: number }>;
const kerning = GLYPHS.kern as Record<string, number>;

type Point = { x: number; y: number };

function mapPoints(subpaths: Subpath[], move: (point: Point) => Point): Subpath[] {
  return subpaths.map((subpath) => ({
    closed: subpath.closed,
    segments: subpath.segments.map((segment) => ({
      p0: move(segment.p0),
      p1: move(segment.p1),
      p2: move(segment.p2),
      p3: move(segment.p3),
    })),
  }));
}

function word(text: string): Subpath[] {
  const outline: Subpath[] = [];
  let penX = 0;
  for (let index = 0; index < text.length; index++) {
    const character = glyphs[text[index]!] ? text[index]! : "?";
    const glyph = glyphs[character]!;
    const glyphX = penX;
    if (glyph.d)
      outline.push(
        ...mapPoints(toCubics(parsePath(glyph.d)), (point) => ({ x: point.x + glyphX, y: point.y })),
      );
    penX += glyph.adv;
    if (index < text.length - 1) penX += kerning[character + text[index + 1]] ?? 0;
  }
  return outline;
}

export const BOX = { width: 640, height: 220 };

export function fitted(brand: LogoBrand, form: Form): Subpath[] {
  const raw = form === "logo" && brand.mark ? toCubics(parsePath(brand.mark)) : word(brand.name);
  const box = bounds(raw) ?? { x: 0, y: 0, width: 1, height: 1 };
  const width = Math.max(1e-6, box.width);
  const height = Math.max(1e-6, box.height);
  const scale = Math.min(BOX.width / width, BOX.height / height);
  const offsetX = (BOX.width - width * scale) / 2 - box.x * scale;
  const offsetY = (BOX.height - height * scale) / 2 - box.y * scale;
  return mapPoints(raw, (point) => ({ x: point.x * scale + offsetX, y: point.y * scale + offsetY }));
}

export interface LogoMorphProps {
  brands?: LogoBrand[];
  color?: string;
  every?: number;
  bounce?: number;
  autoplay?: boolean;
  height?: number;
  selected?: { brand: number; form: Form };
  controls?: boolean;
}

export function LogoMorph({
  brands = DEFAULT_BRANDS,
  color = "currentColor",
  every = 1800,
  bounce = 0.12,
  autoplay: shouldPlay = false,
  height = 300,
  selected,
  controls = true,
}: LogoMorphProps) {
  const sequence = useMemo(
    () =>
      brands.flatMap((item, index): { brand: number; form: Form }[] =>
        item.mark
          ? [
              { brand: index, form: "text" },
              { brand: index, form: "logo" },
              { brand: index, form: "text" },
            ]
          : [{ brand: index, form: "text" }],
      ),
    [brands],
  );
  const autoplay = useAutoplay(sequence.length, {
    every,
    autoStart: shouldPlay && !selected,
  });
  const { setPlaying } = autoplay;
  useEffect(() => setPlaying(shouldPlay && !selected), [shouldPlay, selected, setPlaying]);

  const [chosen, setShown] = useState<{ brand: number; form: Form }>({
    brand: 0,
    form: "text",
  });
  useEffect(() => setShown(sequence[autoplay.step] ?? { brand: 0, form: "text" }), [autoplay.step, sequence]);
  const shown = selected ?? chosen;
  const brand = brands[shown.brand]!;

  const pathRef = useRef<SVGPathElement>(null);

  const morphing = useRef<{
    morph: Morph | null;
    progress: ReturnType<typeof value>;
    stop: (() => void) | null;
  } | null>(null);

  useEffect(() => {
    const progress = value(1, {
      spring: { duration: 0.75, bounce },
      precision: 0.0005,
    });
    morphing.current = { morph: null, progress, stop: null };
    return () => morphing.current?.stop?.();
  }, [bounce]);

  useEffect(() => {
    const current = morphing.current;
    const pathElement = pathRef.current;
    if (!current || !pathElement) return;
    const target = fitted(brand, shown.form);
    const from = pathElement.getAttribute("d");
    current.morph = createMorph(from || target, target, {
      pairing: "auto",
      padding: "collapse",
    });
    if (!from || prefersReducedMotion()) {
      pathElement.setAttribute("d", current.morph.d(1));
      return;
    }
    current.progress.set(0);
    current.progress.to(1);
    current.stop?.();
    current.stop = frames((dt) => {
      const moving = current.progress.step(dt);
      pathElement.setAttribute("d", current.morph!.d(current.progress.current));
      if (!moving) current.stop = null;
      return moving;
    });
  }, [brand, shown.form]);

  const chip =
    "rounded-full border border-zinc-200 px-3 py-1 text-[12.5px] text-zinc-600 transition-colors hover:border-zinc-300 hover:text-zinc-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-900 aria-pressed:border-transparent aria-pressed:bg-zinc-900 aria-pressed:text-white aria-selected:border-transparent aria-selected:bg-zinc-900 aria-selected:text-white disabled:opacity-40 dark:border-zinc-700 dark:text-zinc-300 dark:hover:border-zinc-500 dark:hover:text-white dark:focus-visible:outline-white dark:aria-pressed:bg-white dark:aria-pressed:text-zinc-900 dark:aria-selected:bg-white dark:aria-selected:text-zinc-900";
  const pad = 30;
  return (
    <Tabs.Root
      value={shown.brand}
      onValueChange={(tab) => {
        const brandIndex = Number(tab);
        const nextBrand = brands[brandIndex];
        if (!nextBrand) return;
        setShown({
          brand: brandIndex,
          form: shown.form === "logo" && nextBrand.mark ? "logo" : "text",
        });
      }}
    >
      <div
        ref={autoplay.ref}
        style={{ "--lm-color": color } as CSSProperties}
        className="not-prose my-6 overflow-hidden rounded-2xl border border-zinc-200 bg-white font-sans text-zinc-900 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-100"
      >
        <Tabs.Panel value={shown.brand} keepMounted>
          <div className="grid place-items-center px-6" style={{ height }}>
            <svg
              viewBox={`${-pad} ${-pad} ${BOX.width + pad * 2} ${BOX.height + pad * 2}`}
              className="h-full max-h-[78%] w-full"
              role="img"
              aria-label={shown.form === "logo" ? `${brand.name} logo` : brand.name}
            >
              <path ref={pathRef} fill="var(--lm-color)" fillRule="nonzero" />
            </svg>
          </div>
        </Tabs.Panel>
        {controls && (
          <div className="flex flex-wrap items-center gap-2 border-t border-zinc-100 px-4 py-3 dark:border-zinc-800">
            <Tabs.List aria-label="Brand" className="flex flex-wrap gap-1" activateOnFocus>
              {brands.map((item, index) => (
                <Tabs.Tab key={item.name} value={index} className={chip}>
                  {item.name}
                </Tabs.Tab>
              ))}
            </Tabs.List>
            <span className="mx-1 h-4 w-px bg-zinc-200 dark:bg-zinc-700" aria-hidden="true" />
            <ToggleGroup
              className="flex gap-1"
              aria-label="Show"
              value={[shown.form]}
              onValueChange={(values) => {
                const form = values[0] as Form | undefined;
                if (form) setShown({ ...shown, form });
              }}
            >
              <Toggle value="text" className={chip}>
                Text
              </Toggle>
              <Toggle
                value="logo"
                disabled={!brand.mark}
                title={brand.mark ? undefined : `No ${brand.name} logo yet`}
                className={chip}
              >
                Logo
              </Toggle>
            </ToggleGroup>
            <button
              type="button"
              {...autoplay.toggleProps}
              className="ml-auto rounded-full px-3 py-1 text-[12.5px] text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 focus-visible:outline-2 focus-visible:outline-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-white dark:focus-visible:outline-white"
            >
              {autoplay.playing ? "Pause" : "Play"}
            </button>
          </div>
        )}
      </div>
    </Tabs.Root>
  );
}

export const LogoMorphDemo = LogoMorph;
