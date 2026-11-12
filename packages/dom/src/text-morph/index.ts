import { springs, value, type AnimatedValue, type SpringConfig } from "@remold-ui/core";
import { resolveReducedMotion, type ReducedMotion } from "../accessibility";
import { morphedText } from "../snapshot";
import { frames, type FrameLoop } from "../frames";
import { containerScale } from "../transition";

export interface MorphTextOptions {
  /** Default `springs.snappy`. */
  spring?: SpringConfig;
  reducedMotion?: ReducedMotion;
  /** The largest text change to animate character by character. */
  maxGraphemes?: number;
  loop?: FrameLoop;
}

const DEFAULT_MAX_GRAPHEMES = 120;

/** Split text into user-perceived characters, keeping emoji and accents intact. */
export function graphemes(text: string): string[] {
  if (typeof Intl !== "undefined" && "Segmenter" in Intl) {
    return [...new Intl.Segmenter(undefined, { granularity: "grapheme" }).segment(text)].map((s) => s.segment);
  }
  return Array.from(text);
}

/** Which letters of `a` and `b` are the same letter. */
export function sharedLetters(previousText: readonly string[], nextText: readonly string[]): [number, number][] {
  const previousLength = previousText.length;
  const nextLength = nextText.length;
  const lengths = Array.from({ length: previousLength + 1 }, () => new Uint16Array(nextLength + 1));

  for (let previousIndex = previousLength - 1; previousIndex >= 0; previousIndex--) {
    for (let nextIndex = nextLength - 1; nextIndex >= 0; nextIndex--) {
      lengths[previousIndex]![nextIndex] =
        previousText[previousIndex] === nextText[nextIndex]
          ? lengths[previousIndex + 1]![nextIndex + 1]! + 1
          : Math.max(lengths[previousIndex + 1]![nextIndex]!, lengths[previousIndex]![nextIndex + 1]!);
    }
  }

  const candidatePairs: [number, number][] = [];
  let previousIndex = 0;
  let nextIndex = 0;

  while (previousIndex < previousLength && nextIndex < nextLength) {
    if (previousText[previousIndex] === nextText[nextIndex]) {
      candidatePairs.push([previousIndex, nextIndex]);
      previousIndex++;
      nextIndex++;
    } else if (lengths[previousIndex + 1]![nextIndex]! >= lengths[previousIndex]![nextIndex + 1]!) {
      previousIndex++;
    } else {
      nextIndex++;
    }
  }

  const sharedPairs: [number, number][] = [];
  let consecutivePairs: [number, number][] = [];
  const keepConsecutivePairs = () => {
    if (consecutivePairs.length >= 2) sharedPairs.push(...consecutivePairs);
    consecutivePairs = [];
  };

  for (const pair of candidatePairs) {
    const previousPair = consecutivePairs.at(-1);

    if (previousPair && pair[0] === previousPair[0] + 1 && pair[1] === previousPair[1] + 1) consecutivePairs.push(pair);
    else {
      keepConsecutivePairs();
      consecutivePairs = [pair];
    }
  }
  keepConsecutivePairs();

  return sharedPairs;
}

interface LetterMotion {
  x?: AnimatedValue;
  y?: AnimatedValue;
  opacity?: AnimatedValue;
}

interface LetterSnapshot {
  x: number;
  y: number;
  text: string;
  motion?: LetterMotion;
}

interface TextMorphState {
  text: string[];
  letterElements: (HTMLSpanElement | null)[];
  screenReaderText: HTMLSpanElement;
  visualLayer: HTMLSpanElement;
  liveLetters: HTMLSpanElement;
  exitingLetters: HTMLSpanElement;
  motion: Map<HTMLSpanElement, LetterMotion>;
  token: number;
}

const states = new WeakMap<HTMLElement, TextMorphState>();
const sharedLoop: FrameLoop = { add: frames };

const SCREEN_READER_ONLY = {
  position: "absolute",
  width: "1px",
  height: "1px",
  margin: "-1px",
  overflow: "hidden",
  clip: "rect(0 0 0 0)",
  whiteSpace: "nowrap",
};

