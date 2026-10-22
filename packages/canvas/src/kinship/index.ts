/**
 * Headless family-graph helpers. They deliberately know nothing about Canvas or
 * React, so an application can use the same data for search, timelines, a tree
 * layout, or a document archive.
 */

export interface FamilyPerson {
  id: string;
  name: string;
  /** Maiden names, transcription variants, and other searchable forms. */
  aliases?: readonly string[];
  born?: number;
  died?: number;
}

export interface FamilyUnion {
  id: string;
  /** A marriage, partnership, or other parent relationship. */
  partners: readonly [string, string];
  children?: readonly string[];
}

export interface FamilyGraph {
  people: readonly FamilyPerson[];
  unions: readonly FamilyUnion[];
}

export interface FamilyRelation {
  from: string;
  to: string;
  union: string;
  kind: "parent" | "partner";
}

export interface FamilyEra {
  /** Inclusive year bounds. Missing bounds are open-ended. */
  from?: number;
  to?: number;
}

const normalize = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();

function peopleById(graph: FamilyGraph): Map<string, FamilyPerson> {
  const people = new Map<string, FamilyPerson>();
  for (const person of graph.people) {
    if (!person.id) throw new RangeError("family graph: every person needs an id");
    if (people.has(person.id)) throw new RangeError(`family graph: duplicate person "${person.id}"`);
    people.set(person.id, person);
  }
  return people;
}

/** Validate references and ensure only the directed parent graph is acyclic. */
export function validateFamilyGraph(graph: FamilyGraph): void {
  const people = peopleById(graph);
  const children = new Map<string, string[]>();
  for (const union of graph.unions) {
    const [first, second] = union.partners;
    if (!union.id) throw new RangeError("family graph: every union needs an id");
    if (!people.has(first) || !people.has(second)) throw new RangeError(`family graph: union "${union.id}" names an unknown partner`);
    if (first === second) throw new RangeError(`family graph: union "${union.id}" cannot name the same partner twice`);
    for (const child of union.children ?? []) {
      if (!people.has(child)) throw new RangeError(`family graph: union "${union.id}" names an unknown child`);
      for (const parent of union.partners) {
        const descendants = children.get(parent) ?? [];
        descendants.push(child);
        children.set(parent, descendants);
      }
    }
  }

  const visiting = new Set<string>();
  const visited = new Set<string>();
  const visit = (person: string): void => {
    if (visiting.has(person)) throw new RangeError(`family graph: ancestry contains a cycle at "${person}"`);
    if (visited.has(person)) return;
    visiting.add(person);
    for (const child of children.get(person) ?? []) visit(child);
    visiting.delete(person);
    visited.add(person);
  };
  for (const person of people.keys()) visit(person);
}

/** Materialise partnership and parent-child relations without choosing a visual layout. */
export function familyRelations(graph: FamilyGraph): FamilyRelation[] {
  validateFamilyGraph(graph);
  const relations: FamilyRelation[] = [];
  for (const union of graph.unions) {
    const [first, second] = union.partners;
    relations.push({ from: first, to: second, union: union.id, kind: "partner" });
    for (const child of union.children ?? []) {
      relations.push({ from: first, to: child, union: union.id, kind: "parent" });
      relations.push({ from: second, to: child, union: union.id, kind: "parent" });
    }
  }
  return relations;
}

/** Accent-insensitive, token-prefix matching across recorded and alternate names. */
export function matchFamilyNames(graph: FamilyGraph, query: string): FamilyPerson[] {
  validateFamilyGraph(graph);
  const tokens = normalize(query).split(" ").filter(Boolean);
  if (tokens.length === 0) return [...graph.people];
  return graph.people.filter((person) => {
    const names = [person.name, ...(person.aliases ?? [])].flatMap((name) => normalize(name).split(" ").filter(Boolean));
    return tokens.every((token) => names.some((name) => name.startsWith(token)));
  });
}

/** People whose recorded lifetime overlaps an inclusive era. */
export function peopleInFamilyEra(graph: FamilyGraph, era: FamilyEra): FamilyPerson[] {
  validateFamilyGraph(graph);
  const from = era.from ?? Number.NEGATIVE_INFINITY;
  const to = era.to ?? Number.POSITIVE_INFINITY;
  if (from > to) throw new RangeError("family graph: an era's start must not be after its end");
  return graph.people.filter(
    (person) => (person.died ?? Number.POSITIVE_INFINITY) >= from && (person.born ?? Number.NEGATIVE_INFINITY) <= to,
  );
}
