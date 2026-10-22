import { describe, expect, it } from "vitest";
import { familyRelations, matchFamilyNames, peopleInFamilyEra, validateFamilyGraph } from "./index";

const family = {
  people: [
    { id: "elise", name: "Élise O'Rourke", aliases: ["Elise Durant"], born: 1858, died: 1931 },
    { id: "milo", name: "Milo Chen", born: 1854, died: 1916 },
    { id: "marie", name: "Marie O'Rourke", born: 1885, died: 1964 },
  ],
  unions: [{ id: "elise-milo", partners: ["elise", "milo"] as const, children: ["marie"] }],
} as const;

describe("family graph helpers", () => {
  it("materialises partnership and parent relationships from a union", () => {
    expect(familyRelations(family)).toEqual([
      { from: "elise", to: "milo", union: "elise-milo", kind: "partner" },
      { from: "elise", to: "marie", union: "elise-milo", kind: "parent" },
      { from: "milo", to: "marie", union: "elise-milo", kind: "parent" },
    ]);
  });

  it("matches diacritics and alternate names without making the UI own search state", () => {
    expect(matchFamilyNames(family, "elise o").map((person) => person.id)).toEqual(["elise"]);
    expect(matchFamilyNames(family, "dur").map((person) => person.id)).toEqual(["elise"]);
  });

  it("filters people whose lives overlap an inclusive era", () => {
    expect(peopleInFamilyEra(family, { from: 1917, to: 1930 }).map((person) => person.id)).toEqual(["elise", "marie"]);
  });

  it("rejects directed ancestry cycles while allowing partnership links", () => {
    const cyclic = {
      people: [
        { id: "a", name: "A" },
        { id: "b", name: "B" },
      ],
      unions: [
        { id: "first", partners: ["a", "b"] as const, children: ["b"] },
        { id: "second", partners: ["b", "a"] as const, children: ["a"] },
      ],
    };
    expect(() => validateFamilyGraph(cyclic)).toThrow(/cycle/);
  });
});
