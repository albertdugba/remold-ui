"use client";
/**
 * A name that turns into its logo, and back. Words are laid out from real glyph outlines and
 * logos are SVG path data; both are scaled into the same box, and core's `createMorph` pairs the
 * pieces of one with the pieces of the other, so the letters flow into the mark instead of
 * fading. Every change starts from the outline as it is right now, so switching mid-flight
 * turns smoothly towards the new shape.
 *
 * It plays name → logo → name, then on to the next brand. Logos come from Simple Icons (CC0),
 * which has no AWS or OpenAI mark, so those two are names only until you pass a `mark`.
 */
import { bounds, createMorph, parsePath, toCubics, value, type Morph, type Subpath } from "@remold-ui/core";
import { frames, prefersReducedMotion } from "@remold-ui/dom";
import { useAutoplay } from "@remold-ui/react";
import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { GLYPHS } from "./glyphs-data";
import { MARKS } from "./logo-morph-marks";

export interface LogoBrand {
  /** The name, shown as a word set in the glyph font. */
  name: string;
  /** The logo as SVG path data, in any coordinates: it's scaled to fit. Leave it out for a name only. */
  mark?: string;
}

export const DEFAULT_BRANDS: LogoBrand[] = [
  { name: "Cursor", mark: MARKS.cursor },
  { name: "AWS" },
  { name: "OpenAI" },
  { name: "X", mark: MARKS.x },
];

export type Form = "text" | "logo";

/* Words from glyph outlines */

const glyphs = GLYPHS.glyphs as Record<string, { d: string; adv: number }>;
const kerning = GLYPHS.kern as Record<string, number>;

function word(text: string): Subpath[] {
  const out: Subpath[] = [];
  let x = 0;
  for (let i = 0; i < text.length; i++) {
    const ch = glyphs[text[i]!] ? text[i]! : "?";
    const d = glyphs[ch]!.d;
    const dx = x;
    if (d) {
      for (const sp of toCubics(parsePath(d))) {
        const at = (p: { x: number; y: number }) => ({ x: p.x + dx, y: p.y });
        out.push({ closed: sp.closed, segments: sp.segments.map((c) => ({ p0: at(c.p0), p1: at(c.p1), p2: at(c.p2), p3: at(c.p3) })) });
      }
    }
    x += glyphs[ch]!.adv;
    if (i < text.length - 1) x += kerning[ch + text[i + 1]] ?? 0;
  }
  return out;
}

/** The box every shape is fitted into, centred: wide enough for a word, tall enough for a mark. */
export const BOX = { width: 640, height: 220 };

/** A brand's name or logo, scaled to fit the box and centred in it. */
export function fitted(brand: LogoBrand, form: Form): Subpath[] {
  const raw = form === "logo" && brand.mark ? toCubics(parsePath(brand.mark)) : word(brand.name);
  const b = bounds(raw) ?? { x: 0, y: 0, width: 1, height: 1 };
  const w = Math.max(1e-6, b.width);
  const h = Math.max(1e-6, b.height);
  const k = Math.min(BOX.width / w, BOX.height / h);
  const ox = (BOX.width - w * k) / 2 - b.x * k;
  const oy = (BOX.height - h * k) / 2 - b.y * k;
  const at = (p: { x: number; y: number }) => ({ x: p.x * k + ox, y: p.y * k + oy });
  return raw.map((sp) => ({
    closed: sp.closed,
    segments: sp.segments.map((c) => ({ p0: at(c.p0), p1: at(c.p1), p2: at(c.p2), p3: at(c.p3) })),
  }));
}

export interface LogoMorphProps {
  /** The brands, in order: a name and, optionally, its logo. */
  brands?: LogoBrand[];
  /** The colour of the shapes. */
  color?: string;
  /** Milliseconds each shape is held while playing. */
  every?: number;
  /** How much the morph overshoots, from 0 to 0.4. */
  bounce?: number;
  /** Play name → logo → name through the brands while on screen, until someone takes over. */
  autoplay?: boolean;
  /** The height of the stage in pixels. */
  height?: number;
  /** Show this brand and form, controlled from outside (autoplay is then off). */
  selected?: { brand: number; form: Form };
  /** Show the brand buttons and the Text / Logo switch. */
  controls?: boolean;
}

