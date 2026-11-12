const WORDS = /[\p{L}\p{N}]+/gu;
const WHITESPACE = /\s+/g;
const DIGIT = /\d/;
const NUMBERS = /\d+([.,]\d+)*/g;
const CHARACTER_PAIR_SHIFT = 65536;

const STOPWORDS = new Set(
  "a an the to of and or in on for at by with is it be you your me my we our i this that from as".split(" "),
);

export interface Overlap {
  shared: number;
  dice: number;
  containment: number;
}

export interface TextFeatures {
  text: string;
  tokens: Set<string>;
  bigrams: Uint32Array;
  masked: { text: string; bigrams: Uint32Array } | null;
}

export function tokenize(text: string): string[] {
  return text.toLowerCase().match(WORDS) ?? [];
}

export function normalizeText(text: string): string {
  return text.replace(WHITESPACE, " ").trim().toLowerCase();
}

function meaningful(tokens: readonly string[]): string[] {
  const kept = tokens.filter((token) => !STOPWORDS.has(token));

  return kept.length > 0 ? kept : [...tokens];
}

const maskNumbers = (text: string) => text.replace(NUMBERS, "#");

export function overlap(setA: ReadonlySet<string>, setB: ReadonlySet<string>): Overlap {
  if (setA.size === 0 || setB.size === 0) return { shared: 0, dice: 0, containment: 0 };

  const [small, large] = setA.size <= setB.size ? [setA, setB] : [setB, setA];
  const shared = [...small].filter((token) => large.has(token)).length;

  return {
    shared,
    dice: (2 * shared) / (setA.size + setB.size),
    containment: shared / small.size,
  };
}

export function setOverlap(a: readonly string[], b: readonly string[]): Overlap {
  return overlap(new Set(a), new Set(b));
}

function bigrams(text: string): Uint32Array {
  const pairs = Uint32Array.from({ length: Math.max(0, text.length - 1) }, (_, index) =>
    text.charCodeAt(index) * CHARACTER_PAIR_SHIFT + text.charCodeAt(index + 1),
  );

  return pairs.sort();
}

function sharedSorted(keysA: Uint32Array, keysB: Uint32Array): number {
  let shared = 0;
  let indexA = 0;
  let indexB = 0;

  while (indexA < keysA.length && indexB < keysB.length) {
    const keyA = keysA[indexA]!;
    const keyB = keysB[indexB]!;

    if (keyA === keyB) {
      shared++;
      indexA++;
      indexB++;
    } else if (keyA < keyB) {
      indexA++;
    } else {
      indexB++;
    }
  }

  return shared;
}

function bigramDice(a: string, keysA: Uint32Array, b: string, keysB: Uint32Array): number {
  if (a.length < 2 || b.length < 2) return a === b ? 1 : 0;

  return (2 * sharedSorted(keysA, keysB)) / (a.length - 1 + (b.length - 1));
}

export function bigramSimilarity(a: string, b: string): number {
  return bigramDice(a, bigrams(a), b, bigrams(b));
}

export function textFeatures(text: string): TextFeatures {
  const normal = normalizeText(text);
  const masked = DIGIT.test(normal) ? maskNumbers(normal) : null;

  return {
    text: normal,
    tokens: new Set(meaningful(tokenize(normal))),
    bigrams: bigrams(normal),
    masked: masked === null ? null : { text: masked, bigrams: bigrams(masked) },
  };
}

function numbersChanged(a: TextFeatures, b: TextFeatures): number {
  if (!a.masked || !b.masked) return 0;

  if (a.masked.text === b.masked.text) return 0.55;

  return 0.45 * bigramDice(a.masked.text, a.masked.bigrams, b.masked.text, b.masked.bigrams);
}

export function compareText(a: TextFeatures, b: TextFeatures): number {
  if (a.text === b.text) return 1;

  if (a.text === "" || b.text === "") return 0;

  const { dice, containment } = overlap(a.tokens, b.tokens);
  const smaller = Math.min(a.tokens.size, b.tokens.size);
  const contained = containment * (smaller >= 2 ? 0.82 : 0.5);

  const longest = Math.max(a.text.length, b.text.length);
  const characters = 0.9 * bigramDice(a.text, a.bigrams, b.text, b.bigrams) * Math.min(1, 32 / longest);

  return Math.max(dice, contained, characters, numbersChanged(a, b));
}

export function textSimilarity(a: string, b: string): number {
  return compareText(textFeatures(a), textFeatures(b));
}
