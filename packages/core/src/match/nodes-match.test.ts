import { describe, expect, it } from "vitest";
import { assign, hungarian } from "./hungarian";
import { matchNodes } from "./nodes-match";
import { prepare, type MatchNode } from "./nodes";
import { baseSimilarity, colorSimilarity, contentSimilarity, kindSimilarity } from "./similarity";
import { bigramSimilarity, setOverlap, textSimilarity, tokenize } from "./text";

/** A node with sensible defaults; boxes in root widths. */
const node = (over: Partial<MatchNode> & Pick<MatchNode, "kind">): MatchNode => ({
  text: "",
  x: 0,
  y: 0,
  width: 0.1,
  height: 0.03,
  parent: -1,
  ...over,
});

describe("text", () => {
  it("tokenizes words and numbers in any script", () => {
    expect(tokenize("Fix login — ENG-412, café 3.5")).toEqual(["fix", "login", "eng", "412", "café", "3", "5"]);
  });
  it("measures word overlap", () => {
    expect(setOverlap(["a", "b"], ["b", "c"])).toEqual({ shared: 1, dice: 0.5, containment: 0.5 });
    expect(setOverlap([], ["a"]).dice).toBe(0);
  });
  it("measures character-pair overlap", () => {
    expect(bigramSimilarity("night", "night")).toBe(1);
    expect(bigramSimilarity("night", "nacht")).toBeCloseTo(0.25);
  });
  it("scores reordered words as the same text", () => {
    expect(textSimilarity("Fix login timeout", "Login timeout fix")).toBe(1);
  });
  it("scores a small edit highly and unrelated text low", () => {
    expect(textSimilarity("Update pricing page", "Update pricing page copy")).toBeGreaterThan(0.7);
    expect(textSimilarity("Update pricing page", "Ship dark mode")).toBeLessThan(0.2);
  });
  it("recognises a value that changed but kept its shape", () => {
    expect(textSimilarity("Showing 6 of 6", "Showing 3 of 6")).toBeGreaterThanOrEqual(0.55);
  });
  it("ignores case and spacing", () => {
    expect(textSimilarity("  Save   Changes ", "save changes")).toBe(1);
  });
});

describe("hungarian", () => {
  it("finds the cheapest total, not the cheapest first pick", () => {
    // Greedy takes row 0 → col 0 (cost 1), forcing row 1 → col 1 (cost 10): total 11.
    // The best total gives row 0 → col 1 (2) and row 1 → col 0 (2): total 4.
    expect(
      hungarian([
        [1, 2],
        [2, 10],
      ]),
    ).toEqual([1, 0]);
  });
  it("keeps the original order when pairs tie, so identical rows never swap", () => {
    expect(
      hungarian([
        [0, 0],
        [0, 0],
      ]),
    ).toEqual([0, 1]);
    expect(
      hungarian([
        [0, 0, 0],
        [0, 0, 0],
        [0, 0, 0],
      ]),
    ).toEqual([0, 1, 2]);
  });
  it("handles more columns than rows, and more rows than columns", () => {
    expect(hungarian([[5, 1, 9]])).toEqual([1]);
    expect(hungarian([[5], [1], [9]])).toEqual([-1, 0, -1]);
  });
  it("handles empty input and rejects ragged tables", () => {
    expect(hungarian([])).toEqual([]);
    expect(() => hungarian([[1, 2], [3]])).toThrow(RangeError);
  });
  it("assign maximises similarity and drops pairs below the threshold", () => {
    const pairs = assign(
      [
        [0.9, 0.1],
        [0.2, 0.3],
      ],
      0.5,
    );
    expect(pairs).toEqual([{ from: 0, to: 0, score: 0.9 }]);
  });
});

describe("prepare", () => {
  it("derives children and the content inside each container", () => {
    const [card, title] = prepare([node({ kind: "box" }), node({ kind: "text", text: "Camp Mug", parent: 0 })]);
    expect(card!.children).toEqual([1]);
    expect(card!.subtree).toEqual(["camp", "mug"]);
    expect(card!.hasContent).toBe(false);
    expect(title!.hasContent).toBe(true);
  });
  it("rejects a parent that comes after its child", () => {
    expect(() => prepare([node({ kind: "text", parent: 1 }), node({ kind: "box" })])).toThrow(RangeError);
  });
});