export function LogoMorph({
  brands = DEFAULT_BRANDS,
  color = "currentColor",
  every = 1800,
  bounce = 0.12,
  autoplay: play = true,
  height = 300,
  selected,
  controls = true,
}: LogoMorphProps) {
  // The scene it plays: each brand's name, then its logo and back to the name if it has one.
  const scene = useMemo(
    () =>
      brands.flatMap((b, i): { brand: number; form: Form }[] =>
        b.mark
          ? [
              { brand: i, form: "text" },
              { brand: i, form: "logo" },
              { brand: i, form: "text" },
            ]
          : [{ brand: i, form: "text" }],
      ),
    [brands],
  );
  const autoplay = useAutoplay(scene.length, { every, autoStart: play && !selected });
  const { setPlaying } = autoplay;
  useEffect(() => setPlaying(play && !selected), [play, selected, setPlaying]);

  const [own, setShown] = useState<{ brand: number; form: Form }>({ brand: 0, form: "text" });
  useEffect(() => setShown(scene[autoplay.step] ?? { brand: 0, form: "text" }), [autoplay.step, scene]);
  const shown = selected ?? own;
  const brand = brands[shown.brand]!;

  const path = useRef<SVGPathElement>(null);
  // The morph under way, and how far along it is (a spring from 0 to 1).
  const state = useRef<{ morph: Morph | null; t: ReturnType<typeof value>; stop: (() => void) | null } | null>(null);

  useEffect(() => {
    const t = value(1, { spring: { duration: 0.75, bounce }, precision: 0.0005 });
    state.current = { morph: null, t, stop: null };
    return () => state.current?.stop?.();
  }, [bounce]);

  // Every change morphs from the outline as it is now to the new shape.
  useEffect(() => {
    const s = state.current;
    const el = path.current;
    if (!s || !el) return;
    const target = fitted(brand, shown.form);
    const from = el.getAttribute("d");
    s.morph = createMorph(from || target, target, { pairing: "auto", padding: "collapse" });
    if (!from || prefersReducedMotion()) {
      el.setAttribute("d", s.morph.d(1));
      return;
    }
    s.t.set(0);
    s.t.to(1);
    s.stop?.();
    s.stop = frames((dt) => {
      const moving = s.t.step(dt);
      el.setAttribute("d", s.morph!.d(s.t.current));
      if (!moving) s.stop = null;
      return moving;
    });
  }, [brand, shown.form]);

  const chip =
    "rounded-full border border-zinc-200 px-3 py-1 text-[12.5px] text-zinc-600 transition-colors hover:border-zinc-300 hover:text-zinc-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-900 aria-pressed:border-transparent aria-pressed:bg-zinc-900 aria-pressed:text-white aria-selected:border-transparent aria-selected:bg-zinc-900 aria-selected:text-white disabled:opacity-40 dark:border-zinc-700 dark:text-zinc-300 dark:hover:border-zinc-500 dark:hover:text-white dark:focus-visible:outline-white dark:aria-pressed:bg-white dark:aria-pressed:text-zinc-900 dark:aria-selected:bg-white dark:aria-selected:text-zinc-900";
  const pad = 30;
  return (
    <div
      ref={autoplay.ref}
      style={{ "--lm-color": color } as CSSProperties}
      className="not-prose my-6 overflow-hidden rounded-2xl border border-zinc-200 bg-white font-sans text-zinc-900 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-100"
    >
      <div className="grid place-items-center px-6" style={{ height }}>
        <svg
          viewBox={`${-pad} ${-pad} ${BOX.width + pad * 2} ${BOX.height + pad * 2}`}
          className="h-full max-h-[78%] w-full"
          role="img"
          aria-label={shown.form === "logo" ? `${brand.name} logo` : brand.name}
        >
          <path ref={path} fill="var(--lm-color)" fillRule="nonzero" />
        </svg>
      </div>
      {controls && (
        <div className="flex flex-wrap items-center gap-2 border-t border-zinc-100 px-4 py-3 dark:border-zinc-800">
          <div role="tablist" aria-label="Brand" className="flex flex-wrap gap-1">
            {brands.map((b, i) => (
              <button
                key={b.name}
                type="button"
                role="tab"
                aria-selected={i === shown.brand}
                onClick={() => setShown({ brand: i, form: shown.form === "logo" && b.mark ? "logo" : "text" })}
                className={chip}
              >
                {b.name}
              </button>
            ))}
          </div>
          <span className="mx-1 h-4 w-px bg-zinc-200 dark:bg-zinc-700" aria-hidden="true" />
          <div role="group" aria-label="Show" className="flex gap-1">
            <button
              type="button"
              aria-pressed={shown.form === "text"}
              onClick={() => setShown({ ...shown, form: "text" })}
              className={chip}
            >
              Text
            </button>
            <button
              type="button"
              aria-pressed={shown.form === "logo"}
              disabled={!brand.mark}
              title={brand.mark ? undefined : `No ${brand.name} logo yet`}
              onClick={() => setShown({ ...shown, form: "logo" })}
              className={chip}
            >
              Logo
            </button>
          </div>
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
  );
}

/** The name the docs pages use. */
export const LogoMorphDemo = LogoMorph;
