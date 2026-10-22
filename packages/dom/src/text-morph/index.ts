/**
 * Text morph: change an element's text so that letters the old and new text share slide to
 * their new places, while the rest fade out or in. "Saving…" → "Saved" keeps "Sav".
 *
 * The element gets two children: the plain text for screen readers, and an `aria-hidden`
 * layer of letters for the eye. Letters are inline blocks so they can move; that disables
 * kerning and ligatures across letters, which is invisible for most UI text.
 */
import { springs, value, type AnimatedValue, type SpringConfig } from "@remold-ui/core";
import { resolveReducedMotion, type ReducedMotion } from "../accessibility";
import { morphedText } from "../snapshot";
import { frames, type FrameLoop } from "../frames";
import { containerScale } from "../transition";

export interface MorphTextOptions {
  /** Default `springs.snappy`. */
  spring?: SpringConfig;
  reducedMotion?: ReducedMotion;
  loop?: FrameLoop;
}

/** Split text into what a reader sees as single characters (emoji and accents stay whole). */
export function graphemes(text: string): string[] {
  if (typeof Intl !== "undefined" && "Segmenter" in Intl) {
    return [...new Intl.Segmenter(undefined, { granularity: "grapheme" }).segment(text)].map((s) => s.segment);
  }
  return Array.from(text);
}

/**
 * Which letters of `a` and `b` are the same letter: the longest common subsequence, keeping
 * only runs of two or more in a row, so a stray shared "e" doesn't fly across the word.
 * Returns [index in a, index in b] pairs.
 */
export function sharedLetters(a: readonly string[], b: readonly string[]): [number, number][] {
  const n = a.length;
  const m = b.length;
  const table = Array.from({ length: n + 1 }, () => new Uint16Array(m + 1));
  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      table[i]![j] = a[i] === b[j] ? table[i + 1]![j + 1]! + 1 : Math.max(table[i + 1]![j]!, table[i]![j + 1]!);
    }
  }
  const pairs: [number, number][] = [];
  let i = 0;
  let j = 0;
  while (i < n && j < m) {
    if (a[i] === b[j]) {
      pairs.push([i, j]);
      i++;
      j++;
    } else if (table[i + 1]![j]! >= table[i]![j + 1]!) {
      i++;
    } else {
      j++;
    }
  }
  const out: [number, number][] = [];
  let run: [number, number][] = [];
  const flush = () => {
    if (run.length >= 2) out.push(...run);
    run = [];
  };
  for (const p of pairs) {
    const last = run[run.length - 1];
    if (last && p[0] === last[0] + 1 && p[1] === last[1] + 1) run.push(p);
    else {
      flush();
      run = [p];
    }
  }
  flush();
  return out;
}

interface LetterMotion {
  x?: AnimatedValue;
  y?: AnimatedValue;
  opacity?: AnimatedValue;
}

interface State {
  text: string[];
  letters: (HTMLSpanElement | null)[];
  reader: HTMLSpanElement;
  visual: HTMLSpanElement;
  live: HTMLSpanElement;
  ghosts: HTMLSpanElement;
  motion: Map<HTMLSpanElement, LetterMotion>;
  token: number;
}

const states = new WeakMap<HTMLElement, State>();
const sharedLoop: FrameLoop = { add: frames };

function setUp(element: HTMLElement): State {
  const initial = element.textContent ?? "";
  const reader = document.createElement("span");
  Object.assign(reader.style, {
    position: "absolute",
    width: "1px",
    height: "1px",
    margin: "-1px",
    overflow: "hidden",
    clip: "rect(0 0 0 0)",
    whiteSpace: "nowrap",
  });
  const visual = document.createElement("span");
  visual.setAttribute("aria-hidden", "true");
  visual.style.position = "relative";
  const live = document.createElement("span");
  const ghosts = document.createElement("span");
  visual.append(live, ghosts);
  element.replaceChildren(reader, visual);
  const state: State = {
    text: [],
    letters: [],
    reader,
    visual,
    live,
    ghosts,
    motion: new Map(),
    token: 0,
  };
  build(state, graphemes(initial));
  reader.textContent = initial;
  states.set(element, state);
  morphedText.set(element, reader);
  return state;
}

/** Lay the letters out, grouped into words so lines only break between words. */
function build(state: State, text: string[]): void {
  state.live.replaceChildren();
  state.letters = [];
  let word: HTMLSpanElement | null = null;
  for (const ch of text) {
    if (/^\s$/.test(ch)) {
      state.live.append(document.createTextNode(ch));
      state.letters.push(null);
      word = null;
      continue;
    }
    if (!word) {
      word = document.createElement("span");
      word.style.display = "inline-block";
      word.style.whiteSpace = "nowrap";
      state.live.append(word);
    }
    const letter = document.createElement("span");
    letter.style.display = "inline-block";
    letter.textContent = ch;
    word.append(letter);
    state.letters.push(letter);
  }
  state.text = text;
}