describe("similarity", () => {
  const [photo, other, heading, label] = prepare([
    node({ kind: "media", media: "a" }),
    node({ kind: "media", media: "b" }),
    node({ kind: "heading", text: "Camp Mug" }),
    node({ kind: "text", text: "Camp Mug" }),
  ]);
  it("gates kinds that never become each other", () => {
    expect(kindSimilarity("media", "heading")).toBe(0);
    expect(kindSimilarity("heading", "text")).toBeGreaterThan(0.5);
  });
  it("matches media by identity", () => {
    expect(contentSimilarity(photo!, photo!)).toBe(1);
    expect(contentSimilarity(photo!, other!)).toBeLessThan(0.2);
  });
  it("treats missing colours as neutral", () => {
    expect(colorSimilarity(undefined, undefined)).toBe(1);
    expect(colorSimilarity([0, 0, 0, 1], undefined)).toBe(0.5);
    expect(colorSimilarity([0, 0, 0, 1], [255, 255, 255, 1])).toBe(0);
  });
  it("scores the same text as a heading and as plain text well above a photo", () => {
    expect(baseSimilarity(heading!, label!)).toBeGreaterThan(0.7);
    expect(baseSimilarity(heading!, photo!)).toBeLessThan(0.2);
  });
});

describe("matchNodes", () => {
  it("pairs elements whose text was reworded and that moved", () => {
    const result = matchNodes(
      [node({ kind: "text", text: "Fix login timeout", y: 0.1 }), node({ kind: "text", text: "Ship dark mode", y: 0.2 })],
      [node({ kind: "text", text: "Ship dark mode", y: 0.1 }), node({ kind: "text", text: "Login timeout fix", y: 0.4 })],
    );
    expect(result.pairs.map((p) => [p.from, p.to])).toEqual([
      [0, 1],
      [1, 0],
    ]);
  });

  it("reports what was removed and what was added", () => {
    const result = matchNodes(
      [node({ kind: "text", text: "Keep me" }), node({ kind: "text", text: "Old banner" })],
      [node({ kind: "text", text: "Keep me" }), node({ kind: "media", media: "new-photo" })],
    );
    expect(result.removed).toEqual([1]);
    expect(result.added).toEqual([1]);
  });

  it("tells three identical buttons apart by the card they sit in", () => {
    // Three cards, each with a unique title and an identical "Get" button. On the new page the
    // cards are in a different order.
    const cards = (titles: string[]) =>
      titles.flatMap((t, i): MatchNode[] => [
        node({ kind: "box", x: 0.05, y: 0.1 + i * 0.2, width: 0.9, height: 0.15 }),
        node({ kind: "heading", text: t, x: 0.1, y: 0.12 + i * 0.2, width: 0.4, parent: i * 3 }),
        node({ kind: "control", text: "Get", x: 0.8, y: 0.15 + i * 0.2, width: 0.1, parent: i * 3 }),
      ]);
    const result = matchNodes(cards(["Notes", "Maps", "Music"]), cards(["Music", "Notes", "Maps"]));
    const to = new Map(result.pairs.map((p) => [p.from, p.to]));
    // Old Notes button (2) → new Notes card's button (5); Maps (5) → 8; Music (8) → 2.
    expect([to.get(2), to.get(5), to.get(8)]).toEqual([5, 8, 2]);
  });

  it("detects a split and a merge", () => {
    const result = matchNodes(
      [
        node({ kind: "text", text: "12 Rue de Rivoli, 75001 Paris", y: 0.1 }),
        node({ kind: "text", text: "Ada", y: 0.3 }),
        node({ kind: "text", text: "Lovelace", x: 0.3, y: 0.3 }),
      ],
      [
        node({ kind: "text", text: "12 Rue de Rivoli", y: 0.1 }),
        node({ kind: "text", text: "75001 Paris", y: 0.13 }),
        node({ kind: "text", text: "Ada Lovelace", y: 0.3 }),
      ],
    );
    expect(result.splits).toEqual([{ from: 0, to: [0, 1] }]);
    expect(result.merges).toEqual([{ from: [1, 2], to: 2 }]);
    expect(result.pairs).toEqual([]);
  });

  it("can turn structure and splits off", () => {
    const a = [node({ kind: "text", text: "12 Rue de Rivoli, 75001 Paris" })];
    const b = [node({ kind: "text", text: "12 Rue de Rivoli" }), node({ kind: "text", text: "75001 Paris" })];
    expect(matchNodes(a, b, { splits: false }).splits).toEqual([]);
    expect(() => matchNodes(a, b, { structure: false })).not.toThrow();
  });

  it("handles empty lists and rejects a bad threshold", () => {
    expect(matchNodes([], [node({ kind: "box" })]).added).toEqual([0]);
    expect(() => matchNodes([], [], { threshold: 2 })).toThrow(RangeError);
  });

  it("uses the bounded matcher when a snapshot exceeds its comparison budget", () => {
    const before = Array.from({ length: 5 }, (_, index) => node({ kind: "text", text: `Item ${index}`, y: index / 10 }));
    const after = Array.from({ length: 5 }, (_, index) => node({ kind: "text", text: `Item ${index}`, y: index / 10 }));

    const result = matchNodes(before, after, { maxPairComparisons: 0 });

    expect(result.pairs.map((pair) => [pair.from, pair.to])).toEqual([
      [0, 0],
      [1, 1],
      [2, 2],
      [3, 3],
      [4, 4],
    ]);
  });
});