function screenReaderSpan(): HTMLSpanElement {
  const span = document.createElement("span");

  Object.assign(span.style, SCREEN_READER_ONLY);

  return span;
}

function visualLayers() {
  const visualLayer = document.createElement("span");
  const liveLetters = document.createElement("span");
  const exitingLetters = document.createElement("span");

  visualLayer.setAttribute("aria-hidden", "true");
  visualLayer.style.position = "relative";
  visualLayer.append(liveLetters, exitingLetters);

  return { visualLayer, liveLetters, exitingLetters };
}

function createTextMorphState(element: HTMLElement, maxGraphemes: number): TextMorphState {
  const initial = element.textContent ?? "";
  const screenReaderText = screenReaderSpan();
  const layers = visualLayers();

  element.replaceChildren(screenReaderText, layers.visualLayer);

  const state: TextMorphState = { text: [], letterElements: [], screenReaderText, ...layers, motion: new Map(), token: 0 };
  const initialText = graphemes(initial);

  if (initialText.length > maxGraphemes) renderPlainText(state, initialText);
  else renderLetters(state, initialText);

  screenReaderText.textContent = initial;
  states.set(element, state);
  morphedText.set(element, screenReaderText);

  return state;
}

function renderLetters(state: TextMorphState, text: string[]): void {
  state.liveLetters.replaceChildren();
  state.letterElements = [];
  let word: HTMLSpanElement | null = null;

  for (const ch of text) {
    if (/^\s$/.test(ch)) {
      state.liveLetters.append(document.createTextNode(ch));
      state.letterElements.push(null);
      word = null;
      continue;
    }
    if (!word) {
      word = document.createElement("span");
      word.style.display = "inline-block";
      word.style.whiteSpace = "nowrap";
      state.liveLetters.append(word);
    }
    const letter = document.createElement("span");

    letter.style.display = "inline-block";
    letter.textContent = ch;
    word.append(letter);
    state.letterElements.push(letter);
  }
  state.text = text;
}

function renderPlainText(state: TextMorphState, text: string[]): void {
  state.liveLetters.replaceChildren(document.createTextNode(text.join("")));
  state.letterElements = [];
  state.text = text;
}

function getElementPosition(element: Element): { x: number; y: number } {
  const bounds = element.getBoundingClientRect();

  return { x: bounds.left, y: bounds.top };
}

function applyMotionStyles(motions: ReadonlyMap<HTMLSpanElement, LetterMotion>): void {
  for (const [element, letterMotion] of motions) {
    const x = letterMotion.x?.current ?? 0;
    const y = letterMotion.y?.current ?? 0;

    element.style.translate = x === 0 && y === 0 ? "" : `${x.toFixed(2)}px ${y.toFixed(2)}px`;
    if (letterMotion.opacity) element.style.opacity = Math.min(1, Math.max(0, letterMotion.opacity.current)).toFixed(3);
  }
}

function stepMotions(motions: ReadonlyMap<HTMLSpanElement, LetterMotion>, deltaTime: number): boolean {
  let isMoving = false;
  for (const letterMotion of motions.values()) {
    for (const valueToStep of [letterMotion.x, letterMotion.y, letterMotion.opacity]) {
      if (valueToStep?.step(deltaTime)) isMoving = true;
    }
  }
  return isMoving;
}