const position = (el: Element) => {
  const r = el.getBoundingClientRect();
  return { x: r.left, y: r.top };
};

/**
 * Change `element`'s text, animating the letters. Safe to call again mid-animation: letters
 * that are moving keep their speed. Resolves when everything has settled.
 */
export function morphText(element: HTMLElement, text: string, options: MorphTextOptions = {}): Promise<void> {
  const state = states.get(element) ?? setUp(element);
  const spring = options.spring ?? springs.snappy;
  const fadeOut: SpringConfig = { duration: 0.16, bounce: 0 };
  const fadeIn: SpringConfig = { duration: 0.36, bounce: 0 };
  const loop = options.loop ?? sharedLoop;
  const reduced = resolveReducedMotion(options.reducedMotion);

  const next = graphemes(text);
  const before = state.letters.map((l) =>
    l
      ? {
          ...position(l),
          letter: l.textContent ?? "",
          motion: state.motion.get(l),
        }
      : null,
  );
  const kept = reduced ? [] : sharedLetters(state.text, next).filter(([i, j]) => before[i] && next[j]!.trim() !== "");

  state.reader.textContent = text;
  state.ghosts.replaceChildren();
  build(state, next);
  const token = ++state.token;
  const motion = new Map<HTMLSpanElement, LetterMotion>();
  state.motion = motion;

  const zoom = containerScale(element);
  const keptNew = new Set(kept.map(([, j]) => j));
  const keptOld = new Set(kept.map(([i]) => i));
  for (const [i, j] of kept) {
    const was = before[i]!;
    const letter = state.letters[j]!;
    const now = position(letter);
    const x = value((was.x - now.x) / zoom, { spring, precision: 0.1 });
    const y = value((was.y - now.y) / zoom, { spring, precision: 0.1 });
    x.to(0, { velocity: was.motion?.x?.velocity ?? 0 });
    y.to(0, { velocity: was.motion?.y?.velocity ?? 0 });
    motion.set(letter, { x, y });
  }
  state.letters.forEach((letter, j) => {
    if (!letter || keptNew.has(j)) return;
    const opacity = value(-0.45, { spring: fadeIn, precision: 0.004 });
    opacity.to(1);
    const m: LetterMotion = { opacity };
    if (!reduced) {
      m.y = value(7, { spring, precision: 0.1 });
      m.y.to(0);
    }
    motion.set(letter, m);
  });
  const origin = state.visual.getBoundingClientRect();
  before.forEach((was, i) => {
    if (!was || keptOld.has(i)) return;
    const ghost = document.createElement("span");
    ghost.textContent = was.letter;
    Object.assign(ghost.style, {
      position: "absolute",
      left: `${(was.x - origin.left) / zoom}px`,
      top: `${(was.y - origin.top) / zoom}px`,
      pointerEvents: "none",
    });
    state.ghosts.append(ghost);
    const opacity = value(Math.max(0, was.motion?.opacity?.current ?? 1), {
      spring: fadeOut,
      precision: 0.004,
    });
    opacity.to(0);
    const m: LetterMotion = { opacity };
    if (!reduced) {
      m.y = value(0, { spring, precision: 0.1 });
      m.y.to(-7);
    }
    motion.set(ghost, m);
  });

  const paint = () => {
    for (const [el, m] of motion) {
      const x = m.x?.current ?? 0;
      const y = m.y?.current ?? 0;
      el.style.translate = x === 0 && y === 0 ? "" : `${x.toFixed(2)}px ${y.toFixed(2)}px`;
      if (m.opacity) el.style.opacity = Math.min(1, Math.max(0, m.opacity.current)).toFixed(3);
    }
  };
  paint();

  return new Promise((resolve) => {
    loop.add((dt) => {
      if (token !== state.token) {
        resolve();
        return false;
      }
      let moving = false;
      for (const m of motion.values()) for (const v of [m.x, m.y, m.opacity]) if (v?.step(dt)) moving = true;
      paint();
      if (!moving) {
        state.ghosts.replaceChildren();
        for (const letter of state.letters) {
          if (!letter) continue;
          letter.style.translate = "";
          letter.style.opacity = "";
        }
        state.motion = new Map();
        resolve();
      }
      return moving;
    });
  });
}