describe("containers that carry the same contents", () => {
  it("pairs a small bar with the large sheet its contents moved into", () => {
    // Before: a list, and a mini player bar docked at the bottom with artwork, title, show and a button.
    const before: MatchNode[] = [
      node({ kind: "box", x: 0, y: 0, width: 1, height: 1 }), // 0 page
      node({ kind: "box", x: 0.02, y: 0.86, width: 0.96, height: 0.1, parent: 0, background: [9, 9, 11, 1] }), // 1 bar
      node({ kind: "media", media: "art.jpg", x: 0.04, y: 0.87, width: 0.1, height: 0.08, parent: 1 }), // 2
      node({ kind: "text", text: "Irma Boom, book designer", x: 0.16, y: 0.875, width: 0.5, height: 0.03, parent: 1 }), // 3
      node({ kind: "text", text: "My Life In Design", x: 0.16, y: 0.91, width: 0.4, height: 0.025, parent: 1 }), // 4
      node({ kind: "control", text: "Play", x: 0.86, y: 0.88, width: 0.08, height: 0.06, parent: 1 }), // 5
    ];
    // After: the same things inside a full-screen sheet, much larger and somewhere else.
    const after: MatchNode[] = [
      node({ kind: "box", x: 0, y: 0, width: 1, height: 1 }), // 0 page
      node({ kind: "box", x: 0, y: 0, width: 1, height: 1, parent: 0, background: [9, 9, 11, 1] }), // 1 sheet
      node({ kind: "media", media: "art.jpg", x: 0.1, y: 0.1, width: 0.8, height: 0.45, parent: 1 }), // 2
      node({ kind: "text", text: "My Life In Design", x: 0.06, y: 0.6, width: 0.5, height: 0.025, parent: 1 }), // 3
      node({ kind: "text", text: "Irma Boom, book designer", x: 0.06, y: 0.64, width: 0.8, height: 0.04, parent: 1 }), // 4
      node({ kind: "control", text: "Play", x: 0.42, y: 0.85, width: 0.16, height: 0.09, parent: 1 }), // 5
      node({ kind: "control", text: "Back 15 seconds", x: 0.2, y: 0.86, width: 0.1, height: 0.06, parent: 1 }), // 6
    ];
    const { pairs } = matchNodes(before, after);
    expect(pairs.find((p) => p.from === 1)?.to).toBe(1);
  });
});