/** Change `element`'s text, animating the letters. */
export function morphText(element: HTMLElement, text: string, options: MorphTextOptions = {}): Promise<void> {
  const maxGraphemes = Math.max(0, options.maxGraphemes ?? DEFAULT_MAX_GRAPHEMES);
  const state = states.get(element) ?? createTextMorphState(element, maxGraphemes);
  const nextText = graphemes(text);

  if (Math.max(state.text.length, nextText.length) > maxGraphemes) {
    ++state.token;
    state.screenReaderText.textContent = text;
    state.exitingLetters.replaceChildren();
    state.motion = new Map();
    renderPlainText(state, nextText);
    return Promise.resolve();
  }

  const spring = options.spring ?? springs.snappy;
  const fadeOut: SpringConfig = { duration: 0.16, bounce: 0 };
  const fadeIn: SpringConfig = { duration: 0.36, bounce: 0 };
  const loop = options.loop ?? sharedLoop;
  const reduced = resolveReducedMotion(options.reducedMotion);

  const previousLetters: (LetterSnapshot | null)[] = state.letterElements.map((letterElement) =>
    letterElement
      ? {
          ...getElementPosition(letterElement),
          text: letterElement.textContent ?? "",
          motion: state.motion.get(letterElement),
        }
      : null,
  );
  const matchedLetters = reduced
    ? []
    : sharedLetters(state.text, nextText).filter(([previousIndex, nextIndex]) => previousLetters[previousIndex] && nextText[nextIndex]!.trim() !== "");

  state.screenReaderText.textContent = text;
  state.exitingLetters.replaceChildren();
  renderLetters(state, nextText);
  const token = ++state.token;
  const motions = new Map<HTMLSpanElement, LetterMotion>();
  state.motion = motions;

  const scale = containerScale(element);
  const matchedNextIndexes = new Set(matchedLetters.map(([, nextIndex]) => nextIndex));
  const matchedPreviousIndexes = new Set(matchedLetters.map(([previousIndex]) => previousIndex));

  for (const [previousIndex, nextIndex] of matchedLetters) {
    const previousLetter = previousLetters[previousIndex]!;
    const nextLetterElement = state.letterElements[nextIndex]!;
    const nextPosition = getElementPosition(nextLetterElement);
    const x = value((previousLetter.x - nextPosition.x) / scale, { spring, precision: 0.1 });
    const y = value((previousLetter.y - nextPosition.y) / scale, { spring, precision: 0.1 });
    x.to(0, { velocity: previousLetter.motion?.x?.velocity ?? 0 });
    y.to(0, { velocity: previousLetter.motion?.y?.velocity ?? 0 });
    motions.set(nextLetterElement, { x, y });
  }
  state.letterElements.forEach((letterElement, index) => {
    if (!letterElement || matchedNextIndexes.has(index)) return;
    const opacity = value(-0.45, { spring: fadeIn, precision: 0.004 });
    opacity.to(1);
    const letterMotion: LetterMotion = { opacity };
    if (!reduced) {
      letterMotion.y = value(7, { spring, precision: 0.1 });
      letterMotion.y.to(0);
    }
    motions.set(letterElement, letterMotion);
  });
  const visualBounds = state.visualLayer.getBoundingClientRect();
  previousLetters.forEach((previousLetter, index) => {
    if (!previousLetter || matchedPreviousIndexes.has(index)) return;
    const ghost = document.createElement("span");
    ghost.textContent = previousLetter.text;
    Object.assign(ghost.style, {
      position: "absolute",
      left: `${(previousLetter.x - visualBounds.left) / scale}px`,
      top: `${(previousLetter.y - visualBounds.top) / scale}px`,
      pointerEvents: "none",
    });
    state.exitingLetters.append(ghost);
    const opacity = value(Math.max(0, previousLetter.motion?.opacity?.current ?? 1), {
      spring: fadeOut,
      precision: 0.004,
    });
    opacity.to(0);
    const letterMotion: LetterMotion = { opacity };
    if (!reduced) {
      letterMotion.y = value(0, { spring, precision: 0.1 });
      letterMotion.y.to(-7);
    }
    motions.set(ghost, letterMotion);
  });

  applyMotionStyles(motions);

  return new Promise((resolve) => {
    loop.add((deltaTime) => {
      if (token !== state.token) {
        resolve();
        return false;
      }
      const isMoving = stepMotions(motions, deltaTime);
      applyMotionStyles(motions);
      if (!isMoving) {
        state.exitingLetters.replaceChildren();
        for (const letterElement of state.letterElements) {
          if (!letterElement) continue;
          letterElement.style.translate = "";
          letterElement.style.opacity = "";
        }
        state.motion = new Map();
        resolve();
      }
      return isMoving;
    });
  });
}
