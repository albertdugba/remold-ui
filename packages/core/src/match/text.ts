/**
 * Text similarity: how likely two pieces of visible text are the same element's text,
 * allowing for rewording, reordering, small edits and changed numbers.
 */

/** Words and numbers, lower-cased. Works for any script (letters and digits in Unicode). */
export function tokenize(text: string): string[] {
  return text.toLowerCase().match(/[\p{L}\p{N}]+/gu) ?? [];
}

/** Collapse whitespace and lower-case, so formatting differences don't count as changes. */
export function normalizeText(text: string): string {
  return text.replace(/\s+/g, " ").trim().toLowerCase();
}

/** Words too common to say anything about identity. */
const STOPWORDS = new Set([
  "a",
  "an",
  "the",
  "to",
  "of",
  "and",
  "or",
  "in",
  "on",
  "for",
  "at",
  "by",
  "with",
  "is",
  "it",
  "be",
  "you",
  "your",
  "me",
  "my",
  "we",
  "our",
  "i",
  "this",
  "that",
  "from",
  "as",
]);

/** Tokens without stopwords, unless that would leave nothing ("To do" is still "to do"). */
function meaningful(tokens: readonly string[]): string[] {
  const kept = tokens.filter((t) => !STOPWORDS.has(t));

  return kept.length > 0 ? kept : [...tokens];
}

/** Overlap between two sets: shared, shared ÷ average size, and shared ÷ the smaller size. */
export function overlap(setA: ReadonlySet<string>, setB: ReadonlySet<string>): { shared: number; dice: number; containment: number } {
  if (setA.size === 0 || setB.size === 0) return { shared: 0, dice: 0, containment: 0 };

  const [small, large] = setA.size <= setB.size ? [setA, setB] : [setB, setA];
  let shared = 0;

  for (const t of small) if (large.has(t)) shared++;

  return {
    shared,
    dice: (2 * shared) / (setA.size + setB.size),
    containment: shared / Math.min(setA.size, setB.size),
  };
}

/**
 * Overlap between two token lists: `dice` is shared ÷ average size, `containment` is shared ÷
 * the smaller size (1 when one is entirely inside the other).
 */
export function setOverlap(a: readonly string[], b: readonly string[]): { shared: number; dice: number; containment: number } {
  return overlap(new Set(a), new Set(b));
}

/**
 * Every pair of neighbouring characters, as one number from their two UTF-16 codes, sorted. Two
 * sorted lists can be compared in a single walk, with no hashing.
 */
function bigrams(s: string): Uint32Array {
  const keys = new Uint32Array(Math.max(0, s.length - 1));

  for (let i = 0; i < keys.length; i++) keys[i] = s.charCodeAt(i) * 65536 + s.charCodeAt(i + 1);

  return keys.sort();
}

/** Dice over character pairs. A pair counts as many times as both texts have it. */
function bigramDice({ a, keysA, b, keysB }: { a: string; keysA: Uint32Array; b: string; keysB: Uint32Array }): number {
  if (a.length < 2 || b.length < 2) return a === b ? 1 : 0;

  let shared = 0;
  let i = 0;
  let j = 0;

  while (i < keysA.length && j < keysB.length) {
    const x = keysA[i]!;
    const y = keysB[j]!;

    if (x === y) {
      shared++;
      i++;
      j++;
    } else if (x < y) i++;
    else j++;
  }
  return (2 * shared) / (a.length - 1 + (b.length - 1));
}

/** Dice coefficient over character pairs: catches typos and small edits in short strings. */
export function bigramSimilarity(a: string, b: string): number {
  return bigramDice({ a, keysA: bigrams(a), b, keysB: bigrams(b) });
}

const DIGIT = /\d/;
/** Replace every number with "#", so "Showing 6 of 6" and "Showing 3 of 6" look alike. */
const maskNumbers = (s: string) => s.replace(/\d+([.,]\d+)*/g, "#");

/**
 * Everything `compareText` needs about one text, worked out once. The matcher compares every old
 * element with every new one, so doing this per text instead of per pair is most of its speed.
 */
export interface TextFeatures {
  /** Normalised text. */
  text: string;
  /** Meaningful tokens. */
  tokens: Set<string>;
  bigrams: Uint32Array;
  /** The text with numbers masked, and its character pairs; only when it has a digit. */
  masked: { text: string; bigrams: Uint32Array } | null;
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

/** `textSimilarity` on precomputed features. */
export function compareText(a: TextFeatures, b: TextFeatures): number {
  const na = a.text;
  const nb = b.text;

  if (na === nb) return 1;

  if (na === "" || nb === "") return 0;

  const { dice, containment } = overlap(a.tokens, b.tokens);
  const smaller = Math.min(a.tokens.size, b.tokens.size);
  // One word inside a sentence is weak evidence; two or more is strong.
  const contained = containment * (smaller >= 2 ? 0.82 : 0.5);
  // On long texts character pairs mostly measure "both are English", so they fade with length.
  const length = Math.max(na.length, nb.length);
  const characters = 0.9 * bigramDice({ a: na, keysA: a.bigrams, b: nb, keysB: b.bigrams }) * Math.min(1, 32 / length);
  let score = Math.max(dice, contained, characters);

  if (a.masked && b.masked) {
    const ma = a.masked;
    const mb = b.masked;

    score = Math.max(
      score,
      ma.text === mb.text ? 0.55 : 0.45 * bigramDice({ a: ma.text, keysA: ma.bigrams, b: mb.text, keysB: mb.bigrams }),
    );
  }
  return score;
}

/**
 * Similarity of two texts, from 0 (unrelated) to 1 (identical after normalising).
 *
 * The best of several signals: shared words (in any order), one text containing the other,
 * shared character pairs (for short strings with small edits), and the same shape with
 * different numbers (a value that updated).
 */
export function textSimilarity(a: string, b: string): number {
  return compareText(textFeatures(a), textFeatures(b));
}
